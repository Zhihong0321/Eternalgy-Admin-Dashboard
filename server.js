import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const prisma = new PrismaClient();

// API routes FIRST (before static files)
app.get('/api/health', (req, res) => {
  res.json({ message: 'Eternalgy Admin Dashboard API', status: 'success' });
});

// Database status check
app.get('/api/db-status', async (req, res) => {
  try {
    // Try to query synced_records to see if table exists
    const count = await prisma.synced_records.count();
    res.json({ 
      status: 'connected',
      tables: { synced_records: 'exists' },
      record_count: count
    });
  } catch (error) {
    res.json({ 
      status: 'error',
      message: error.message,
      note: 'Tables may not exist yet - check database setup'
    });
  }
});

app.get('/api/records/:table', async (req, res) => {
  try {
    const { table } = req.params;
    const { limit = 50 } = req.query;
    
    // Get real data from synced_records table filtered by data_type
    const records = await prisma.synced_records.findMany({
      where: { data_type: table },
      take: parseInt(limit),
      orderBy: { synced_at: 'desc' }
    });
    
    const total = await prisma.synced_records.count({
      where: { data_type: table }
    });
    
    res.json({ 
      table: table,
      records: records,
      total: total
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Database error', 
      message: error.message 
    });
  }
});

// Serve static files from frontend/dist
app.use(express.static(path.join(__dirname, 'frontend', 'dist')));

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;