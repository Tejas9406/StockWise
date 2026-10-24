import mongoose from 'mongoose';

const inventorySchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product reference is required'],
      index: true,
    },
    locationType: {
      type: String,
      enum: ['WAREHOUSE', 'STORE'],
      required: true,
      index: true,
    },
    warehouseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
      default: null,
      index: true,
    },
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Store',
      default: null,
      index: true,
    },
    quantity: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Quantity cannot be negative'],
    },
    reservedQuantity: {
      type: Number,
      default: 0,
      min: [0, 'Reserved quantity cannot be negative'],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

inventorySchema.virtual('availableQuantity').get(function () {
  return Math.max(0, (this.quantity || 0) - (this.reservedQuantity || 0));
});

// Ensure a unique inventory record per product per warehouse or store
inventorySchema.index(
  { productId: 1, warehouseId: 1 },
  { unique: true, partialFilterExpression: { warehouseId: { $type: 'objectId' } } }
);

inventorySchema.index(
  { productId: 1, storeId: 1 },
  { unique: true, partialFilterExpression: { storeId: { $type: 'objectId' } } }
);

export const Inventory = mongoose.model('Inventory', inventorySchema);
