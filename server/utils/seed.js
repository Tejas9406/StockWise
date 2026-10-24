import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

import { User } from '../models/User.js';
import { Warehouse } from '../models/Warehouse.js';
import { Store } from '../models/Store.js';
import { Product } from '../models/Product.js';
import { Inventory } from '../models/Inventory.js';
import { Batch } from '../models/Batch.js';
import { SalesRecord } from '../models/SalesRecord.js';
import { Transfer } from '../models/Transfer.js';
import { ApprovalEvent } from '../models/ApprovalEvent.js';
import { Recommendation } from '../models/Recommendation.js';
import { Notification } from '../models/Notification.js';
import { DataImport } from '../models/DataImport.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/stockwise_ai';

export const seedDatabase = async () => {
  try {
    console.log('[Seed] Connecting to MongoDB at', MONGO_URI);
    await mongoose.connect(MONGO_URI);
    console.log('[Seed] Connected to database. Purging old collections...');

    await Promise.all([
      User.deleteMany({}),
      Warehouse.deleteMany({}),
      Store.deleteMany({}),
      Product.deleteMany({}),
      Inventory.deleteMany({}),
      Batch.deleteMany({}),
      SalesRecord.deleteMany({}),
      Transfer.deleteMany({}),
      ApprovalEvent.deleteMany({}),
      Recommendation.deleteMany({}),
      Notification.deleteMany({}),
      DataImport.deleteMany({}),
    ]);

    console.log('[Seed] Old data purged. Seeding Warehouses...');

    // 1. Warehouses
    const wh1 = await Warehouse.create({
      name: 'North Regional Hub',
      code: 'WH-001',
      location: 'Delhi NCR Logistics Zone',
      address: 'Plot 42, Udyog Vihar Phase 4, Gurgaon, Haryana 122016',
      capacity: 15000,
      isActive: true,
    });

    const wh2 = await Warehouse.create({
      name: 'Western Central Hub',
      code: 'WH-002',
      location: 'Bhiwandi Industrial Park, Mumbai',
      address: 'Warehouse Complex C-12, Bhiwandi, Maharashtra 421302',
      capacity: 20000,
      isActive: true,
    });

    console.log('[Seed] Warehouses created. Seeding Stores...');

    // 2. Stores
    const store1 = await Store.create({
      name: 'Metro Supermart - Downtown',
      code: 'STORE-001',
      location: 'Connaught Place, New Delhi',
      address: 'Block B, Inner Circle, Connaught Place, New Delhi 110001',
      isActive: true,
    });

    const store2 = await Store.create({
      name: 'City Center Retail',
      code: 'STORE-002',
      location: 'Bandra West, Mumbai',
      address: 'Hill Road, Near Bandra Station, Mumbai 400050',
      isActive: true,
    });

    const store3 = await Store.create({
      name: 'Suburban Daily Fresh',
      code: 'STORE-003',
      location: 'Noida Sector 62',
      address: 'Electronic City Metro Complex, Noida, UP 201309',
      isActive: true,
    });

    console.log('[Seed] Stores created. Seeding Products...');

    // 3. Products
    const p1 = await Product.create({
      name: 'Alphonso Mango Juice 1L',
      sku: 'BEV-MJ-1L',
      category: 'Beverages',
      unit: 'bottles',
      unitCost: 45,
      sellingPrice: 75,
      minSafetyStock: 30,
      reorderPoint: 80,
      shelfLifeDays: 90,
      isActive: true,
    });

    const p2 = await Product.create({
      name: 'Marie Gold Biscuits 200g',
      sku: 'SNK-MGB-200G',
      category: 'Snacks',
      unit: 'packs',
      unitCost: 15,
      sellingPrice: 30,
      minSafetyStock: 50,
      reorderPoint: 120,
      shelfLifeDays: 180,
      isActive: true,
    });

    const p3 = await Product.create({
      name: 'Pasteurized Toned Milk 1L',
      sku: 'DRY-TM-1L',
      category: 'Dairy',
      unit: 'pouches',
      unitCost: 28,
      sellingPrice: 36,
      minSafetyStock: 40,
      reorderPoint: 90,
      shelfLifeDays: 14,
      isActive: true,
    });

    const p4 = await Product.create({
      name: 'Chakki Whole Wheat Flour 5kg',
      sku: 'STP-WWF-5KG',
      category: 'Staples',
      unit: 'bags',
      unitCost: 160,
      sellingPrice: 240,
      minSafetyStock: 25,
      reorderPoint: 60,
      shelfLifeDays: 180,
      isActive: true,
    });

    const p5 = await Product.create({
      name: 'Sunflower Cooking Oil 1L',
      sku: 'OIL-SFO-1L',
      category: 'Staples',
      unit: 'pouches',
      unitCost: 110,
      sellingPrice: 155,
      minSafetyStock: 30,
      reorderPoint: 75,
      shelfLifeDays: 270,
      isActive: true,
    });

    const p6 = await Product.create({
      name: 'Assam Gold Tea Bags 100s',
      sku: 'BEV-AGT-100S',
      category: 'Beverages',
      unit: 'boxes',
      unitCost: 140,
      sellingPrice: 220,
      minSafetyStock: 20,
      reorderPoint: 50,
      shelfLifeDays: 365,
      isActive: true,
    });

    console.log('[Seed] Products created. Seeding Users...');

    // 4. Users
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('password123', salt);

    const managerUser = await User.create({
      name: 'Anita Sharma',
      email: 'manager@stockwise.ai',
      passwordHash,
      role: 'DISTRIBUTION_MANAGER',
      isActive: true,
    });

    const whUser1 = await User.create({
      name: 'Rajesh Kumar (WH-001)',
      email: 'warehouse1@stockwise.ai',
      passwordHash,
      role: 'WAREHOUSE',
      warehouseId: wh1._id,
      isActive: true,
    });

    const whUser2 = await User.create({
      name: 'Vikram Joshi (WH-002)',
      email: 'warehouse2@stockwise.ai',
      passwordHash,
      role: 'WAREHOUSE',
      warehouseId: wh2._id,
      isActive: true,
    });

    const storeUser1 = await User.create({
      name: 'Pooja Verma (Store 1)',
      email: 'store1@stockwise.ai',
      passwordHash,
      role: 'STORE_MANAGER',
      storeId: store1._id,
      isActive: true,
    });

    const storeUser2 = await User.create({
      name: 'Suresh Patel (Store 2)',
      email: 'store2@stockwise.ai',
      passwordHash,
      role: 'STORE_MANAGER',
      storeId: store2._id,
      isActive: true,
    });

    console.log('[Seed] Users created. Seeding Batches...');

    // Helper dates
    const now = new Date();
    const daysFromNow = (days) => {
      const d = new Date();
      d.setDate(d.getDate() + days);
      return d;
    };

    // 5. Batches in Warehouses
    const batchMJ1 = await Batch.create({
      productId: p1._id,
      warehouseId: wh1._id,
      batchNumber: 'BAT-MJ-26A',
      quantity: 350,
      manufacturingDate: daysFromNow(-30),
      expiryDate: daysFromNow(60), // 60 days left
    });

    const batchMJ2 = await Batch.create({
      productId: p1._id,
      warehouseId: wh1._id,
      batchNumber: 'BAT-MJ-25Z',
      quantity: 120,
      manufacturingDate: daysFromNow(-70),
      expiryDate: daysFromNow(20), // Near expiry! 20 days left -> triggers warning
    });

    const batchBisc1 = await Batch.create({
      productId: p2._id,
      warehouseId: wh1._id,
      batchNumber: 'BAT-MGB-01',
      quantity: 800,
      manufacturingDate: daysFromNow(-20),
      expiryDate: daysFromNow(160),
    });

    const batchMilk1 = await Batch.create({
      productId: p3._id,
      warehouseId: wh1._id,
      batchNumber: 'BAT-MLK-09',
      quantity: 250,
      manufacturingDate: daysFromNow(-3),
      expiryDate: daysFromNow(11), // 11 days left
    });

    const batchFlour1 = await Batch.create({
      productId: p4._id,
      warehouseId: wh2._id,
      batchNumber: 'BAT-WWF-12',
      quantity: 400,
      manufacturingDate: daysFromNow(-40),
      expiryDate: daysFromNow(140),
    });

    const batchOil1 = await Batch.create({
      productId: p5._id,
      warehouseId: wh2._id,
      batchNumber: 'BAT-SFO-04',
      quantity: 500,
      manufacturingDate: daysFromNow(-60),
      expiryDate: daysFromNow(210),
    });

    console.log('[Seed] Batches created. Seeding Inventories...');

    // 6. Inventories
    // Warehouse 1
    await Inventory.create([
      {
        productId: p1._id,
        locationType: 'WAREHOUSE',
        warehouseId: wh1._id,
        quantity: 470,
        reservedQuantity: 40,
      },
      {
        productId: p2._id,
        locationType: 'WAREHOUSE',
        warehouseId: wh1._id,
        quantity: 800,
        reservedQuantity: 0,
      },
      {
        productId: p3._id,
        locationType: 'WAREHOUSE',
        warehouseId: wh1._id,
        quantity: 250,
        reservedQuantity: 0,
      },
      {
        productId: p6._id,
        locationType: 'WAREHOUSE',
        warehouseId: wh1._id,
        quantity: 180,
        reservedQuantity: 0,
      },
    ]);

    // Warehouse 2
    await Inventory.create([
      {
        productId: p1._id,
        locationType: 'WAREHOUSE',
        warehouseId: wh2._id,
        quantity: 300,
        reservedQuantity: 0,
      },
      {
        productId: p4._id,
        locationType: 'WAREHOUSE',
        warehouseId: wh2._id,
        quantity: 400,
        reservedQuantity: 0,
      },
      {
        productId: p5._id,
        locationType: 'WAREHOUSE',
        warehouseId: wh2._id,
        quantity: 500,
        reservedQuantity: 0,
      },
    ]);

    // Store 1 (Metro Supermart) - Low stock on Mango Juice to demonstrate stockout alert!
    await Inventory.create([
      {
        productId: p1._id,
        locationType: 'STORE',
        storeId: store1._id,
        quantity: 12, // Below minSafetyStock (30) -> High Stockout Risk!
        reservedQuantity: 0,
      },
      {
        productId: p2._id,
        locationType: 'STORE',
        storeId: store1._id,
        quantity: 85,
        reservedQuantity: 0,
      },
      {
        productId: p3._id,
        locationType: 'STORE',
        storeId: store1._id,
        quantity: 18, // Below minSafetyStock (40) -> Stockout Risk!
        reservedQuantity: 0,
      },
      {
        productId: p4._id,
        locationType: 'STORE',
        storeId: store1._id,
        quantity: 45,
        reservedQuantity: 0,
      },
    ]);

    // Store 2
    await Inventory.create([
      {
        productId: p1._id,
        locationType: 'STORE',
        storeId: store2._id,
        quantity: 65,
        reservedQuantity: 0,
      },
      {
        productId: p2._id,
        locationType: 'STORE',
        storeId: store2._id,
        quantity: 110,
        reservedQuantity: 0,
      },
      {
        productId: p5._id,
        locationType: 'STORE',
        storeId: store2._id,
        quantity: 50,
        reservedQuantity: 0,
      },
    ]);

    // Store 3
    await Inventory.create([
      {
        productId: p1._id,
        locationType: 'STORE',
        storeId: store3._id,
        quantity: 5, // Critical stockout risk!
        reservedQuantity: 0,
      },
      {
        productId: p2._id,
        locationType: 'STORE',
        storeId: store3._id,
        quantity: 90,
        reservedQuantity: 0,
      },
      {
        productId: p6._id,
        locationType: 'STORE',
        storeId: store3._id,
        quantity: 35,
        reservedQuantity: 0,
      },
    ]);

    console.log('[Seed] Inventories created. Seeding Sales History...');

    // 7. Sales History (14 days of realistic sales)
    const salesData = [];
    for (let day = 14; day >= 0; day--) {
      const saleDate = daysFromNow(-day);
      // Store 1 sales
      salesData.push({
        storeId: store1._id,
        productId: p1._id,
        date: saleDate,
        quantity: Math.floor(8 + Math.random() * 8),
        revenue: Math.floor(8 + Math.random() * 8) * 75,
      });
      salesData.push({
        storeId: store1._id,
        productId: p2._id,
        date: saleDate,
        quantity: Math.floor(12 + Math.random() * 15),
        revenue: Math.floor(12 + Math.random() * 15) * 30,
      });
      salesData.push({
        storeId: store1._id,
        productId: p3._id,
        date: saleDate,
        quantity: Math.floor(15 + Math.random() * 10),
        revenue: Math.floor(15 + Math.random() * 10) * 36,
      });

      // Store 2 sales
      salesData.push({
        storeId: store2._id,
        productId: p1._id,
        date: saleDate,
        quantity: Math.floor(6 + Math.random() * 6),
        revenue: Math.floor(6 + Math.random() * 6) * 75,
      });
      salesData.push({
        storeId: store2._id,
        productId: p2._id,
        date: saleDate,
        quantity: Math.floor(10 + Math.random() * 10),
        revenue: Math.floor(10 + Math.random() * 10) * 30,
      });
    }
    await SalesRecord.insertMany(salesData);

    console.log('[Seed] Sales history created. Seeding initial Recommendations & Transfers...');

    // 8. Recommendations (Realistic pending AI recommendation)
    await Recommendation.create([
      {
        productId: p1._id,
        sourceWarehouseId: wh1._id,
        destinationType: 'STORE',
        destinationId: store1._id,
        quantity: 60,
        batchId: batchMJ2._id, // FEFO near-expiry batch
        transportCost: 450,
        expectedDemand: 72,
        reason: 'Store 1 stockout risk detected (12 units on shelf, safety stock 30). Allocates near-expiry batch BAT-MJ-25Z (20 days shelf life) to high velocity store.',
        status: 'PENDING',
      },
      {
        productId: p3._id,
        sourceWarehouseId: wh1._id,
        destinationType: 'STORE',
        destinationId: store1._id,
        quantity: 50,
        batchId: batchMilk1._id,
        transportCost: 320,
        expectedDemand: 65,
        reason: 'Daily replenishment requirement. Prevent forecasted weekend stockout.',
        status: 'PENDING',
      },
    ]);

    // 9. Transfers at different lifecycle stages for live workflow testing!
    // Transfer 1: APPROVED and waiting in WH-001 Pick List
    const tr1 = await Transfer.create({
      transferNumber: 'TR-2026-0001',
      productId: p1._id,
      sourceWarehouseId: wh1._id,
      destinationType: 'STORE',
      destinationId: store1._id,
      destinationModel: 'Store',
      quantity: 40,
      batchId: batchMJ1._id,
      status: 'APPROVED',
      createdBy: managerUser._id,
      approvedBy: managerUser._id,
      notes: 'Initial approved transfer for store replenishment',
    });

    await ApprovalEvent.create([
      {
        transferId: tr1._id,
        userId: managerUser._id,
        action: 'CREATED',
        previousValue: null,
        newValue: { status: 'PENDING', quantity: 40 },
        reason: 'Store 1 replenishment transfer initiated',
        timestamp: daysFromNow(-1),
      },
      {
        transferId: tr1._id,
        userId: managerUser._id,
        action: 'APPROVED',
        previousValue: { status: 'PENDING', quantity: 40 },
        newValue: { status: 'APPROVED', quantity: 40 },
        reason: 'Approved for North Hub warehouse dispatch',
        timestamp: daysFromNow(-1),
      },
    ]);

    // Transfer 2: DISPATCHED and ready to be received by Store 1 Manager!
    const tr2 = await Transfer.create({
      transferNumber: 'TR-2026-0002',
      productId: p2._id,
      sourceWarehouseId: wh1._id,
      destinationType: 'STORE',
      destinationId: store1._id,
      destinationModel: 'Store',
      quantity: 50,
      batchId: batchBisc1._id,
      status: 'DISPATCHED',
      createdBy: managerUser._id,
      approvedBy: managerUser._id,
      dispatchedAt: daysFromNow(0),
      carrier: 'SpeedLogix Express',
      vehicleNumber: 'DL-01-AB-4029',
      notes: 'Urgent weekend biscuit stock replenishment',
    });

    await ApprovalEvent.create([
      {
        transferId: tr2._id,
        userId: managerUser._id,
        action: 'APPROVED',
        previousValue: { status: 'PENDING' },
        newValue: { status: 'APPROVED' },
        reason: 'Standard approval',
      },
      {
        transferId: tr2._id,
        userId: whUser1._id,
        action: 'PICKED',
        previousValue: { status: 'APPROVED' },
        newValue: { status: 'PICKED' },
        reason: 'Items picked from Aisle 4, Shelf B',
      },
      {
        transferId: tr2._id,
        userId: whUser1._id,
        action: 'PACKED',
        previousValue: { status: 'PICKED' },
        newValue: { status: 'PACKED' },
        reason: 'Sealed in heavy duty corrugated boxes',
      },
      {
        transferId: tr2._id,
        userId: whUser1._id,
        action: 'DISPATCHED',
        previousValue: { status: 'PACKED' },
        newValue: { status: 'DISPATCHED', carrier: 'SpeedLogix Express' },
        reason: 'Truck dispatched from North Hub',
      },
    ]);

    // 10. Initial Notifications
    await Notification.create([
      {
        role: 'DISTRIBUTION_MANAGER',
        title: 'New AI Recommendations Available',
        message: '2 transfer recommendations generated to prevent retail stockouts.',
        type: 'INFO',
        link: '/manager/recommendations',
      },
      {
        role: 'WAREHOUSE',
        warehouseId: wh1._id,
        title: 'Transfer TR-2026-0001 Approved for Picking',
        message: 'Transfer TR-2026-0001 (40 units Alphonso Mango Juice) is ready to pick.',
        type: 'ACTION_REQUIRED',
        link: '/warehouse/pick-list',
      },
      {
        role: 'STORE_MANAGER',
        storeId: store1._id,
        title: 'Shipment TR-2026-0002 Dispatched',
        message: 'Carrier SpeedLogix Express is in transit with 50 units Marie Gold Biscuits.',
        type: 'INFO',
        link: '/store/receive',
      },
    ]);

    // 10. Sample Data Imports (for Data Health & Import History audit)
    await DataImport.create([
      {
        datasetType: 'SALES',
        filename: 'august_store_sales_history.csv',
        importedBy: managerUser._id,
        totalRows: 150,
        validRows: 148,
        importedRows: 148,
        failedRows: 2,
        warningRows: 3,
        status: 'IMPORTED',
        notes: 'Initial 14-day sales batch loaded for moving average baseline.',
        createdAt: daysFromNow(-1),
      },
      {
        datasetType: 'INVENTORY',
        filename: 'warehouse_store_stock_oct2026.csv',
        importedBy: managerUser._id,
        totalRows: 18,
        validRows: 18,
        importedRows: 18,
        failedRows: 0,
        warningRows: 0,
        status: 'IMPORTED',
        notes: 'Warehouse & retail starting stock levels synced.',
        createdAt: daysFromNow(-2),
      },
      {
        datasetType: 'BATCHES',
        filename: 'fmcg_production_batches_q4.csv',
        importedBy: managerUser._id,
        totalRows: 6,
        validRows: 6,
        importedRows: 6,
        failedRows: 0,
        warningRows: 1,
        status: 'IMPORTED',
        notes: 'Production batches with shelf-life and FEFO tags.',
        createdAt: daysFromNow(-3),
      },
    ]);

    console.log('[Seed] Database seeded successfully!');
    console.log('----------------------------------------------------');
    console.log('Demo Credentials:');
    console.log('1. Distribution Manager: manager@stockwise.ai / password123');
    console.log('2. Warehouse Staff (WH-001): warehouse1@stockwise.ai / password123');
    console.log('3. Store Manager (STORE-001): store1@stockwise.ai / password123');
    console.log('----------------------------------------------------');

    if (process.argv[1].endsWith('seed.js')) {
      process.exit(0);
    }
  } catch (error) {
    console.error('[Seed] Error seeding database:', error);
    process.exit(1);
  }
};

if (process.argv[1].endsWith('seed.js')) {
  seedDatabase();
}
