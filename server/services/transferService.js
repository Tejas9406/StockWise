import { Transfer } from '../models/Transfer.js';
import { Inventory } from '../models/Inventory.js';
import { Batch } from '../models/Batch.js';
import { ApprovalEvent } from '../models/ApprovalEvent.js';
import { Notification } from '../models/Notification.js';

/**
 * Generate human-readable transfer tracking number
 */
export const generateTransferNumber = async () => {
  const count = await Transfer.countDocuments();
  const year = new Date().getFullYear();
  return `TR-${year}-${String(count + 1).padStart(4, '0')}`;
};

/**
 * Create a new transfer request (Manual or converted from recommendation)
 */
export const createTransfer = async ({
  productId,
  sourceWarehouseId,
  destinationType = 'STORE',
  destinationId,
  quantity,
  batchId = null,
  notes = '',
  createdBy,
}) => {
  // Validate warehouse inventory exists
  const warehouseInv = await Inventory.findOne({
    productId,
    warehouseId: sourceWarehouseId,
    locationType: 'WAREHOUSE',
  });

  if (!warehouseInv || warehouseInv.availableQuantity < quantity) {
    throw new Error(
      `Insufficient available stock in warehouse. Required: ${quantity}, Available: ${
        warehouseInv ? warehouseInv.availableQuantity : 0
      }`
    );
  }

  const transferNumber = await generateTransferNumber();

  const transfer = await Transfer.create({
    transferNumber,
    productId,
    sourceWarehouseId,
    destinationType,
    destinationId,
    destinationModel: destinationType === 'WAREHOUSE' ? 'Warehouse' : 'Store',
    quantity,
    batchId,
    notes,
    status: 'PENDING',
    createdBy,
  });

  // Log audit event
  await ApprovalEvent.create({
    transferId: transfer._id,
    userId: createdBy,
    action: 'CREATED',
    previousValue: null,
    newValue: { status: 'PENDING', quantity },
    reason: notes || 'Transfer request initiated',
  });

  // Notify Distribution Managers
  await Notification.create({
    role: 'DISTRIBUTION_MANAGER',
    title: 'New Transfer Request Created',
    message: `Transfer ${transferNumber} for ${quantity} units awaits approval.`,
    type: 'INFO',
    link: '/manager/transfers',
  });

  return transfer;
};

/**
 * Approve Transfer (Distribution Manager)
 */
export const approveTransfer = async (transferId, userId, reason = 'Approved by manager', modifiedQuantity = null) => {
  const transfer = await Transfer.findById(transferId).populate('productId sourceWarehouseId destinationId');

  if (!transfer) {
    throw new Error('Transfer not found');
  }

  if (transfer.status !== 'PENDING') {
    throw new Error(`Cannot approve transfer in '${transfer.status}' status. Only PENDING transfers can be approved.`);
  }

  const previousQuantity = transfer.quantity;
  const targetQuantity = modifiedQuantity !== null ? Number(modifiedQuantity) : transfer.quantity;

  if (targetQuantity <= 0) {
    throw new Error('Transfer quantity must be greater than zero');
  }

  // Check warehouse stock availability
  const warehouseInv = await Inventory.findOne({
    productId: transfer.productId._id || transfer.productId,
    warehouseId: transfer.sourceWarehouseId._id || transfer.sourceWarehouseId,
    locationType: 'WAREHOUSE',
  });

  if (!warehouseInv || warehouseInv.availableQuantity < targetQuantity) {
    throw new Error(
      `Cannot approve transfer: Source warehouse only has ${
        warehouseInv ? warehouseInv.availableQuantity : 0
      } available units.`
    );
  }

  // Update reserved quantity on warehouse inventory
  warehouseInv.reservedQuantity = (warehouseInv.reservedQuantity || 0) + targetQuantity;
  await warehouseInv.save();

  // If quantity was adjusted
  const wasEdited = targetQuantity !== previousQuantity;
  transfer.quantity = targetQuantity;
  transfer.status = 'APPROVED';
  transfer.approvedBy = userId;
  await transfer.save();

  // Audit event
  await ApprovalEvent.create({
    transferId: transfer._id,
    userId,
    action: wasEdited ? 'EDITED' : 'APPROVED',
    previousValue: { status: 'PENDING', quantity: previousQuantity },
    newValue: { status: 'APPROVED', quantity: targetQuantity },
    reason: wasEdited ? `Quantity adjusted from ${previousQuantity} to ${targetQuantity}. Reason: ${reason}` : reason,
  });

  // Notify Warehouse staff
  await Notification.create({
    role: 'WAREHOUSE',
    warehouseId: transfer.sourceWarehouseId._id || transfer.sourceWarehouseId,
    title: 'Transfer Approved for Picking',
    message: `Transfer ${transfer.transferNumber} has been approved (${targetQuantity} units). Ready for pick list.`,
    type: 'ACTION_REQUIRED',
    link: '/warehouse/pick-list',
  });

  return transfer;
};

/**
 * Reject / Cancel Transfer
 */
export const rejectTransfer = async (transferId, userId, reason = 'Rejected by manager') => {
  const transfer = await Transfer.findById(transferId);

  if (!transfer) {
    throw new Error('Transfer not found');
  }

  if (['DISPATCHED', 'RECEIVED'].includes(transfer.status)) {
    throw new Error(`Cannot cancel transfer in '${transfer.status}' status.`);
  }

  const previousStatus = transfer.status;

  // If already approved, release the reserved stock
  if (['APPROVED', 'PICKED', 'PACKED'].includes(previousStatus)) {
    const warehouseInv = await Inventory.findOne({
      productId: transfer.productId,
      warehouseId: transfer.sourceWarehouseId,
      locationType: 'WAREHOUSE',
    });
    if (warehouseInv) {
      warehouseInv.reservedQuantity = Math.max(0, warehouseInv.reservedQuantity - transfer.quantity);
      await warehouseInv.save();
    }
  }

  transfer.status = 'CANCELLED';
  await transfer.save();

  await ApprovalEvent.create({
    transferId: transfer._id,
    userId,
    action: 'REJECTED',
    previousValue: { status: previousStatus },
    newValue: { status: 'CANCELLED' },
    reason,
  });

  return transfer;
};

/**
 * Mark Transfer as Picked (Warehouse Staff)
 */
export const markTransferPicked = async (transferId, userId, notes = '') => {
  const transfer = await Transfer.findById(transferId);

  if (!transfer) {
    throw new Error('Transfer not found');
  }

  if (transfer.status !== 'APPROVED') {
    throw new Error(`Cannot mark as picked. Current status is '${transfer.status}'. Must be 'APPROVED'.`);
  }

  transfer.status = 'PICKED';
  if (notes) transfer.notes = transfer.notes ? `${transfer.notes}; Pick note: ${notes}` : `Pick note: ${notes}`;
  await transfer.save();

  await ApprovalEvent.create({
    transferId: transfer._id,
    userId,
    action: 'PICKED',
    previousValue: { status: 'APPROVED' },
    newValue: { status: 'PICKED' },
    reason: notes || 'Stock picked from warehouse shelves',
  });

  return transfer;
};

/**
 * Mark Transfer as Packed (Warehouse Staff)
 */
export const markTransferPacked = async (transferId, userId, notes = '') => {
  const transfer = await Transfer.findById(transferId);

  if (!transfer) {
    throw new Error('Transfer not found');
  }

  if (transfer.status !== 'PICKED') {
    throw new Error(`Cannot mark as packed. Current status is '${transfer.status}'. Must be 'PICKED'.`);
  }

  transfer.status = 'PACKED';
  if (notes) transfer.notes = transfer.notes ? `${transfer.notes}; Pack note: ${notes}` : `Pack note: ${notes}`;
  await transfer.save();

  await ApprovalEvent.create({
    transferId: transfer._id,
    userId,
    action: 'PACKED',
    previousValue: { status: 'PICKED' },
    newValue: { status: 'PACKED' },
    reason: notes || 'Items packaged and verified for dispatch',
  });

  return transfer;
};

/**
 * Dispatch Transfer (Warehouse Staff)
 */
export const markTransferDispatched = async (transferId, userId, { carrier = 'Internal Logistics', vehicleNumber = '', notes = '' } = {}) => {
  const transfer = await Transfer.findById(transferId);

  if (!transfer) {
    throw new Error('Transfer not found');
  }

  if (!['PICKED', 'PACKED'].includes(transfer.status)) {
    throw new Error(`Cannot dispatch transfer. Current status is '${transfer.status}'. Must be 'PICKED' or 'PACKED'.`);
  }

  // Physically deduct stock from source warehouse inventory
  const warehouseInv = await Inventory.findOne({
    productId: transfer.productId,
    warehouseId: transfer.sourceWarehouseId,
    locationType: 'WAREHOUSE',
  });

  if (warehouseInv) {
    warehouseInv.quantity = Math.max(0, warehouseInv.quantity - transfer.quantity);
    warehouseInv.reservedQuantity = Math.max(0, warehouseInv.reservedQuantity - transfer.quantity);
    await warehouseInv.save();
  }

  // Deduct from batch if specified
  if (transfer.batchId) {
    const batch = await Batch.findById(transfer.batchId);
    if (batch) {
      batch.quantity = Math.max(0, batch.quantity - transfer.quantity);
      await batch.save();
    }
  }

  const previousStatus = transfer.status;
  transfer.status = 'DISPATCHED';
  transfer.dispatchedAt = new Date();
  transfer.carrier = carrier;
  transfer.vehicleNumber = vehicleNumber;
  if (notes) transfer.notes = transfer.notes ? `${transfer.notes}; Dispatch note: ${notes}` : `Dispatch note: ${notes}`;
  await transfer.save();

  await ApprovalEvent.create({
    transferId: transfer._id,
    userId,
    action: 'DISPATCHED',
    previousValue: { status: previousStatus },
    newValue: { status: 'DISPATCHED', carrier, vehicleNumber },
    reason: `Dispatched via ${carrier} (${vehicleNumber || 'Standard'}). ${notes}`,
  });

  // Notify Destination Store
  await Notification.create({
    role: 'STORE_MANAGER',
    storeId: transfer.destinationId,
    title: 'Inbound Shipment Dispatched',
    message: `Shipment ${transfer.transferNumber} (${transfer.quantity} units) has departed the warehouse.`,
    type: 'INFO',
    link: '/store/incoming',
  });

  return transfer;
};

/**
 * Receive Stock (Store Manager)
 */
export const receiveTransfer = async (transferId, userId, notes = '') => {
  const transfer = await Transfer.findById(transferId).populate('productId batchId');

  if (!transfer) {
    throw new Error('Transfer not found');
  }

  if (transfer.status !== 'DISPATCHED') {
    throw new Error(`Cannot receive transfer. Current status is '${transfer.status}'. Must be 'DISPATCHED'.`);
  }

  // Real database transaction / mutation:
  // 1. Increase destination store's Inventory
  let storeInv = await Inventory.findOne({
    productId: transfer.productId._id || transfer.productId,
    storeId: transfer.destinationId,
    locationType: 'STORE',
  });

  if (!storeInv) {
    storeInv = new Inventory({
      productId: transfer.productId._id || transfer.productId,
      storeId: transfer.destinationId,
      locationType: 'STORE',
      quantity: transfer.quantity,
      reservedQuantity: 0,
    });
  } else {
    storeInv.quantity = (storeInv.quantity || 0) + transfer.quantity;
  }
  await storeInv.save();

  // 2. If batch was transferred, replicate / add batch to destination store
  if (transfer.batchId) {
    const sourceBatch = await Batch.findById(transfer.batchId);
    if (sourceBatch) {
      let storeBatch = await Batch.findOne({
        productId: sourceBatch.productId,
        storeId: transfer.destinationId,
        batchNumber: sourceBatch.batchNumber,
      });

      if (storeBatch) {
        storeBatch.quantity = (storeBatch.quantity || 0) + transfer.quantity;
        await storeBatch.save();
      } else {
        await Batch.create({
          productId: sourceBatch.productId,
          storeId: transfer.destinationId,
          batchNumber: sourceBatch.batchNumber,
          quantity: transfer.quantity,
          manufacturingDate: sourceBatch.manufacturingDate,
          expiryDate: sourceBatch.expiryDate,
        });
      }
    }
  }

  transfer.status = 'RECEIVED';
  transfer.receivedAt = new Date();
  if (notes) transfer.notes = transfer.notes ? `${transfer.notes}; Receipt note: ${notes}` : `Receipt note: ${notes}`;
  await transfer.save();

  // Audit event
  await ApprovalEvent.create({
    transferId: transfer._id,
    userId,
    action: 'RECEIVED',
    previousValue: { status: 'DISPATCHED' },
    newValue: { status: 'RECEIVED' },
    reason: notes || 'Stock received and inspected at store',
  });

  // Notify Distribution Manager & Warehouse
  await Notification.create({
    role: 'DISTRIBUTION_MANAGER',
    title: 'Transfer Completed',
    message: `Transfer ${transfer.transferNumber} successfully received at destination store.`,
    type: 'SUCCESS',
    link: '/manager/transfers',
  });

  return transfer;
};
