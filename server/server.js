import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import morgan from 'morgan';
import { connectDB } from './config/db.js';

// Route imports
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import warehouseRoutes from './routes/warehouseRoutes.js';
import storeRoutes from './routes/storeRoutes.js';
import productRoutes from './routes/productRoutes.js';
import inventoryRoutes from './routes/inventoryRoutes.js';
import batchRoutes from './routes/batchRoutes.js';
import salesRoutes from './routes/salesRoutes.js';
import transferRoutes from './routes/transferRoutes.js';
import recommendationRoutes from './routes/recommendationRoutes.js';
import managerRoutes from './routes/managerRoutes.js';
import warehousePanelRoutes from './routes/warehousePanelRoutes.js';
import storePanelRoutes from './routes/storePanelRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import importRoutes from './routes/importRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import automationRoutes from './routes/automationRoutes.js';
import { startAutomationDaemon } from './services/automationService.js';

import { notFound, errorHandler } from './middleware/errorMiddleware.js';

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();

// Connect to PostgreSQL Operational Database
connectDB();

// Middleware
const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
const allowedOrigins = [
  clientUrl,
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://localhost:3000',
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || origin.startsWith('http://localhost:')) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'StockWise Backend API Gateway',
    phase: 'Phase 2 - AIML Intelligence + Optimization + Firebase Auth + PostgreSQL',
    database: 'PostgreSQL (Neon Cloud Operational Database)',
    auth: 'Firebase Authentication & Admin SDK',
  });
});

// Mount modular API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/warehouses', warehouseRoutes);
app.use('/api/stores', storeRoutes);
app.use('/api/products', productRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/batches', batchRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/transfers', transferRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/manager', managerRoutes);
app.use('/api/warehouse', warehousePanelRoutes);
app.use('/api/store', storePanelRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/import', importRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/automation', automationRoutes);

// Error Handling Middleware
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`StockWise Phase 2 Backend Server running on port ${PORT}`);
    console.log(`Database: PostgreSQL (Neon Cloud Operational DB)`);
    console.log(`Authentication: Firebase Auth + Admin SDK Token Verification`);
    console.log(`AIML Microservice: Connected via FastAPI Gateway`);
    console.log(`Automation: Multi-Channel Expiry Daemon (Email & WhatsApp) Active`);
    console.log(`=======================================================`);
    startAutomationDaemon();
  });
}

export default app;
