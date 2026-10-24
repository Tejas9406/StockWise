import { Inventory } from '../models/Inventory.js';
import { Batch } from '../models/Batch.js';
import { Product } from '../models/Product.js';
import { Warehouse } from '../models/Warehouse.js';
import { Store } from '../models/Store.js';

/**
 * Calculate comprehensive risk alerts across inventory
 */
export const calculateRiskAlerts = async (filter = {}) => {
  const inventories = await Inventory.find(filter)
    .populate('productId')
    .populate('warehouseId', 'name code location')
    .populate('storeId', 'name code location');

  const stockoutRisks = [];
  const excessRisks = [];

  for (const inv of inventories) {
    if (!inv.productId) continue;

    const available = inv.availableQuantity;
    const safetyStock = inv.productId.minSafetyStock || 20;
    const reorderPoint = inv.productId.reorderPoint || 50;

    // Stockout risk: Available quantity is below safety stock threshold
    if (available <= safetyStock) {
      stockoutRisks.push({
        inventoryId: inv._id,
        product: inv.productId,
        locationType: inv.locationType,
        location: inv.warehouseId || inv.storeId,
        availableQuantity: available,
        reservedQuantity: inv.reservedQuantity,
        safetyStock,
        severity: available === 0 ? 'CRITICAL' : 'HIGH',
        message: available === 0 
          ? `Stockout! 0 units available (Safety limit: ${safetyStock})` 
          : `Critically low stock: ${available} units remaining (Safety limit: ${safetyStock})`,
      });
    }

    // Excess stock risk: Available quantity exceeds twice the reorder point
    if (available > reorderPoint * 2.5) {
      excessRisks.push({
        inventoryId: inv._id,
        product: inv.productId,
        locationType: inv.locationType,
        location: inv.warehouseId || inv.storeId,
        availableQuantity: available,
        reorderPoint,
        excessUnits: available - reorderPoint * 2,
        severity: 'MEDIUM',
        message: `High surplus: ${available} units holding (Reorder benchmark: ${reorderPoint})`,
      });
    }
  }

  // Expiry risks from Batch data (within 90 days or already expired)
  const today = new Date();
  const ninetyDaysFromNow = new Date();
  ninetyDaysFromNow.setDate(today.getDate() + 90);

  const batchFilter = {
    expiryDate: { $lte: ninetyDaysFromNow },
    quantity: { $gt: 0 },
  };

  if (filter.warehouseId) batchFilter.warehouseId = filter.warehouseId;
  if (filter.storeId) batchFilter.storeId = filter.storeId;

  const batches = await Batch.find(batchFilter)
    .populate('productId')
    .populate('warehouseId', 'name code location')
    .populate('storeId', 'name code location')
    .sort({ expiryDate: 1 });

  const expiryRisks = batches.map((batch) => {
    const daysLeft = Math.ceil((new Date(batch.expiryDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    let severity = 'LOW';
    if (daysLeft <= 0) severity = 'EXPIRED';
    else if (daysLeft <= 30) severity = 'CRITICAL';
    else if (daysLeft <= 60) severity = 'HIGH';
    else severity = 'MEDIUM';

    return {
      batchId: batch._id,
      batchNumber: batch.batchNumber,
      product: batch.productId,
      location: batch.warehouseId || batch.storeId,
      quantity: batch.quantity,
      expiryDate: batch.expiryDate,
      daysLeft,
      severity,
      message: daysLeft <= 0 
        ? `Expired ${Math.abs(daysLeft)} days ago!`
        : `Expires in ${daysLeft} days (${batch.quantity} units at risk)`,
    };
  });

  return {
    stockoutRisks,
    excessRisks,
    expiryRisks,
    summary: {
      totalStockoutRisks: stockoutRisks.length,
      totalExcessRisks: excessRisks.length,
      totalExpiryRisks: expiryRisks.length,
    },
  };
};

/**
 * Get aggregated system metrics for Manager Dashboard
 */
export const getSystemMetrics = async () => {
  const [
    totalWarehouses,
    totalStores,
    totalProducts,
    inventoryDocs,
  ] = await Promise.all([
    Warehouse.countDocuments({ isActive: true }),
    Store.countDocuments({ isActive: true }),
    Product.countDocuments({ isActive: true }),
    Inventory.find(),
  ]);

  const totalInventory = inventoryDocs.reduce((acc, curr) => acc + (curr.quantity || 0), 0);
  const totalReserved = inventoryDocs.reduce((acc, curr) => acc + (curr.reservedQuantity || 0), 0);

  const riskData = await calculateRiskAlerts();

  return {
    totalWarehouses,
    totalStores,
    totalProducts,
    totalInventory,
    totalReserved,
    totalAvailable: totalInventory - totalReserved,
    stockoutRisksCount: riskData.stockoutRisks.length,
    expiryRisksCount: riskData.expiryRisks.length,
    excessInventoryCount: riskData.excessRisks.length,
  };
};
