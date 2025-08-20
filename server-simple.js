import express from 'express';

const app = express();
const PORT = process.env.PORT || 3001;

// Basic health check without database
app.get('/', (req, res) => {
  res.json({ 
    message: 'Eternalgy Admin Dashboard API - Basic Test',
    version: '2.0',
    timestamp: new Date().toISOString(),
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT,
      DATABASE_URL: process.env.DATABASE_URL ? 'Set' : 'Not Set'
    }
  });
});

// Simple health endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`Database URL: ${process.env.DATABASE_URL ? 'Set' : 'Not Set'}`);
});

export default app;