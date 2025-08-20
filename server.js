import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient, Prisma } from '@prisma/client';

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
    
    // Query the table directly using raw SQL since we don't know the schema
    const records = await prisma.$queryRaw`
      SELECT * FROM ${Prisma.raw(table)} 
      ORDER BY created_at DESC NULLS LAST
      LIMIT ${parseInt(limit)}
    `;
    
    const totalResult = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM ${Prisma.raw(table)}
    `;
    
    res.json({ 
      table: table,
      records: records,
      total: parseInt(totalResult[0].count)
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