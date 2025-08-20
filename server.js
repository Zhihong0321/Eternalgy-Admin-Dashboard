import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient, Prisma } from '@prisma/client';

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

// Custom middleware to handle JS and CSS files explicitly
app.use('/assets', (req, res, next) => {
  const filePath = path.join(__dirname, 'frontend', 'dist', 'assets', req.path);
  const ext = path.extname(req.path).toLowerCase();
  
  if (ext === '.js') {
    res.setHeader('Content-Type', 'application/javascript');
    return res.sendFile(filePath);
  } else if (ext === '.css') {
    res.setHeader('Content-Type', 'text/css');
    return res.sendFile(filePath);
  }
  
  next();
});

// Serve static files with proper MIME types
app.use(express.static(path.join(__dirname, 'frontend', 'dist'), {
  index: false,
  setHeaders: (res, filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
      case '.js':
        res.setHeader('Content-Type', 'application/javascript');
        break;
      case '.css':
        res.setHeader('Content-Type', 'text/css');
        break;
      case '.svg':
        res.setHeader('Content-Type', 'image/svg+xml');
        break;
      case '.png':
        res.setHeader('Content-Type', 'image/png');
        break;
      case '.ico':
        res.setHeader('Content-Type', 'image/x-icon');
        break;
    }
  }
}));

// =====================
// SPA FALLBACK
// =====================

app.get('*', (req, res) => {
  // Never serve HTML for these paths
  if (req.path.startsWith('/api/') || 
      req.path.startsWith('/assets/') ||
      req.path.endsWith('.js') ||
      req.path.endsWith('.css') ||
      req.path.endsWith('.map')) {
    return res.status(404).send('Not found');
  }
  
  res.sendFile(path.join(__dirname, 'frontend', 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;