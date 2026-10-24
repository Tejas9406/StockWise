import mongoose from 'mongoose';

const salesRecordSchema = new mongoose.Schema(
  {
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Store',
      required: [true, 'Store reference is required'],
      index: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product reference is required'],
      index: true,
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    quantity: {
      type: Number,
      required: [true, 'Sales quantity is required'],
      min: [1, 'Quantity sold must be at least 1'],
    },
    revenue: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

salesRecordSchema.index({ storeId: 1, productId: 1, date: -1 });

export const SalesRecord = mongoose.model('SalesRecord', salesRecordSchema);
