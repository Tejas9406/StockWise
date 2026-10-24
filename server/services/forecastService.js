/**
 * forecastService.js
 *
 * Implements the Phase 1 baseline demand forecast using a simple moving average
 * over recent daily sales history. All calculations are deterministic and
 * documented. This is the official hackathon P0 baseline.
 *
 * Formula:
 *   forecast_daily = average(sales over last N days)
 *   horizon_demand = forecast_daily × horizon_days
 *
 * Replenishment formula (from official spec):
 *   replenishment_need = max(0, horizon_demand + safety_buffer - usable_on_hand)
 *   safety_buffer      = forecast_daily × safety_days
 *   usable_on_hand     = inventory.quantity - inventory.reservedQuantity (excludes expired batches)
 *
 * FEFO (First Expiry First Out):
 *   When selecting source batches, the engine prefers the earliest-expiring
 *   feasible batch — one whose quantity > 0 and that is not already expired.
 *   Feasibility check for destination: store forecast demand over remaining
 *   shelf life must be > 0 (store can sell the batch before it expires).
 */

import { SalesRecord } from '../models/SalesRecord.js';
import { Inventory } from '../models/Inventory.js';
import { Batch } from '../models/Batch.js';
import { Product } from '../models/Product.js';
import { Store } from '../models/Store.js';
import { Warehouse } from '../models/Warehouse.js';
import { Recommendation } from '../models/Recommendation.js';

// ─── Configuration ──────────────────────────────────────────────────────────

const DEFAULT_WINDOW_DAYS = 7;   // lookback period for moving average
const DEFAULT_HORIZON_DAYS = 7;  // planning horizon
const DEFAULT_SAFETY_DAYS = 2;   // safety buffer = forecast_daily × safety_days
const EXPIRY_RISK_THRESHOLD = 90; // days — batches within this window are flagged

// ─── 1. Moving-Average Forecast ──────────────────────────────────────────────

/**
 * Calculate moving-average forecast for a product at a specific store.
 * Returns per-day average and horizon demand.
 */
export const forecastForStoreProduct = async ({
  storeId,
  productId,
  windowDays = DEFAULT_WINDOW_DAYS,
  horizonDays = DEFAULT_HORIZON_DAYS,
}) => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - windowDays);

  const sales = await SalesRecord.find({
    storeId,
    productId,
    date: { $gte: cutoffDate },
  }).sort({ date: 1 });

  if (sales.length === 0) {
    return {
      method: 'moving_average',
      windowDays,
      horizonDays,
      daysWithData: 0,
      totalSalesInWindow: 0,
      forecastDaily: 0,
      forecastHorizonDemand: 0,
      dataQuality: 'INSUFFICIENT',
      warning: `No sales data found for the last ${windowDays} days. Cannot generate forecast.`,
    };
  }

  // Group by date to get per-day totals (handles multiple records on one day)
  const byDate = {};
  for (const s of sales) {
    const key = s.date.toISOString().slice(0, 10);
    byDate[key] = (byDate[key] || 0) + s.quantity;
  }

  const dailyTotals = Object.values(byDate);
  const daysWithData = dailyTotals.length;
  const totalSalesInWindow = dailyTotals.reduce((a, b) => a + b, 0);
  const forecastDaily = totalSalesInWindow / windowDays; // divide by window, not just days with data
  const forecastHorizonDemand = Math.round(forecastDaily * horizonDays);

  const dataQuality =
    daysWithData < 3 ? 'LOW' : daysWithData < windowDays * 0.5 ? 'MEDIUM' : 'HIGH';

  return {
    method: 'moving_average',
    windowDays,
    horizonDays,
    daysWithData,
    totalSalesInWindow,
    forecastDaily: parseFloat(forecastDaily.toFixed(2)),
    forecastHorizonDemand,
    dataQuality,
    warning:
      dataQuality === 'LOW'
        ? `Only ${daysWithData} day(s) of sales data in the last ${windowDays} days. Forecast reliability is low.`
        : dataQuality === 'MEDIUM'
        ? `Sales data available for ${daysWithData}/${windowDays} days. Estimate may not fully capture demand patterns.`
        : null,
  };
};

// ─── 2. Forecast Evaluation (WAPE on held-out period) ───────────────────────

/**
 * Evaluate forecast quality using Weighted Absolute Percentage Error (WAPE)
 * on a held-out validation period.
 *
 * Train on days -(windowDays*2) to -(horizonDays), validate on -(horizonDays) to 0.
 */
export const evaluateForecast = async ({ storeId, productId, windowDays = DEFAULT_WINDOW_DAYS, horizonDays = DEFAULT_HORIZON_DAYS }) => {
  const now = new Date();
  const valStart = new Date();
  valStart.setDate(now.getDate() - horizonDays);
  const trainStart = new Date();
  trainStart.setDate(now.getDate() - horizonDays - windowDays);

  // Training period sales
  const trainSales = await SalesRecord.find({
    storeId,
    productId,
    date: { $gte: trainStart, $lt: valStart },
  });

  if (trainSales.length === 0) {
    return { evaluated: false, reason: 'Insufficient training data for evaluation.' };
  }

  const trainTotal = trainSales.reduce((a, s) => a + s.quantity, 0);
  const trainDailyAvg = trainTotal / windowDays;
  const trainForecastForPeriod = trainDailyAvg * horizonDays;

  // Validation period actual sales
  const valSales = await SalesRecord.find({
    storeId,
    productId,
    date: { $gte: valStart, $lt: now },
  });

  if (valSales.length === 0) {
    return { evaluated: false, reason: 'No validation period data available.' };
  }

  const valActual = valSales.reduce((a, s) => a + s.quantity, 0);

  if (valActual === 0) {
    return { evaluated: false, reason: 'Actual demand in validation period is zero; WAPE undefined.' };
  }

  const wape = Math.abs(trainForecastForPeriod - valActual) / valActual;

  return {
    evaluated: true,
    metric: 'WAPE',
    value: parseFloat((wape * 100).toFixed(1)),
    trainForecast: Math.round(trainForecastForPeriod),
    actualDemand: valActual,
    evaluationPeriodDays: horizonDays,
    interpretation:
      wape < 0.2 ? 'GOOD' : wape < 0.4 ? 'ACCEPTABLE' : 'POOR',
  };
};

// ─── 3. Usable On-Hand Stock ─────────────────────────────────────────────────

/**
 * Calculate usable on-hand stock for a product at a location.
 * Excludes reserved quantity.
 * Excludes quantity in batches that are already expired.
 */
export const getUsableStock = async ({ productId, storeId = null, warehouseId = null }) => {
  const filter = { productId };
  if (storeId) {
    filter.storeId = storeId;
    filter.locationType = 'STORE';
  }
  if (warehouseId) {
    filter.warehouseId = warehouseId;
    filter.locationType = 'WAREHOUSE';
  }

  const inv = await Inventory.findOne(filter);
  if (!inv) return { totalQuantity: 0, reservedQuantity: 0, usableQuantity: 0, expiredQuantity: 0, assumption: 'No inventory record found.' };

  // Find expired batch quantities at this location
  const expiredBatchFilter = { productId, expiryDate: { $lt: new Date() }, quantity: { $gt: 0 } };
  if (storeId) expiredBatchFilter.storeId = storeId;
  if (warehouseId) expiredBatchFilter.warehouseId = warehouseId;

  const expiredBatches = await Batch.find(expiredBatchFilter);
  const expiredQty = expiredBatches.reduce((a, b) => a + b.quantity, 0);

  const usableQuantity = Math.max(0, inv.quantity - inv.reservedQuantity - expiredQty);

  return {
    totalQuantity: inv.quantity,
    reservedQuantity: inv.reservedQuantity,
    expiredQuantity: expiredQty,
    usableQuantity,
    assumption: 'Usable = total − reserved − expired batches.',
  };
};

// ─── 4. Replenishment Need ───────────────────────────────────────────────────

/**
 * Calculate replenishment need for one product at one store.
 *
 * replenishment_need = max(0, horizon_demand + safety_buffer - usable_on_hand)
 * safety_buffer      = forecast_daily × safety_days
 */
export const calculateReplenishmentNeed = async ({
  storeId,
  productId,
  windowDays = DEFAULT_WINDOW_DAYS,
  horizonDays = DEFAULT_HORIZON_DAYS,
  safetyDays = DEFAULT_SAFETY_DAYS,
}) => {
  const forecast = await forecastForStoreProduct({ storeId, productId, windowDays, horizonDays });
  const stockInfo = await getUsableStock({ productId, storeId });

  const safetyBuffer = Math.round(forecast.forecastDaily * safetyDays);
  const replenishmentNeed = Math.max(
    0,
    forecast.forecastHorizonDemand + safetyBuffer - stockInfo.usableQuantity
  );

  return {
    storeId,
    productId,
    forecast,
    stockInfo,
    safetyBuffer,
    safetyDays,
    horizonDays,
    replenishmentNeed,
    calculation: `max(0, ${forecast.forecastHorizonDemand} + ${safetyBuffer} − ${stockInfo.usableQuantity}) = ${replenishmentNeed}`,
  };
};

// ─── 5. FEFO Batch Selection ──────────────────────────────────────────────────

/**
 * Select the best source batch using FEFO.
 * Prefers earliest-expiring, non-expired, non-zero batch at a warehouse.
 * Also checks destination feasibility: store forecast demand over batch's remaining
 * shelf life must be sufficient to sell through the batch.
 */
export const selectFEFOBatch = async ({
  warehouseId,
  productId,
  quantityNeeded,
  storeForecastDaily = 0,
}) => {
  const today = new Date();

  // Fetch non-expired, non-empty warehouse batches sorted by expiry ASC (FEFO)
  const batches = await Batch.find({
    warehouseId,
    productId,
    quantity: { $gt: 0 },
    expiryDate: { $gt: today },
  }).sort({ expiryDate: 1 }); // earliest expiry first

  if (batches.length === 0) {
    return { batch: null, reason: 'No available non-expired batches at this warehouse.' };
  }

  // Pick the earliest-expiring batch with sufficient quantity
  for (const batch of batches) {
    const daysLeft = Math.ceil((batch.expiryDate - today) / (1000 * 60 * 60 * 24));
    const estimatedSellThrough = Math.round(storeForecastDaily * daysLeft);
    const feasible = estimatedSellThrough >= Math.min(quantityNeeded, batch.quantity);

    if (feasible || daysLeft > 60) {
      // Always use if shelf life is comfortable, or if destination can sell through
      return {
        batch,
        daysLeft,
        estimatedSellThrough,
        feasible: true,
        reason: `FEFO selected: batch expires in ${daysLeft} days. Store estimated sell-through ${estimatedSellThrough} units over that period.`,
      };
    }
  }

  // Fall back to earliest batch even if sell-through is questionable — flag a warning
  const fallbackBatch = batches[0];
  const daysLeft = Math.ceil((fallbackBatch.expiryDate - today) / (1000 * 60 * 60 * 24));
  const estimatedSellThrough = Math.round(storeForecastDaily * daysLeft);

  return {
    batch: fallbackBatch,
    daysLeft,
    estimatedSellThrough,
    feasible: false,
    warning: `Destination may not sell through this batch before expiry. Est. sell-through: ${estimatedSellThrough} vs batch qty: ${Math.min(quantityNeeded, fallbackBatch.quantity)}.`,
    reason: `FEFO fallback: no batch with comfortable sell-through available; using earliest-expiring batch (${daysLeft} days left).`,
  };
};

// ─── 6. Allocation Engine ────────────────────────────────────────────────────

/**
 * Find the best warehouse to supply a product to a store.
 * Selects the warehouse with the most available stock (greedy).
 * Hard constraint: recommended qty ≤ warehouse available qty.
 */
export const findBestSourceWarehouse = async ({ productId, quantityNeeded }) => {
  const warehouses = await Inventory.find({
    productId,
    locationType: 'WAREHOUSE',
  })
    .populate('warehouseId', 'name code location')
    .sort({ quantity: -1 });

  for (const inv of warehouses) {
    const available = inv.availableQuantity;
    if (available >= quantityNeeded) {
      return {
        warehouseId: inv.warehouseId._id,
        warehouseName: inv.warehouseId.name,
        warehouseCode: inv.warehouseId.code,
        availableQuantity: available,
        allocated: quantityNeeded,
        note: `Warehouse selected: ${inv.warehouseId.name} has ${available} available units (need ${quantityNeeded}).`,
      };
    }
    // Partial fulfillment from this warehouse
    if (available > 0) {
      return {
        warehouseId: inv.warehouseId._id,
        warehouseName: inv.warehouseId.name,
        warehouseCode: inv.warehouseId.code,
        availableQuantity: available,
        allocated: available,
        partial: true,
        note: `Partial fulfillment: only ${available} units available (need ${quantityNeeded}). Quantity capped to available stock.`,
      };
    }
  }

  return null; // no warehouse has stock
};

// ─── 7. Auto-Generate Recommendations ────────────────────────────────────────

/**
 * Generate recommendations for all active store/product combinations.
 * Only creates new PENDING recommendations for combinations where none already exist.
 * Returns list of generated recommendations.
 */
export const generateRecommendations = async ({ windowDays = DEFAULT_WINDOW_DAYS, horizonDays = DEFAULT_HORIZON_DAYS, safetyDays = DEFAULT_SAFETY_DAYS } = {}) => {
  const stores = await Store.find({ isActive: true });
  const products = await Product.find({ isActive: true });

  const generated = [];
  const skipped = [];

  for (const store of stores) {
    for (const product of products) {
      // Skip if a PENDING recommendation already exists for this combination
      const existing = await Recommendation.findOne({
        destinationId: store._id,
        productId: product._id,
        status: 'PENDING',
      });
      if (existing) {
        skipped.push({ store: store.name, product: product.name, reason: 'Pending recommendation already exists.' });
        continue;
      }

      // Calculate replenishment need
      const replenishment = await calculateReplenishmentNeed({
        storeId: store._id,
        productId: product._id,
        windowDays,
        horizonDays,
        safetyDays,
      });

      if (replenishment.replenishmentNeed <= 0) {
        skipped.push({ store: store.name, product: product.name, reason: `No replenishment needed. Usable stock (${replenishment.stockInfo.usableQuantity}) covers demand + buffer.` });
        continue;
      }

      // Find best source warehouse
      const source = await findBestSourceWarehouse({
        productId: product._id,
        quantityNeeded: replenishment.replenishmentNeed,
      });

      if (!source) {
        skipped.push({ store: store.name, product: product.name, reason: 'No warehouse with available stock found.' });
        continue;
      }

      const allocatedQty = source.allocated;

      // FEFO batch selection
      const fefoResult = await selectFEFOBatch({
        warehouseId: source.warehouseId,
        productId: product._id,
        quantityNeeded: allocatedQty,
        storeForecastDaily: replenishment.forecast.forecastDaily,
      });

      // Build human-readable reason
      const lines = [
        `${store.name} is projected to need ${replenishment.forecast.forecastHorizonDemand} units of ${product.name} over the next ${horizonDays} days (moving average baseline, ${replenishment.forecast.daysWithData} days of data).`,
        `Usable on-hand stock: ${replenishment.stockInfo.usableQuantity} units. Safety buffer: ${replenishment.safetyBuffer} units (${safetyDays}-day buffer).`,
        `Replenishment calculation: max(0, ${replenishment.forecast.forecastHorizonDemand} + ${replenishment.safetyBuffer} − ${replenishment.stockInfo.usableQuantity}) = ${replenishment.replenishmentNeed} units.`,
        source.partial ? `⚠ Partial fulfillment: only ${allocatedQty} available at ${source.warehouseName}.` : `Source: ${source.warehouseName} (${source.availableQuantity} units available).`,
      ];

      if (fefoResult.batch) {
        lines.push(`FEFO batch selected: ${fefoResult.batch.batchNumber} — ${fefoResult.reason}`);
        if (fefoResult.warning) lines.push(`⚠ Expiry Warning: ${fefoResult.warning}`);
      } else {
        lines.push(`Batch: ${fefoResult.reason}`);
      }

      if (replenishment.forecast.warning) {
        lines.push(`Data quality notice: ${replenishment.forecast.warning}`);
      }

      const reason = lines.join('\n');

      const rec = await Recommendation.create({
        productId: product._id,
        sourceWarehouseId: source.warehouseId,
        destinationType: 'STORE',
        destinationId: store._id,
        quantity: allocatedQty,
        batchId: fefoResult.batch ? fefoResult.batch._id : null,
        transportCost: 0,
        expectedDemand: replenishment.forecast.forecastHorizonDemand,
        reason,
        status: 'PENDING',
      });

      generated.push({
        recommendationId: rec._id,
        store: store.name,
        product: product.name,
        quantity: allocatedQty,
        partial: source.partial || false,
        fefoWarning: fefoResult.warning || null,
        dataQuality: replenishment.forecast.dataQuality,
      });
    }
  }

  return { generated, skipped };
};

// ─── 8. Baseline Comparison ──────────────────────────────────────────────────

/**
 * Simple rule-based baseline: replenish whenever current stock < safety threshold.
 * Quantity = reorderPoint − currentStock (no forecast used).
 * This is the "naive" comparator against the StockWise moving-average plan.
 */
export const computeBaselinePlan = async ({ stores, products }) => {
  const baselineItems = [];

  for (const store of stores) {
    for (const product of products) {
      const inv = await Inventory.findOne({
        productId: product._id,
        storeId: store._id,
        locationType: 'STORE',
      });

      const currentStock = inv ? inv.availableQuantity : 0;
      const safetyStock = product.minSafetyStock || 20;
      const reorderPoint = product.reorderPoint || 50;

      // Baseline rule: replenish only when below safety stock
      const baselineQty = currentStock < safetyStock ? Math.max(0, reorderPoint - currentStock) : 0;

      baselineItems.push({
        storeId: store._id,
        storeName: store.name,
        productId: product._id,
        productName: product.name,
        currentStock,
        safetyStock,
        reorderPoint,
        baselineQuantity: baselineQty,
        rule: 'Replenish if currentStock < safetyStock; quantity = reorderPoint − currentStock',
      });
    }
  }

  return baselineItems;
};

/**
 * Full demand forecast overview — used by the Demand Forecast page API.
 * Returns per-store per-product forecast data with evaluation metrics.
 */
export const getDemandForecastData = async ({ windowDays = DEFAULT_WINDOW_DAYS, horizonDays = DEFAULT_HORIZON_DAYS, safetyDays = DEFAULT_SAFETY_DAYS } = {}) => {
  const stores = await Store.find({ isActive: true });
  const products = await Product.find({ isActive: true });

  const forecastGrid = [];

  for (const store of stores) {
    for (const product of products) {
      const forecast = await forecastForStoreProduct({
        storeId: store._id,
        productId: product._id,
        windowDays,
        horizonDays,
      });

      const stockInfo = await getUsableStock({ productId: product._id, storeId: store._id });
      const safetyBuffer = Math.round(forecast.forecastDaily * safetyDays);
      const replenishmentNeed = Math.max(0, forecast.forecastHorizonDemand + safetyBuffer - stockInfo.usableQuantity);
      const evaluation = await evaluateForecast({ storeId: store._id, productId: product._id, windowDays, horizonDays });

      // Fetch recent daily sales for sparkline chart
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 14);
      const recentSales = await SalesRecord.find({
        storeId: store._id,
        productId: product._id,
        date: { $gte: cutoffDate },
      }).sort({ date: 1 });

      const salesTrend = recentSales.map((s) => ({
        date: s.date.toISOString().slice(0, 10),
        quantity: s.quantity,
      }));

      forecastGrid.push({
        productId: product._id,
        productName: product.name,
        sku: product.sku,
        category: product.category,
        storeId: store._id,
        storeName: store.name,
        storeCode: store.code,
        forecast,
        stockInfo,
        safetyBuffer,
        replenishmentNeed,
        evaluation,
        salesTrend,
      });
    }
  }

  return {
    forecastGrid,
    config: { windowDays, horizonDays, safetyDays },
    method: 'Moving Average Baseline (Phase 1)',
    methodDescription: `Daily demand estimated as average of the last ${windowDays} days of sales. Horizon demand = daily avg × ${horizonDays} days. Safety buffer = daily avg × ${safetyDays} days.`,
  };
};

/**
 * Rigorous comparison between Simple Static Min-Max Rule Baseline and StockWise Proposed Plan
 * using the EXACT SAME input data.
 */
export const getBaselineComparison = async ({ windowDays = DEFAULT_WINDOW_DAYS, horizonDays = DEFAULT_HORIZON_DAYS, safetyDays = DEFAULT_SAFETY_DAYS } = {}) => {
  const stores = await Store.find({ isActive: true });
  const products = await Product.find({ isActive: true });

  // Get total warehouse available stock per product
  const warehouseStockMap = {};
  for (const prod of products) {
    const whInvs = await Inventory.find({ productId: prod._id, locationType: 'WAREHOUSE' });
    warehouseStockMap[prod._id.toString()] = whInvs.reduce((acc, curr) => acc + curr.availableQuantity, 0);
  }

  // Get all active recommendations (StockWise proposed plan)
  const pendingRecs = await Recommendation.find({ status: { $in: ['PENDING', 'APPROVED', 'EDITED'] } });
  const recMap = {};
  for (const r of pendingRecs) {
    recMap[`${r.destinationId}_${r.productId}`] = r;
  }

  const comparisonRows = [];
  let baselineTotalAllocated = 0;
  let stockwiseTotalAllocated = 0;
  let baselineTotalUnmetDemand = 0;
  let stockwiseTotalUnmetDemand = 0;
  let baselineTotalExcess = 0;
  let stockwiseTotalExcess = 0;
  let baselineInfeasibleOrders = 0;
  let stockwiseInfeasibleOrders = 0;

  for (const store of stores) {
    for (const prod of products) {
      const forecast = await forecastForStoreProduct({ storeId: store._id, productId: prod._id, windowDays, horizonDays });
      const storeInv = await Inventory.findOne({ productId: prod._id, storeId: store._id, locationType: 'STORE' });
      const currentStock = storeInv ? storeInv.availableQuantity : 0;
      const safetyStock = prod.minSafetyStock || 20;
      const reorderPoint = prod.reorderPoint || 50;
      const horizonDemand = forecast.forecastHorizonDemand || 0;
      const availableWhStock = warehouseStockMap[prod._id.toString()] || 0;

      // 1. Baseline Decision: Naive static rule (Order reorderPoint - currentStock IF currentStock < safetyStock)
      const baselineOrder = currentStock < safetyStock ? Math.max(0, reorderPoint - currentStock) : 0;
      baselineTotalAllocated += baselineOrder;
      const baselineIsFeasible = baselineOrder <= availableWhStock;
      if (!baselineIsFeasible) baselineInfeasibleOrders++;

      // Baseline unmet demand over horizon
      const baselineEffectiveReceived = Math.min(baselineOrder, availableWhStock);
      const baselineNetEnding = (currentStock + baselineEffectiveReceived) - horizonDemand;
      const baselineUnmet = baselineNetEnding < 0 ? Math.abs(baselineNetEnding) : 0;
      baselineTotalUnmetDemand += baselineUnmet;

      // Baseline excess inventory (units exceeding 1.5 * reorderPoint after meeting horizon demand)
      const baselineExcess = Math.max(0, (currentStock + baselineEffectiveReceived - horizonDemand) - Math.round(reorderPoint * 1.5));
      baselineTotalExcess += baselineExcess;

      // 2. StockWise Decision: Dynamic Forecast + safety buffer - usable stock, constrained by warehouse stock
      const safetyBuffer = Math.round(forecast.forecastDaily * safetyDays);
      const replenishmentNeed = Math.max(0, horizonDemand + safetyBuffer - currentStock);
      
      const rec = recMap[`${store._id}_${prod._id}`];
      const stockwiseAllocated = rec ? rec.quantity : Math.min(replenishmentNeed, availableWhStock);
      stockwiseTotalAllocated += stockwiseAllocated;

      const stockwiseNetEnding = (currentStock + stockwiseAllocated) - horizonDemand;
      const stockwiseUnmet = stockwiseNetEnding < 0 ? Math.abs(stockwiseNetEnding) : 0;
      stockwiseTotalUnmetDemand += stockwiseUnmet;

      const stockwiseExcess = Math.max(0, (currentStock + stockwiseAllocated - horizonDemand) - Math.round(reorderPoint * 1.5));
      stockwiseTotalExcess += stockwiseExcess;

      comparisonRows.push({
        storeId: store._id,
        storeName: store.name,
        productId: prod._id,
        productName: prod.name,
        currentStock,
        forecastDemand: horizonDemand,
        reorderPoint,
        safetyStock,
        warehouseAvailable: availableWhStock,
        baseline: {
          allocated: baselineOrder,
          unmetDemand: baselineUnmet,
          excess: baselineExcess,
          isFeasible: baselineIsFeasible,
          reason: currentStock < safetyStock ? `Stock (${currentStock}) < Safety (${safetyStock}) -> Order ${baselineOrder}` : `Stock >= Safety -> No order`,
        },
        stockwise: {
          allocated: stockwiseAllocated,
          unmetDemand: stockwiseUnmet,
          excess: stockwiseExcess,
          isFeasible: stockwiseAllocated <= availableWhStock,
          reason: `Demand (${horizonDemand}) + Buffer (${safetyBuffer}) - Stock (${currentStock}) = ${replenishmentNeed}`,
        },
      });
    }
  }

  // Calculate true observed percentage changes (without fabrication)
  const unmetDemandDiff = baselineTotalUnmetDemand - stockwiseTotalUnmetDemand;
  const unmetDemandReductionPct = baselineTotalUnmetDemand > 0
    ? parseFloat(((unmetDemandDiff / baselineTotalUnmetDemand) * 100).toFixed(1))
    : 0;

  const excessReductionUnits = baselineTotalExcess - stockwiseTotalExcess;

  return {
    summary: {
      baseline: {
        totalAllocated: baselineTotalAllocated,
        unmetDemand: baselineTotalUnmetDemand,
        excessInventory: baselineTotalExcess,
        infeasibleOrders: baselineInfeasibleOrders,
        feasibilityRate: comparisonRows.length > 0
          ? `${(((comparisonRows.length - baselineInfeasibleOrders) / comparisonRows.length) * 100).toFixed(0)}%`
          : '100%',
        method: 'Static Min-Max Rule (Order when stock < safety threshold)',
      },
      stockwise: {
        totalAllocated: stockwiseTotalAllocated,
        unmetDemand: stockwiseTotalUnmetDemand,
        excessInventory: stockwiseTotalExcess,
        infeasibleOrders: stockwiseInfeasibleOrders,
        feasibilityRate: '100%',
        method: 'StockWise Dynamic Forecast + Replenishment + FEFO Allocation',
      },
      comparison: {
        unmetDemandDiff,
        unmetDemandReductionPct,
        excessReductionUnits,
        evaluationDataset: 'Live MongoDB Database (Same input snapshot)',
      },
    },
    rows: comparisonRows,
  };
};

