import mongoose from 'mongoose';

/**
 * DataImport — tracks every CSV file imported into the system.
 * Records who imported it, what dataset type, row outcomes, and timestamp.
 * The Manager can see import history and data-freshness warnings from this model.
 */
const dataImportSchema = new mongoose.Schema(
  {
    datasetType: {
      type: String,
      enum: ['SALES', 'INVENTORY', 'PRODUCTS', 'LOCATIONS', 'BATCHES'],
      required: [true, 'Dataset type is required'],
      index: true,
    },
    filename: {
      type: String,
      required: [true, 'Original filename is required'],
      trim: true,
    },
    importedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // Row outcome counts
    totalRows: { type: Number, default: 0 },
    validRows: { type: Number, default: 0 },
    importedRows: { type: Number, default: 0 },
    failedRows: { type: Number, default: 0 },
    warningRows: { type: Number, default: 0 },

    // Row-level validation results for the preview/result page
    rowResults: [
      {
        rowNumber: Number,
        status: { type: String, enum: ['OK', 'WARNING', 'ERROR'] },
        message: String,
        data: mongoose.Schema.Types.Mixed,
      },
    ],

    // Column mapping used (original CSV header → StockWise field)
    columnMapping: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    status: {
      type: String,
      enum: ['PENDING', 'VALIDATED', 'IMPORTED', 'FAILED', 'PARTIAL'],
      default: 'PENDING',
      index: true,
    },

    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

export const DataImport = mongoose.model('DataImport', dataImportSchema);
