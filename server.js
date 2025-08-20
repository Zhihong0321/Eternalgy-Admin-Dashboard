import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// API routes FIRST (before static files)
app.get('/api/health', (req, res) => {
  res.json({ message: 'Eternalgy Admin Dashboard API', status: 'success' });
});

app.get('/api/records/:table', (req, res) => {
  const { table } = req.params;
  const { limit = 50 } = req.query;
  
  // Mock data for now - replace with actual database query later
  const mockRecords = [
    { id: 1, name: 'Sample Record 1', table: table, created_at: '2024-01-01' },
    { id: 2, name: 'Sample Record 2', table: table, created_at: '2024-01-02' },
    { id: 3, name: 'Sample Record 3', table: table, created_at: '2024-01-03' }
  ];
  
  res.json({ 
    table: table,
    records: mockRecords.slice(0, parseInt(limit)),
    total: mockRecords.length
  });
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