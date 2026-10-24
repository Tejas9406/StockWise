import mongoose from 'mongoose';

const warehouseSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Warehouse name is required'],
      trim: true,
    },
    code: {
      type: String,
      required: [true, 'Warehouse code is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    location: {
      type: String,
      required: [true, 'Location region/city is required'],
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    capacity: {
      type: Number,
      default: 10000,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Warehouse = mongoose.model('Warehouse', warehouseSchema);
