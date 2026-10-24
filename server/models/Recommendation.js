import mongoose from 'mongoose';

const recommendationSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product reference is required'],
      index: true,
    },
    sourceWarehouseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
      required: [true, 'Source warehouse is required'],
      index: true,
    },
    destinationType: {
      type: String,
      enum: ['STORE', 'WAREHOUSE'],
      default: 'STORE',
    },
    destinationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Store',
      required: [true, 'Destination store is required'],
      index: true,
    },
    quantity: {
      type: Number,
      required: [true, 'Recommended quantity is required'],
      min: [1, 'Quantity must be at least 1'],
    },
    batchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Batch',
      default: null,
    },
    transportCost: {
      type: Number,
      default: 0,
    },
    expectedDemand: {
      type: Number,
      default: 0,
    },
    reason: {
      type: String,
      required: [true, 'Recommendation rationale is required'],
    },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED', 'EDITED'],
      default: 'PENDING',
      index: true,
    },
    approvedTransferId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transfer',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export const Recommendation = mongoose.model('Recommendation', recommendationSchema);
