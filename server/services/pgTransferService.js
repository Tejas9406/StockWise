import { query, runTransaction } from '../config/db.js';
import { broadcastTelegramAlert } from './telegramService.js';

/**
 * Generate human-readable transfer tracking number
 */
export const generateTransferNumber = async (client) => {
  const db = client || { query };
  const countRes = await db.query('SELECT COUNT(*) as count FROM transfers');
  const count = parseInt(countRes.rows[0].count, 10);
  const year = new Date().getFullYear();
  return `TR-${year}-${String(count + 1).padStart(4, '0')}`;
};

/**
 * Create a new transfer request in PostgreSQL
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
  return await runTransaction(async (client) => {
    const safeProductId = parseInt(productId, 10) || 1;
    const safeSourceWh = parseInt(sourceWarehouseId, 10) || 1;
    const safeDestId = parseInt(destinationId, 10) || 1;
    const safeQty = parseInt(quantity, 10) || 40;
    const safeCreatedBy = createdBy ? (parseInt(createdBy, 10) || 1) : 1;
    const safeBatchId = batchId && !isNaN(parseInt(batchId, 10)) ? parseInt(batchId, 10) : null;
    const safeNotes = typeof notes === 'string' ? notes.trim() : '';

    // 1. Check source warehouse stock
    const invRes = await client.query(
      `SELECT id, quantity, reserved_quantity 
       FROM inventory 
       WHERE product_id = $1 AND warehouse_id = $2 AND location_type = 'WAREHOUSE'
       FOR UPDATE`,
      [safeProductId, safeSourceWh]
    );

    const inv = invRes.rows[0];
    const available = inv ? (inv.quantity - inv.reserved_quantity) : 0;

    if (!inv || available < safeQty) {
      throw new Error(
        `Insufficient available stock in warehouse. Required: ${safeQty}, Available: ${available}`
      );
    }

    const transferNumber = await generateTransferNumber(client);

    // 2. Insert Transfer
    const transferRes = await client.query(
      `INSERT INTO transfers 
        (transfer_number, product_id, source_warehouse_id, destination_type, destination_id, quantity, batch_id, status, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING', $8, $9)
       RETURNING *`,
      [transferNumber, safeProductId, safeSourceWh, destinationType, safeDestId, safeQty, safeBatchId, safeNotes, safeCreatedBy]
    );
    const transfer = transferRes.rows[0];

    // 3. Log Approval Event
    await client.query(
      `INSERT INTO approval_events (transfer_id, user_id, action, previous_value, new_value, reason)
       VALUES ($1, $2, 'CREATED', NULL, $3, $4)`,
      [transfer.id, safeCreatedBy, JSON.stringify({ status: 'PENDING', quantity: safeQty }), safeNotes || 'Transfer request initiated']
    );

    // 4. Notify Managers & Warehouse Hub
    await client.query(
      `INSERT INTO notifications (role, title, message, type, link)
       VALUES ('DISTRIBUTION_MANAGER', 'New Transfer Request Created', $1, 'INFO', '/manager/transfers'),
              ('WAREHOUSE_STAFF', 'New Transfer Request Pending', $1, 'INFO', '/warehouse/picklist')`,
      [`Transfer ${transferNumber} for ${safeQty} units awaits approval.`]
    );

    // Broadcast automatic notification to Telegram bot
    const metaRes = await client.query(
      `SELECT p.name as prod_name, s.name as store_name, w.name as wh_name 
       FROM products p, stores s, warehouses w 
       WHERE p.id = $1 AND s.id = $2 AND w.id = $3`,
      [safeProductId, safeDestId, safeSourceWh]
    );
    const prodName = metaRes.rows[0]?.prod_name || 'FMCG Product';
    const storeName = metaRes.rows[0]?.store_name || 'Store';
    const whName = metaRes.rows[0]?.wh_name || 'Warehouse Hub';

    broadcastTelegramAlert({
      title: `New Replenishment Request: ${transferNumber}`,
      message: `🏪 *Store:* ${storeName}\n📦 *Product:* ${prodName}\n🔢 *Quantity:* ${safeQty} units\n🏢 *Source:* ${whName}\n\nAwaiting Distribution Manager approval.`,
      severity: 'INFO',
      link: 'http://localhost:5173/manager/transfers',
    }).catch(e => console.warn('[Telegram Auto-Alert Error]:', e.message));

    return transfer;
  });
};

/**
 * Approve Transfer (Distribution Manager) — atomically reserves inventory
 */
export const approveTransfer = async (transferId, userId, reason = 'Approved by manager', modifiedQuantity = null) => {
  return await runTransaction(async (client) => {
    const tRes = await client.query(
      `SELECT t.*, p.name as product_name, w.name as warehouse_name
       FROM transfers t
       JOIN products p ON t.product_id = p.id
       JOIN warehouses w ON t.source_warehouse_id = w.id
       WHERE t.id = $1 FOR UPDATE`,
      [transferId]
    );

    if (tRes.rows.length === 0) {
      throw new Error('Transfer not found');
    }

    const transfer = tRes.rows[0];

    if (transfer.status !== 'PENDING') {
      throw new Error(`Cannot approve transfer in '${transfer.status}' status. Only PENDING transfers can be approved.`);
    }

    const previousQuantity = transfer.quantity;
    const targetQuantity = modifiedQuantity !== null ? Number(modifiedQuantity) : transfer.quantity;

    if (targetQuantity <= 0) {
      throw new Error('Transfer quantity must be greater than zero');
    }

    // Check available warehouse inventory
    const invRes = await client.query(
      `SELECT id, quantity, reserved_quantity 
       FROM inventory 
       WHERE product_id = $1 AND warehouse_id = $2 AND location_type = 'WAREHOUSE'
       FOR UPDATE`,
      [transfer.product_id, transfer.source_warehouse_id]
    );

    const inv = invRes.rows[0];
    const available = inv ? (inv.quantity - inv.reserved_quantity) : 0;

    if (!inv || available < targetQuantity) {
      throw new Error(`Cannot approve transfer: Source warehouse only has ${available} available units.`);
    }

    // Reserve inventory
    await client.query(
      `UPDATE inventory 
       SET reserved_quantity = reserved_quantity + $1, updated_at = NOW()
       WHERE id = $2`,
      [targetQuantity, inv.id]
    );

    // Update Transfer
    const wasEdited = targetQuantity !== previousQuantity;
    const updatedRes = await client.query(
      `UPDATE transfers 
       SET quantity = $1, status = 'APPROVED', approved_by = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [targetQuantity, userId, transferId]
    );
    const updatedTransfer = updatedRes.rows[0];

    // Audit Event
    await client.query(
      `INSERT INTO approval_events (transfer_id, user_id, action, previous_value, new_value, reason)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        transferId,
        userId,
        wasEdited ? 'EDITED' : 'APPROVED',
        JSON.stringify({ status: 'PENDING', quantity: previousQuantity }),
        JSON.stringify({ status: 'APPROVED', quantity: targetQuantity }),
        wasEdited ? `Quantity adjusted from ${previousQuantity} to ${targetQuantity}. Reason: ${reason}` : reason,
      ]
    );

    // Notify Warehouse
    await client.query(
      `INSERT INTO notifications (role, warehouse_id, title, message, type, link)
       VALUES ('WAREHOUSE', $1, 'Transfer Approved for Picking', $2, 'ACTION_REQUIRED', '/warehouse/pick-list')`,
      [transfer.source_warehouse_id, `Transfer ${transfer.transfer_number} approved (${targetQuantity} units). Ready for pick list.`]
    );

    // Automatic Telegram broadcast
    broadcastTelegramAlert({
      title: `Transfer Approved: ${transfer.transfer_number}`,
      message: `✅ *Approved:* ${transfer.transfer_number}\n📦 *Product:* ${transfer.product_name}\n🔢 *Quantity:* ${targetQuantity} units\n🏢 *Hub:* ${transfer.warehouse_name}\n\nStock reserved and ready for warehouse pick list.`,
      severity: 'INFO',
      link: 'http://localhost:5173/warehouse/picklist',
    }).catch(e => console.warn('[Telegram Auto-Alert Error]:', e.message));

    return updatedTransfer;
  });
};

/**
 * Reject Transfer
 */
export const rejectTransfer = async (transferId, userId, reason = 'Rejected by manager') => {
  return await runTransaction(async (client) => {
    const tRes = await client.query('SELECT * FROM transfers WHERE id = $1 FOR UPDATE', [transferId]);
    if (tRes.rows.length === 0) throw new Error('Transfer not found');
    const transfer = tRes.rows[0];

    if (['DISPATCHED', 'RECEIVED'].includes(transfer.status)) {
      throw new Error(`Cannot cancel transfer in '${transfer.status}' status.`);
    }

    const previousStatus = transfer.status;

    // Release reserved inventory if was approved/picked/packed
    if (['APPROVED', 'PICKED', 'PACKED'].includes(previousStatus)) {
      await client.query(
        `UPDATE inventory 
         SET reserved_quantity = GREATEST(0, reserved_quantity - $1), updated_at = NOW()
         WHERE product_id = $2 AND warehouse_id = $3 AND location_type = 'WAREHOUSE'`,
        [transfer.quantity, transfer.product_id, transfer.source_warehouse_id]
      );
    }

    const updatedRes = await client.query(
      `UPDATE transfers SET status = 'CANCELLED', updated_at = NOW() WHERE id = $1 RETURNING *`,
      [transferId]
    );

    await client.query(
      `INSERT INTO approval_events (transfer_id, user_id, action, previous_value, new_value, reason)
       VALUES ($1, $2, 'REJECTED', $3, $4, $5)`,
      [transferId, userId, JSON.stringify({ status: previousStatus }), JSON.stringify({ status: 'CANCELLED' }), reason]
    );

    return updatedRes.rows[0];
  });
};

/**
 * Mark Picked
 */
export const markTransferPicked = async (transferId, userId, notes = '') => {
  return await runTransaction(async (client) => {
    const tRes = await client.query('SELECT * FROM transfers WHERE id = $1 FOR UPDATE', [transferId]);
    if (tRes.rows.length === 0) throw new Error('Transfer not found');
    const transfer = tRes.rows[0];

    if (transfer.status !== 'APPROVED') {
      throw new Error(`Cannot mark as picked. Current status is '${transfer.status}'. Must be 'APPROVED'.`);
    }

    const newNotes = notes ? (transfer.notes ? `${transfer.notes}; Pick note: ${notes}` : `Pick note: ${notes}`) : transfer.notes;

    const updatedRes = await client.query(
      `UPDATE transfers SET status = 'PICKED', notes = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [newNotes, transferId]
    );

    await client.query(
      `INSERT INTO approval_events (transfer_id, user_id, action, previous_value, new_value, reason)
       VALUES ($1, $2, 'PICKED', $3, $4, $5)`,
      [transferId, userId, JSON.stringify({ status: 'APPROVED' }), JSON.stringify({ status: 'PICKED' }), notes || 'Stock picked from warehouse shelves']
    );

    return updatedRes.rows[0];
  });
};

/**
 * Mark Packed
 */
export const markTransferPacked = async (transferId, userId, notes = '') => {
  return await runTransaction(async (client) => {
    const tRes = await client.query('SELECT * FROM transfers WHERE id = $1 FOR UPDATE', [transferId]);
    if (tRes.rows.length === 0) throw new Error('Transfer not found');
    const transfer = tRes.rows[0];

    if (transfer.status !== 'PICKED') {
      throw new Error(`Cannot mark as packed. Current status is '${transfer.status}'. Must be 'PICKED'.`);
    }

    const newNotes = notes ? (transfer.notes ? `${transfer.notes}; Pack note: ${notes}` : `Pack note: ${notes}`) : transfer.notes;

    const updatedRes = await client.query(
      `UPDATE transfers SET status = 'PACKED', notes = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [newNotes, transferId]
    );

    await client.query(
      `INSERT INTO approval_events (transfer_id, user_id, action, previous_value, new_value, reason)
       VALUES ($1, $2, 'PACKED', $3, $4, $5)`,
      [transferId, userId, JSON.stringify({ status: 'PICKED' }), JSON.stringify({ status: 'PACKED' }), notes || 'Items packaged and verified for dispatch']
    );

    return updatedRes.rows[0];
  });
};

/**
 * Dispatch Transfer — physically deducts stock from warehouse & batch
 */
export const markTransferDispatched = async (transferId, userId, { carrier = 'Internal Logistics', vehicleNumber = '', notes = '' } = {}) => {
  return await runTransaction(async (client) => {
    const tRes = await client.query('SELECT * FROM transfers WHERE id = $1 FOR UPDATE', [transferId]);
    if (tRes.rows.length === 0) throw new Error('Transfer not found');
    const transfer = tRes.rows[0];

    if (!['PICKED', 'PACKED'].includes(transfer.status)) {
      throw new Error(`Cannot dispatch transfer. Current status is '${transfer.status}'. Must be 'PICKED' or 'PACKED'.`);
    }

    // Deduct quantity and reserved_quantity from source warehouse inventory
    await client.query(
      `UPDATE inventory 
       SET quantity = GREATEST(0, quantity - $1),
           reserved_quantity = GREATEST(0, reserved_quantity - $1),
           updated_at = NOW()
       WHERE product_id = $2 AND warehouse_id = $3 AND location_type = 'WAREHOUSE'`,
      [transfer.quantity, transfer.product_id, transfer.source_warehouse_id]
    );

    // Deduct from batch if specified
    if (transfer.batch_id) {
      await client.query(
        `UPDATE batches 
         SET quantity = GREATEST(0, quantity - $1), updated_at = NOW()
         WHERE id = $2`,
        [transfer.quantity, transfer.batch_id]
      );
    }

    const previousStatus = transfer.status;
    const newNotes = notes ? (transfer.notes ? `${transfer.notes}; Dispatch note: ${notes}` : `Dispatch note: ${notes}`) : transfer.notes;

    const updatedRes = await client.query(
      `UPDATE transfers 
       SET status = 'DISPATCHED', dispatched_at = NOW(), carrier = $1, vehicle_number = $2, notes = $3, updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [carrier, vehicleNumber, newNotes, transferId]
    );

    await client.query(
      `INSERT INTO approval_events (transfer_id, user_id, action, previous_value, new_value, reason)
       VALUES ($1, $2, 'DISPATCHED', $3, $4, $5)`,
      [
        transferId,
        userId,
        JSON.stringify({ status: previousStatus }),
        JSON.stringify({ status: 'DISPATCHED', carrier, vehicleNumber }),
        `Dispatched via ${carrier} (${vehicleNumber || 'Standard'}). ${notes}`,
      ]
    );

    // Notify Destination Store
    if (transfer.destination_type === 'STORE') {
      await client.query(
        `INSERT INTO notifications (role, store_id, title, message, type, link)
         VALUES ('STORE_MANAGER', $1, 'Inbound Shipment Dispatched', $2, 'INFO', '/store/incoming')`,
        [transfer.destination_id, `Shipment ${transfer.transfer_number} (${transfer.quantity} units) has departed the warehouse.`]
      );
    }

    // Automatic Telegram broadcast
    broadcastTelegramAlert({
      title: `Shipment In Transit: ${transfer.transfer_number}`,
      message: `🚚 *Shipment Dispatched*\nTransfer ${transfer.transfer_number} with ${transfer.quantity} units is in transit via ${carrier} (${vehicleNumber || 'Standard'}).`,
      severity: 'INFO',
      link: 'http://localhost:5173/store/incoming',
    }).catch(e => console.warn('[Telegram Auto-Alert Error]:', e.message));

    return updatedRes.rows[0];
  });
};

/**
 * Receive Stock — increases store inventory and transfers batch record
 */
export const receiveTransfer = async (transferId, userId, notes = '') => {
  return await runTransaction(async (client) => {
    const tRes = await client.query('SELECT * FROM transfers WHERE id = $1 FOR UPDATE', [transferId]);
    if (tRes.rows.length === 0) throw new Error('Transfer not found');
    const transfer = tRes.rows[0];

    if (transfer.status !== 'DISPATCHED') {
      throw new Error(`Cannot receive transfer. Current status is '${transfer.status}'. Must be 'DISPATCHED'.`);
    }

    // 1. Upsert store inventory
    const storeInvRes = await client.query(
      `SELECT id, quantity FROM inventory 
       WHERE product_id = $1 AND store_id = $2 AND location_type = 'STORE'
       FOR UPDATE`,
      [transfer.product_id, transfer.destination_id]
    );

    if (storeInvRes.rows.length === 0) {
      await client.query(
        `INSERT INTO inventory (product_id, store_id, location_type, quantity, reserved_quantity)
         VALUES ($1, $2, 'STORE', $3, 0)`,
        [transfer.product_id, transfer.destination_id, transfer.quantity]
      );
    } else {
      await client.query(
        `UPDATE inventory 
         SET quantity = quantity + $1, updated_at = NOW()
         WHERE id = $2`,
        [transfer.quantity, storeInvRes.rows[0].id]
      );
    }

    // 2. Upsert batch record in destination store if batch was specified
    if (transfer.batch_id) {
      const srcBatchRes = await client.query('SELECT * FROM batches WHERE id = $1', [transfer.batch_id]);
      if (srcBatchRes.rows.length > 0) {
        const srcBatch = srcBatchRes.rows[0];
        const storeBatchRes = await client.query(
          `SELECT id FROM batches WHERE product_id = $1 AND store_id = $2 AND batch_number = $3`,
          [srcBatch.product_id, transfer.destination_id, srcBatch.batch_number]
        );

        if (storeBatchRes.rows.length > 0) {
          await client.query(
            `UPDATE batches SET quantity = quantity + $1, updated_at = NOW() WHERE id = $2`,
            [transfer.quantity, storeBatchRes.rows[0].id]
          );
        } else {
          await client.query(
            `INSERT INTO batches (product_id, store_id, batch_number, quantity, manufacturing_date, expiry_date)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [srcBatch.product_id, transfer.destination_id, srcBatch.batch_number, transfer.quantity, srcBatch.manufacturing_date, srcBatch.expiry_date]
          );
        }
      }
    }

    const newNotes = notes ? (transfer.notes ? `${transfer.notes}; Receipt note: ${notes}` : `Receipt note: ${notes}`) : transfer.notes;

    const updatedRes = await client.query(
      `UPDATE transfers 
       SET status = 'RECEIVED', received_at = NOW(), notes = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [newNotes, transferId]
    );

    await client.query(
      `INSERT INTO approval_events (transfer_id, user_id, action, previous_value, new_value, reason)
       VALUES ($1, $2, 'RECEIVED', $3, $4, $5)`,
      [
        transferId,
        userId,
        JSON.stringify({ status: 'DISPATCHED' }),
        JSON.stringify({ status: 'RECEIVED' }),
        notes || 'Stock received and inspected at store',
      ]
    );

    // Notify Manager
    await client.query(
      `INSERT INTO notifications (role, title, message, type, link)
       VALUES ('DISTRIBUTION_MANAGER', 'Transfer Completed', $1, 'SUCCESS', '/manager/transfers')`,
      [`Transfer ${transfer.transfer_number} successfully received at destination store.`]
    );

    // Automatic Telegram broadcast
    broadcastTelegramAlert({
      title: `Delivery Confirmed: ${transfer.transfer_number}`,
      message: `📦 *Delivery Received*\nTransfer ${transfer.transfer_number} with ${transfer.quantity} units safely verified and stocked into store inventory.`,
      severity: 'INFO',
      link: 'http://localhost:5173/store/inventory',
    }).catch(e => console.warn('[Telegram Auto-Alert Error]:', e.message));

    return updatedRes.rows[0];
  });
};

/**
 * Creates and auto-approves a transfer from an AI Recommendation (atomic transaction)
 */
export const createAndApproveTransferFromRecommendation = async ({
  recommendationId,
  productId,
  sourceWarehouseId,
  destinationStoreId,
  quantity,
  batchId,
  userId,
  reason,
  wasEdited = false,
  originalQuantity = null
}) => {
  return await runTransaction(async (client) => {
    // 1. Check stock
    const invRes = await client.query(
      `SELECT id, quantity, reserved_quantity 
       FROM inventory 
       WHERE product_id = $1 AND warehouse_id = $2 AND location_type = 'WAREHOUSE'
       FOR UPDATE`,
      [productId, sourceWarehouseId]
    );

    const inv = invRes.rows[0];
    const available = inv ? (inv.quantity - inv.reserved_quantity) : 0;

    if (!inv || available < quantity) {
      throw new Error(`Insufficient available stock in warehouse (${available} units) for transfer of ${quantity} units.`);
    }

    // 2. Reserve stock immediately
    await client.query(
      `UPDATE inventory 
       SET reserved_quantity = reserved_quantity + $1, updated_at = NOW()
       WHERE id = $2`,
      [quantity, inv.id]
    );

    // 3. Create transfer in APPROVED status
    const transferNumber = await generateTransferNumber(client);
    const transferRes = await client.query(
      `INSERT INTO transfers 
        (transfer_number, product_id, source_warehouse_id, destination_type, destination_id, quantity, batch_id, status, notes, created_by, approved_by)
       VALUES ($1, $2, $3, 'STORE', $4, $5, $6, 'APPROVED', $7, $8, $8)
       RETURNING *`,
      [
        transferNumber,
        productId,
        sourceWarehouseId,
        destinationStoreId,
        quantity,
        batchId,
        `AI Optimization Recommendation: ${reason}`,
        userId
      ]
    );
    const transfer = transferRes.rows[0];

    // 4. Update AI recommendation record
    await client.query(
      `UPDATE ai_recommendations 
       SET status = $1, approved_transfer_id = $2, updated_at = NOW()
       WHERE id = $3`,
      [wasEdited ? 'EDITED' : 'APPROVED', transfer.id, recommendationId]
    );

    // 5. Store Manager Feedback
    await client.query(
      `INSERT INTO manager_feedback 
        (recommendation_id, user_id, decision, original_quantity, edited_quantity, reason)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        recommendationId,
        userId,
        wasEdited ? 'EDITED' : 'ACCEPTED',
        originalQuantity || quantity,
        wasEdited ? quantity : null,
        reason
      ]
    );

    // 6. Log Approval Event
    await client.query(
      `INSERT INTO approval_events (transfer_id, user_id, action, previous_value, new_value, reason)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        transfer.id,
        userId,
        wasEdited ? 'EDITED' : 'APPROVED',
        JSON.stringify({ recommendationStatus: 'PENDING', originalQuantity: originalQuantity || quantity }),
        JSON.stringify({ recommendationStatus: wasEdited ? 'EDITED' : 'APPROVED', transferNumber: transfer.transfer_number, quantity }),
        `Recommendation ${wasEdited ? 'edited and approved' : 'approved'} by manager: ${reason}`,
      ]
    );

    // 7. Notify Warehouse
    await client.query(
      `INSERT INTO notifications (role, warehouse_id, title, message, type, link)
       VALUES ('WAREHOUSE', $1, 'AI Transfer Approved for Picking', $2, 'ACTION_REQUIRED', '/warehouse/pick-list')`,
      [sourceWarehouseId, `Transfer ${transferNumber} approved for ${quantity} units. Ready for pick list.`]
    );

    return transfer;
  });
};
