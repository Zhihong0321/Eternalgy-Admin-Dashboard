import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient, Prisma } from '@prisma/client';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const prisma = new PrismaClient();

// Middleware
app.use(express.json());

// =====================
// API ROUTES FIRST
// =====================

app.get('/api/health', (req, res) => {
  res.json({ message: 'Eternalgy Admin Dashboard API', status: 'success' });
});

// Debug route to check files and paths
app.get('/api/debug/files', (req, res) => {
  
  const debugInfo = {
    __dirname,
    process_cwd: process.cwd(),
    node_env: process.env.NODE_ENV,
  };
  
  // Check multiple possible paths
  const possiblePaths = [
    path.join(__dirname, 'frontend', 'dist', 'assets'),
    path.join(__dirname, 'frontend', 'dist'),
    path.join(__dirname, 'dist', 'assets'),
    path.join(__dirname, 'dist'),
    path.join(process.cwd(), 'frontend', 'dist', 'assets'),
    path.join(process.cwd(), 'frontend', 'dist'),
    path.join(process.cwd(), 'dist', 'assets'),
    path.join(process.cwd(), 'dist'),
  ];
  
  debugInfo.pathChecks = {};
  
  possiblePaths.forEach(checkPath => {
    try {
      const exists = fs.existsSync(checkPath);
      debugInfo.pathChecks[checkPath] = {
        exists,
        files: exists ? fs.readdirSync(checkPath) : null
      };
    } catch (error) {
      debugInfo.pathChecks[checkPath] = {
        exists: false,
        error: error.message
      };
    }
  });
  
  // Also check root directory contents
  try {
    debugInfo.rootFiles = fs.readdirSync(__dirname);
  } catch (error) {
    debugInfo.rootFiles = `Error: ${error.message}`;
  }
  
  res.json(debugInfo);
});

app.get('/api/db-status', async (req, res) => {
  try {
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
    
    const records = await prisma.$queryRaw`
      SELECT * FROM ${Prisma.raw(table)} 
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

app.get('/api/invoices/fully-paid', async (req, res) => {
  try {
    const { limit = 100, offset = 0 } = req.query;
    
    const paidInvoices = await prisma.$queryRaw`
      SELECT i.*, c.name as customer_name
      FROM invoice i
      LEFT JOIN customer c ON i.linked_customer = c.bubble_id
      WHERE i.paid_ = true
      ORDER BY i.full_payment_date DESC NULLS LAST, i.created_date DESC
      LIMIT ${parseInt(limit)}
      OFFSET ${parseInt(offset)}
    `;
    
    const totalResult = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM invoice WHERE paid_ = true
    `;
    
    res.json({ 
      invoices: paidInvoices,
      total: parseInt(totalResult[0].count)
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Database error', 
      message: error.message 
    });
  }
});

app.post('/api/invoices/rescan-payments', async (req, res) => {
  try {
    const unpaidInvoices = await prisma.$queryRaw`
      SELECT i.bubble_id, i.amount, i.linked_payment
      FROM invoice i
      WHERE i.paid_ != true OR i.paid_ IS NULL
    `;

    let updatedCount = 0;
    const errors = [];

    for (const invoice of unpaidInvoices) {
      try {
        if (!invoice.linked_payment || invoice.linked_payment.length === 0) {
          continue;
        }

        const paymentIds = invoice.linked_payment;
        
        const paymentSumResult = await prisma.$queryRaw`
          SELECT COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as total_paid
          FROM payment 
          WHERE bubble_id IN (${Prisma.join(paymentIds)})
        `;

        const totalPaid = parseFloat(paymentSumResult[0]?.total_paid || 0);
        const invoiceAmount = parseFloat(invoice.amount || 0);

        if (totalPaid >= invoiceAmount && invoiceAmount > 0) {
          await prisma.$executeRaw`
            UPDATE invoice 
            SET paid_ = true, full_payment_date = COALESCE(full_payment_date, NOW())
            WHERE bubble_id = ${invoice.bubble_id}
          `;
          updatedCount++;
        }
      } catch (invoiceError) {
        errors.push({
          invoice_id: invoice.bubble_id,
          error: invoiceError.message
        });
      }
    }

    res.json({ 
      message: 'Rescan completed',
      updated_invoices: updatedCount,
      total_checked: unpaidInvoices.length,
      errors: errors
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Rescan failed', 
      message: error.message 
    });
  }
});

// =====================
// STATIC FILE SERVING
// =====================

// Serve assets directory with explicit static middleware
app.use('/assets', express.static(path.join(__dirname, 'frontend', 'dist', 'assets'), {
  setHeaders: (res, filePath) => {
    console.log(`Serving asset: ${filePath}`);
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.js') {
      res.setHeader('Content-Type', 'application/javascript');
      console.log('Set Content-Type to application/javascript');
    } else if (ext === '.css') {
      res.setHeader('Content-Type', 'text/css');
      console.log('Set Content-Type to text/css');
    }
  }
}));

// Serve root static files (favicon, etc.) - NOT assets
app.use(express.static(path.join(__dirname, 'frontend', 'dist'), {
  index: false, // Don't serve index.html automatically
  setHeaders: (res, filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.svg') res.setHeader('Content-Type', 'image/svg+xml');
    if (ext === '.png') res.setHeader('Content-Type', 'image/png');
    if (ext === '.ico') res.setHeader('Content-Type', 'image/x-icon');
  }
}));

// =====================
// SPA FALLBACK
// =====================

app.get('*', (req, res) => {
  console.log(`Catch-all route hit: ${req.path}`);
  
  // Never serve HTML for these paths
  if (req.path.startsWith('/api/') || 
      req.path.startsWith('/assets/') ||
      req.path.endsWith('.js') ||
      req.path.endsWith('.css') ||
      req.path.endsWith('.map')) {
    console.log(`Returning 404 for: ${req.path}`);
    return res.status(404).send('Asset not found');
  }
  
  console.log(`Serving index.html for: ${req.path}`);
  res.sendFile(path.join(__dirname, 'frontend', 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`__dirname: ${__dirname}`);
  console.log(`process.cwd(): ${process.cwd()}`);
  console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
  
  // Log directory contents on startup
  try {
    console.log(`Root directory contents:`, fs.readdirSync(__dirname));
    
    const frontendPath = path.join(__dirname, 'frontend');
    if (fs.existsSync(frontendPath)) {
      console.log(`Frontend directory exists, contents:`, fs.readdirSync(frontendPath));
      
      const distPath = path.join(frontendPath, 'dist');
      if (fs.existsSync(distPath)) {
        console.log(`Dist directory exists, contents:`, fs.readdirSync(distPath));
        
        const assetsPath = path.join(distPath, 'assets');
        if (fs.existsSync(assetsPath)) {
          console.log(`Assets directory exists, contents:`, fs.readdirSync(assetsPath));
        } else {
          console.log(`Assets directory does NOT exist at: ${assetsPath}`);
        }
      } else {
        console.log(`Dist directory does NOT exist at: ${distPath}`);
      }
    } else {
      console.log(`Frontend directory does NOT exist at: ${frontendPath}`);
    }
  } catch (error) {
    console.log(`Error checking directories:`, error.message);
  }
});

export default app;