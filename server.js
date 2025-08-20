import express from 'express';
import dotenv from 'dotenv';
import databaseRoutes from './routes/database.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS for local development
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'Eternalgy Admin Dashboard API',
    version: '2.0',
    endpoints: {
      health: '/api/db/health',
      dataTypes: '/api/db/data-types',
      records: '/api/db/records/:dataType',
      record: '/api/db/record/:bubbleId',
      query: '/api/db/query',
      adminUsers: '/api/db/admin-users',
      settings: '/api/db/settings',
      activityLogs: '/api/db/activity-logs'
    }
  });
});

// Database API routes
app.use('/api/db', databaseRoutes);

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    message: error.message 
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Eternalgy Admin Dashboard API running on port ${PORT}`);
  console.log(`📊 Database API available at /api/db/*`);
});

export default app;