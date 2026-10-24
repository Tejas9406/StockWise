import mongoose from 'mongoose';

const transferSchema = new mongoose.Schema(
  {
    transferNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product is required for transfer'],
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
      refPath: 'destinationModel',
      required: [true, 'Destination is required'],
      index: true,
    },
    destinationModel: {
      type: String,
      required: true,
      enum: ['Store', 'Warehouse'],
      default: 'Store',
    },
    quantity: {
      type: Number,
      required: [true, 'Transfer quantity is required'],
      min: [1, 'Quantity must be at least 1'],
    },
    batchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Batch',
      default: null,
    },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'PICKED', 'PACKED', 'DISPATCHED', 'RECEIVED', 'CANCELLED'],
      default: 'PENDING',
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    dispatchedAt: {
      type: Date,
      default: null,
    },
    receivedAt: {
      type: Date,
      default: null,
    },
    carrier: {
      type: String,
      default: '',
    },
    vehicleNumber: {
      type: String,
      default: '',
    },
    notes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

transferSchema.index({ status: 1, sourceWarehouseId: 1 });
transferSchema.index({ status: 1, destinationId: 1 });

export const Transfer = mongoose.model('Transfer', transferSchema);
