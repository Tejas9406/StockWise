import mongoose from 'mongoose';

const approvalEventSchema = new mongoose.Schema(
  {
    transferId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transfer',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      enum: ['CREATED', 'APPROVED', 'REJECTED', 'EDITED', 'PICKED', 'PACKED', 'DISPATCHED', 'RECEIVED', 'CANCELLED'],
    },
    previousValue: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    newValue: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    reason: {
      type: String,
      default: '',
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false,
  }
);

export const ApprovalEvent = mongoose.model('ApprovalEvent', approvalEventSchema);
