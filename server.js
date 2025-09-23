import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient, Prisma } from '@prisma/client';
import fs from 'fs';
import cron from 'node-cron';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const prisma = new PrismaClient();

// Initialize commission tables if they don't exist
async function initializeCommissionTables() {
  try {
    console.log('[INIT] Checking commission tables...');

    // Check if commission_adjustment table exists
    const adjustmentTableExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'commission_adjustment'
      )
    `;

    if (!adjustmentTableExists[0].exists) {
      console.log('[INIT] Creating commission_adjustment table...');
      await prisma.$executeRaw`
        CREATE TABLE commission_adjustment (
          id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
          created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          agent_id TEXT NOT NULL,
          agent_name TEXT NOT NULL,
          amount DECIMAL(65,30) NOT NULL,
          description TEXT NOT NULL,
          created_by TEXT NOT NULL,
          report_id TEXT,
          adjustment_month TEXT
        )
      `;
    } else {
      console.log('[INIT] commission_adjustment table already exists');

      // Check if all required columns exist, add missing ones
      const columns = await prisma.$queryRaw`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'commission_adjustment' AND table_schema = 'public'
      `;

      const columnNames = columns.map(col => col.column_name);

      if (!columnNames.includes('created_at')) {
        console.log('[INIT] Adding missing created_at column...');
        await prisma.$executeRaw`ALTER TABLE commission_adjustment ADD COLUMN created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP`;
      }

      if (!columnNames.includes('updated_at')) {
        console.log('[INIT] Adding missing updated_at column...');
        await prisma.$executeRaw`ALTER TABLE commission_adjustment ADD COLUMN updated_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP`;
      }
    }

    // Check if generated_commission_report table exists
    const reportTableExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'generated_commission_report'
      )
    `;

    if (!reportTableExists[0].exists) {
      console.log('[INIT] Creating generated_commission_report table...');
      await prisma.$executeRaw`
        CREATE TABLE generated_commission_report (
          report_id TEXT PRIMARY KEY,
          agent_id TEXT NOT NULL,
          agent_name TEXT NOT NULL,
          month_period TEXT NOT NULL,
          total_basic_commission DECIMAL(65,30) NOT NULL,
          total_bonus_commission DECIMAL(65,30) NOT NULL,
          total_adjustments DECIMAL(65,30) NOT NULL,
          final_total_commission DECIMAL(65,30) NOT NULL,
          commission_paid BOOLEAN NOT NULL,
          invoice_bubble_ids JSONB NOT NULL,
          created_at TIMESTAMP(3) NOT NULL,
          created_by TEXT,
          paid_at TIMESTAMP(3),
          paid_by TEXT
        )
      `;
    } else {
      console.log('[INIT] generated_commission_report table already exists');
    }

    console.log('[INIT] ✅ Commission tables ready');
  } catch (error) {
    console.error('[INIT] ❌ Error creating commission tables:', error);
  }
}

// Initialize tables on startup
initializeCommissionTables();

// Middleware
app.use(express.json());

// =====================
// API ROUTES FIRST
// =====================

app.get('/api/health', (req, res) => {
  res.json({ message: 'Eternalgy Admin Dashboard API', status: 'success' });
});

// Debug route to get actual table schemas
app.get('/api/debug/schemas', async (req, res) => {
  try {
    console.log(`[DEBUG] Getting table schemas`);
    
    // Get invoice table structure
    const invoiceSchema = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'invoice' 
      ORDER BY ordinal_position
    `;
    
    // Get customer table structure (check both customer and customer_profile)
    const customerSchema = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'customer' 
      ORDER BY ordinal_position
    `;
    
    const customerProfileSchema = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'customer_profile' 
      ORDER BY ordinal_position
    `;
    
    // Get agent table structure
    const agentSchema = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'agent' 
      ORDER BY ordinal_position
    `;
    
    // Get payment table structure
    const paymentSchema = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'payment' 
      ORDER BY ordinal_position
    `;
    
    // Get sample data to understand field values
    const sampleInvoice = await prisma.$queryRaw`
      SELECT * FROM invoice WHERE paid = true LIMIT 1
    `;
    
    console.log(`[DEBUG] Invoice columns:`, invoiceSchema.length);
    console.log(`[DEBUG] Customer columns:`, customerSchema.length);
    console.log(`[DEBUG] Customer Profile columns:`, customerProfileSchema.length);
    console.log(`[DEBUG] Agent columns:`, agentSchema.length);
    console.log(`[DEBUG] Payment columns:`, paymentSchema.length);
    
    res.json({
      invoice: {
        schema: invoiceSchema,
        sample: sampleInvoice[0]
      },
      customer: {
        schema: customerSchema
      },
      customer_profile: {
        schema: customerProfileSchema
      },
      agent: {
        schema: agentSchema
      },
      payment: {
        schema: paymentSchema
      }
    });
  } catch (error) {
    console.log(`[ERROR] Schema debug error:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

// Safe schema discovery endpoint
app.get('/api/debug/safe-schemas', async (req, res) => {
  try {
    console.log(`[DEBUG] Getting safe table schemas`);
    
    // First get all tables
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;
    
    const schemas = {};
    
    // Get structure for each table
    for (const table of tables) {
      const tableName = table.table_name;
      
      const columns = await prisma.$queryRaw`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = ${tableName}
        ORDER BY ordinal_position
      `;
      
      schemas[tableName] = columns;
    }
    
    res.json({
      message: 'Schema discovery successful',
      tables: tables.map(t => t.table_name),
      schemas: schemas
    });
    
  } catch (error) {
    console.error('[ERROR] Safe schema discovery failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// Debug route to check paid invoices directly
app.get('/api/debug/paid-invoices', async (req, res) => {
  try {
    console.log(`[DEBUG] Direct paid invoices check started`);
    
    // Check total invoices
    const totalInvoices = await prisma.$queryRaw`SELECT COUNT(*) as count FROM invoice`;
    console.log(`[DEBUG] Total invoices in database:`, totalInvoices[0].count);
    
    // Check paid invoices with different queries
    const paidTrue = await prisma.$queryRaw`SELECT COUNT(*) as count FROM invoice WHERE paid = true`;
    const paidFalse = await prisma.$queryRaw`SELECT COUNT(*) as count FROM invoice WHERE paid = false`;
    const paidNull = await prisma.$queryRaw`SELECT COUNT(*) as count FROM invoice WHERE paid IS NULL`;
    
    console.log(`[DEBUG] Paid = true:`, paidTrue[0].count);
    console.log(`[DEBUG] Paid = false:`, paidFalse[0].count);
    console.log(`[DEBUG] Paid = null:`, paidNull[0].count);
    
    // Get sample of paid invoices
    const samplePaid = await prisma.$queryRaw`
      SELECT bubble_id, paid, amount, full_payment_date 
      FROM invoice 
      WHERE paid = true 
      LIMIT 5
    `;
    
    console.log(`[DEBUG] Sample paid invoices:`, samplePaid);
    
    res.json({
      totalInvoices: parseInt(totalInvoices[0].count),
      paidTrue: parseInt(paidTrue[0].count),
      paidFalse: parseInt(paidFalse[0].count), 
      paidNull: parseInt(paidNull[0].count),
      samplePaid: samplePaid
    });
  } catch (error) {
    console.log(`[ERROR] Debug paid invoices error:`, error.message);
    res.status(500).json({ error: error.message });
  }
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
    const { limit = 100, offset = 0, month, agent } = req.query;
    console.log(`[DEBUG] Fully-paid invoices request - limit: ${limit}, offset: ${offset}, month: ${month}, agent: ${agent}`);
    
    // Build dynamic WHERE clause for filters
    let whereConditions = ['i.paid = true'];
    let queryParams = [];
    
    // Add month filter if provided (format: "2025-07" for Jul, 2025)
    if (month && month !== 'all') {
      whereConditions.push(`DATE_TRUNC('month', i.full_payment_date) = DATE_TRUNC('month', $${queryParams.length + 1}::date)`);
      queryParams.push(`${month}-01`); // Convert "2025-07" to "2025-07-01"
    }
    
    // Add agent filter if provided
    if (agent && agent !== 'all') {
      whereConditions.push(`a.bubble_id = $${queryParams.length + 1}`);
      queryParams.push(agent);
    }
    
    const whereClause = whereConditions.join(' AND ');
    
    // Build the query string
    const queryText = `
      SELECT 
        i.invoice_id,
        i.bubble_id,
        i.amount,
        i.full_payment_date,
        i.linked_payment,
        array_length(i.linked_payment, 1) as payment_count,
        a.name as agent_name,
        a.bubble_id as agent_bubble_id,
        cp.name as customer_name
      FROM invoice i
      LEFT JOIN agent a ON i.linked_agent = a.bubble_id  
      LEFT JOIN customer_profile cp ON i.linked_customer = cp.bubble_id
      WHERE ${whereClause}
      ORDER BY i.invoice_id ASC
      LIMIT $${queryParams.length + 1}
      OFFSET $${queryParams.length + 2}
    `;
    
    queryParams.push(parseInt(limit), parseInt(offset));
    
    console.log(`[DEBUG] Query:`, queryText);
    console.log(`[DEBUG] Params:`, queryParams);
    
    const paidInvoices = await prisma.$queryRawUnsafe(queryText, ...queryParams);
    
    console.log(`[DEBUG] Paid invoices query result - count: ${paidInvoices.length}`);
    console.log(`[DEBUG] First 3 invoices:`, paidInvoices.slice(0, 3).map(inv => ({
      invoice_id: inv.invoice_id,
      amount: inv.amount,
      payment_count: inv.payment_count,
      agent_name: inv.agent_name,
      customer_name: inv.customer_name
    })));
    
    // Calculate payment sums for each invoice
    for (const invoice of paidInvoices) {
      if (invoice.linked_payment && invoice.linked_payment.length > 0) {
        try {
          const paymentSumResult = await prisma.$queryRaw`
            SELECT COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as total_payments
            FROM payment 
            WHERE bubble_id = ANY(${invoice.linked_payment})
          `;
          invoice.payment_sum = parseFloat(paymentSumResult[0]?.total_payments || 0);
        } catch (paymentError) {
          console.log(`[DEBUG] Payment sum calculation failed: ${paymentError.message}`);
          invoice.payment_sum = 0;
        }
      } else {
        invoice.payment_sum = 0;
      }
    }
    
    // Build count query with same filters
    const countQueryText = `
      SELECT COUNT(*) as count 
      FROM invoice i
      LEFT JOIN agent a ON i.linked_agent = a.bubble_id  
      WHERE ${whereClause}
    `;
    
    const totalResult = await prisma.$queryRawUnsafe(countQueryText, ...queryParams.slice(0, -2)); // Remove limit/offset params
    
    console.log(`[DEBUG] Total count query result:`, totalResult[0]);
    
    const response = { 
      invoices: paidInvoices,
      total: parseInt(totalResult[0].count)
    };
    
    console.log(`[DEBUG] API response summary - invoices: ${response.invoices.length}, total: ${response.total}`);
    
    res.json(response);
  } catch (error) {
    console.log(`[ERROR] Fully-paid invoices API error:`, error.message);
    res.status(500).json({ 
      error: 'Database error', 
      message: error.message 
    });
  }
});

// Get invoices where eligible commission amount is higher than invoice amount
app.get('/api/invoices/eligible-comm', async (req, res) => {
  try {
    const { limit = 100, offset = 0, agent } = req.query;
    console.log(`[DEBUG] Eligible Commission invoices request - limit: ${limit}, offset: ${offset}, agent: ${agent}`);
    
    // Build dynamic WHERE clause for filters
    let whereConditions = ['i.amount_eligible_for_comm > i.amount'];
    let queryParams = [];
    
    // Add agent filter if provided
    if (agent && agent !== 'all') {
      whereConditions.push(`a.bubble_id = $${queryParams.length + 1}`);
      queryParams.push(agent);
    }
    
    const whereClause = whereConditions.join(' AND ');
    
    // Build the query string
    const queryText = `
      SELECT 
        i.invoice_id,
        i.bubble_id,
        i.amount,
        i.amount_eligible_for_comm,
        i.eligible_amount_description,
        i.invoice_date,
        i.created_date,
        a.name as agent_name,
        a.bubble_id as agent_bubble_id,
        cp.name as customer_name
      FROM invoice i
      LEFT JOIN agent a ON i.linked_agent = a.bubble_id  
      LEFT JOIN customer_profile cp ON i.linked_customer = cp.bubble_id
      WHERE ${whereClause}
        AND i.amount IS NOT NULL 
        AND i.amount_eligible_for_comm IS NOT NULL
      ORDER BY i.invoice_id ASC
      LIMIT $${queryParams.length + 1}
      OFFSET $${queryParams.length + 2}
    `;
    
    queryParams.push(parseInt(limit), parseInt(offset));
    
    console.log(`[DEBUG] Eligible Commission query:`, queryText);
    console.log(`[DEBUG] Query params:`, queryParams);
    
    const invoices = await prisma.$queryRawUnsafe(queryText, ...queryParams);
    
    // Get total count with same filters
    const countQuery = `
      SELECT COUNT(*) as total
      FROM invoice i
      LEFT JOIN agent a ON i.linked_agent = a.bubble_id  
      LEFT JOIN customer_profile cp ON i.linked_customer = cp.bubble_id
      WHERE ${whereClause}
        AND i.amount IS NOT NULL 
        AND i.amount_eligible_for_comm IS NOT NULL
    `;
    
    const countParams = queryParams.slice(0, -2); // Remove limit and offset
    const totalResult = await prisma.$queryRawUnsafe(countQuery, ...countParams);
    const total = parseInt(totalResult[0]?.total || 0);
    
    console.log(`[DEBUG] Found ${invoices.length} eligible commission invoices (${total} total)`);
    
    res.json({
      invoices: invoices.map(invoice => ({
        bubble_id: invoice.bubble_id,
        invoice_id: invoice.invoice_id,
        amount: invoice.amount?.toString() || '0',
        amount_eligible_for_comm: invoice.amount_eligible_for_comm?.toString() || '0',
        eligible_amount_description: invoice.eligible_amount_description,
        agent_name: invoice.agent_name,
        customer_name: invoice.customer_name,
        invoice_date: invoice.invoice_date?.toISOString(),
        created_date: invoice.created_date?.toISOString()
      })),
      total,
      offset: parseInt(offset),
      limit: parseInt(limit)
    });

  } catch (error) {
    console.error('[ERROR] Eligible commission invoices error:', error);
    res.status(500).json({ 
      error: 'Database error', 
      message: error.message 
    });
  }
});

app.post('/api/commission-adjustments', async (req, res) => {
  try {
    const {
      description,
      amount,
      reportId,
      linked_invoice_id,
    } = req.body;

    console.log(`[INFO] Creating commission adjustment for report ${reportId}`);

    // Validate input
    if (!description || !amount || !reportId) {
      return res.status(400).json({
        error: 'Missing required fields: description, amount, reportId'
      });
    }

    const amountFloat = parseFloat(amount);
    if (isNaN(amountFloat)) {
      return res.status(400).json({
        error: 'Invalid amount format'
      });
    }

    // 1. Create the commission_adjustment record
    const newAdjustment = await prisma.commission_adjustment.create({
      data: {
        description,
        amount: amountFloat,
        linked_invoice: linked_invoice_id,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    console.log(`[SUCCESS] Created commission adjustment with ID: ${newAdjustment.id}`);

    // 2. Link it to the generated_commission_report
    const updatedReport = await prisma.generated_commission_report.update({
      where: {
        id: reportId
      },
      data: {
        linked_adjustment: {
          push: newAdjustment.id,
        },
      },
    });

    console.log(`[SUCCESS] Linked adjustment ${newAdjustment.id} to report ${reportId}`);

    res.json({
      message: 'Commission adjustment created and linked successfully',
      adjustment: newAdjustment,
      report: updatedReport,
    });

  } catch (error) {
    console.error('[ERROR] Failed to create commission adjustment:', error);
    res.status(500).json({
      error: 'Database error while creating commission adjustment',
      message: error.message,
    });
  }
});

// Get invoices for ANP Calculator - where payment received > 0
app.get('/api/invoices/anp-calculator', async (req, res) => {
  try {
    const { limit = 100, offset = 0, month, agent } = req.query;
    console.log(`[DEBUG] ANP Calculator invoices request - limit: ${limit}, offset: ${offset}, month: ${month}, agent: ${agent}`);
    
    // Build dynamic WHERE conditions
    let whereConditions = `
      i.linked_payment IS NOT NULL 
      AND array_length(i.linked_payment, 1) > 0
    `;
    
    // Add month filter
    if (month && month !== 'all') {
      const [year, monthNum] = month.split('-');
      whereConditions += `
        AND EXTRACT(YEAR FROM i."1st_payment_date") = ${parseInt(year)}
        AND EXTRACT(MONTH FROM i."1st_payment_date") = ${parseInt(monthNum)}
      `;
    }
    
    // Add agent filter
    if (agent && agent !== 'all') {
      whereConditions += ` AND i.linked_agent = '${agent}'`;
    }
    
    // Get invoices where linked_payment sum > 0
    const anpInvoices = await prisma.$queryRawUnsafe(`
      SELECT 
        i.invoice_id,
        i.bubble_id,
        i."1st_payment_date",
        i.achieved_monthly_anp,
        i.linked_payment,
        a.name as agent_name,
        cp.name as customer_name
      FROM invoice i
      LEFT JOIN agent a ON i.linked_agent = a.bubble_id  
      LEFT JOIN customer_profile cp ON i.linked_customer = cp.bubble_id
      WHERE ${whereConditions}
      ORDER BY i.invoice_id ASC
      LIMIT ${parseInt(limit)}
      OFFSET ${parseInt(offset)}
    `);
    
    console.log(`[DEBUG] ANP invoices query result - count: ${anpInvoices.length}`);
    
    // Calculate payment sums for each invoice to filter only those with payments > 0
    const filteredInvoices = [];
    
    for (const invoice of anpInvoices) {
      try {
        const paymentSumResult = await prisma.$queryRaw`
          SELECT COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as total_payments
          FROM payment 
          WHERE bubble_id = ANY(${invoice.linked_payment})
        `;
        
        const paymentSum = parseFloat(paymentSumResult[0]?.total_payments || 0);
        
        // Only include invoices where payment sum > 0
        if (paymentSum > 0) {
          invoice.payment_sum = paymentSum;
          filteredInvoices.push({
            bubble_id: invoice.bubble_id,
            invoice_id: invoice.invoice_id,
            first_payment_date: invoice['1st_payment_date'], // Handle special column name
            achieved_monthly_anp: invoice.achieved_monthly_anp,
            agent_name: invoice.agent_name,
            customer_name: invoice.customer_name,
            payment_sum: paymentSum
          });
        }
      } catch (paymentError) {
        console.log(`[DEBUG] Payment sum calculation failed for invoice ${invoice.invoice_id}: ${paymentError.message}`);
      }
    }
    
    // Get total count of invoices with payments > 0 using same filters
    const totalCountResult = await prisma.$queryRawUnsafe(`
      SELECT COUNT(DISTINCT i.bubble_id) as count
      FROM invoice i
      WHERE ${whereConditions}
        AND EXISTS (
          SELECT 1 FROM payment p 
          WHERE p.bubble_id = ANY(i.linked_payment) 
            AND CAST(p.amount AS DECIMAL) > 0
        )
    `);
    
    console.log(`[DEBUG] ANP Calculator API response summary - filtered invoices: ${filteredInvoices.length}`);
    
    res.json({ 
      invoices: filteredInvoices,
      total: parseInt(totalCountResult[0].count)
    });
  } catch (error) {
    console.log(`[ERROR] ANP Calculator API error:`, error.message);
    res.status(500).json({ 
      error: 'Database error', 
      message: error.message 
    });
  }
});

// Get ANP related invoices - same agent and month from 1st payment date
app.get('/api/invoices/anp-related', async (req, res) => {
  try {
    const { invoice_id } = req.query;
    console.log(`[DEBUG] Getting ANP related invoices for invoice: ${invoice_id}`);
    
    if (!invoice_id) {
      return res.status(400).json({ error: 'invoice_id parameter is required' });
    }
    
    // First, get the target invoice details
    const targetInvoice = await prisma.$queryRaw`
      SELECT 
        i.linked_agent,
        i."1st_payment_date",
        a.name as agent_name
      FROM invoice i
      LEFT JOIN agent a ON i.linked_agent = a.bubble_id
      WHERE i.bubble_id = ${invoice_id}
    `;
    
    if (targetInvoice.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    const target = targetInvoice[0];
    const linkedAgent = target.linked_agent;
    const firstPaymentDate = target['1st_payment_date'];
    
    console.log(`[DEBUG] Target invoice - Agent: ${linkedAgent}, 1st Payment Date: ${firstPaymentDate}`);
    
    if (!linkedAgent || !firstPaymentDate) {
      return res.json({ invoices: [], message: 'Invoice missing agent or 1st payment date' });
    }
    
    // Extract month and year from 1st payment date
    const targetDate = new Date(firstPaymentDate);
    const targetYear = targetDate.getFullYear();
    const targetMonth = targetDate.getMonth() + 1; // JavaScript months are 0-based
    
    console.log(`[DEBUG] Target month: ${targetYear}-${String(targetMonth).padStart(2, '0')}`);
    
    // Get all invoices from same agent with 1st payment in same month
    const relatedInvoices = await prisma.$queryRaw`
      SELECT 
        i.bubble_id,
        i.invoice_id,
        i."1st_payment_date",
        i.achieved_monthly_anp,
        i.amount,
        i.linked_payment,
        a.name as agent_name
      FROM invoice i
      LEFT JOIN agent a ON i.linked_agent = a.bubble_id
      WHERE i.linked_agent = ${linkedAgent}
        AND i."1st_payment_date" IS NOT NULL
        AND EXTRACT(YEAR FROM i."1st_payment_date") = ${targetYear}
        AND EXTRACT(MONTH FROM i."1st_payment_date") = ${targetMonth}
      ORDER BY i.invoice_id ASC
    `;
    
    console.log(`[DEBUG] Found ${relatedInvoices.length} related invoices for ANP calculation`);
    
    // Calculate first payment amount for each invoice
    const responseInvoices = [];
    
    for (const invoice of relatedInvoices) {
      let firstPaymentAmount = 0;
      
      try {
        if (invoice.linked_payment && invoice.linked_payment.length > 0) {
          // Get the earliest payment amount
          const firstPaymentResult = await prisma.$queryRaw`
            SELECT CAST(amount AS DECIMAL) as amount, payment_date
            FROM payment 
            WHERE bubble_id = ANY(${invoice.linked_payment})
            ORDER BY payment_date ASC
            LIMIT 1
          `;
          
          if (firstPaymentResult.length > 0) {
            firstPaymentAmount = parseFloat(firstPaymentResult[0].amount || 0);
          }
        }
      } catch (paymentError) {
        console.log(`[DEBUG] Error getting first payment for invoice ${invoice.invoice_id}:`, paymentError.message);
      }
      
      responseInvoices.push({
        bubble_id: invoice.bubble_id,
        invoice_id: invoice.invoice_id,
        first_payment_date: invoice['1st_payment_date'],
        achieved_monthly_anp: invoice.achieved_monthly_anp,
        amount: invoice.amount,
        agent_name: invoice.agent_name,
        first_payment_amount: firstPaymentAmount
      });
    }
    
    res.json({ 
      invoices: responseInvoices,
      agent_name: target.agent_name,
      target_month: `${targetYear}-${String(targetMonth).padStart(2, '0')}`
    });
  } catch (error) {
    console.log(`[ERROR] ANP Related invoices API error:`, error.message);
    res.status(500).json({ 
      error: 'Database error', 
      message: error.message 
    });
  }
});

// Get all agents for filter dropdown
app.get('/api/agents/list', async (req, res) => {
  try {
    console.log(`[DEBUG] Getting agents list for filter dropdown`);
    
    const agents = await prisma.$queryRaw`
      SELECT bubble_id, name, contact, agent_type 
      FROM agent 
      WHERE name IS NOT NULL AND name != ''
      ORDER BY name ASC
    `;
    
    console.log(`[DEBUG] Found ${agents.length} agents`);
    
    res.json({ 
      agents: agents
    });
  } catch (error) {
    console.log(`[ERROR] Agents list error:`, error.message);
    res.status(500).json({ 
      error: 'Database error', 
      message: error.message 
    });
  }
});

// SIMPLIFIED: Just return what we can actually see in the database
app.get('/api/users/teams', async (req, res) => {
  try {
    console.log(`[DEBUG] Getting users - SIMPLIFIED APPROACH`);
    
    // Step 1: Check if user table exists at all
    const userTableExists = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'user'
    `;
    
    if (userTableExists.length === 0) {
      return res.json({ 
        teams: { jb: [], kluang: [], seremban: [] },
        total_users: 0,
        debug_message: 'User table does not exist'
      });
    }
    
    // Step 2: Get actual table structure
    const columns = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'user' 
      ORDER BY ordinal_position
    `;
    
    // Step 3: Get a few sample rows to see real data
    const sampleRows = await prisma.$queryRaw`SELECT * FROM "user" LIMIT 3`;
    
    console.log(`[DEBUG] Found ${columns.length} columns:`, columns.map(c => `${c.column_name} (${c.data_type})`));
    console.log(`[DEBUG] Sample data:`, sampleRows.map(row => Object.keys(row)));
    
    // Now I know: access_level is an array, no 'name' column, bubble_id exists
    // Let's query for teams using the correct array syntax
    
    console.log(`[DEBUG] Writing queries for actual array access_level`);
    
    // Query each team with agent name JOIN - looking for array elements that contain team names
    const teamJBQuery = `
      SELECT u.bubble_id, u.profile_picture, u.access_level, u.linked_agent_profile, a.name as agent_name
      FROM "user" u
      LEFT JOIN agent a ON u.linked_agent_profile = a.bubble_id
      WHERE u.bubble_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM unnest(u.access_level) AS level 
          WHERE level ILIKE '%team-jb%'
        )
      ORDER BY COALESCE(a.name, u.bubble_id) ASC
    `;
    
    const teamKluangQuery = `
      SELECT u.bubble_id, u.profile_picture, u.access_level, u.linked_agent_profile, a.name as agent_name
      FROM "user" u
      LEFT JOIN agent a ON u.linked_agent_profile = a.bubble_id
      WHERE u.bubble_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM unnest(u.access_level) AS level 
          WHERE level ILIKE '%team-kluang%'
        )
      ORDER BY COALESCE(a.name, u.bubble_id) ASC
    `;
    
    const teamSerembanQuery = `
      SELECT u.bubble_id, u.profile_picture, u.access_level, u.linked_agent_profile, a.name as agent_name
      FROM "user" u
      LEFT JOIN agent a ON u.linked_agent_profile = a.bubble_id
      WHERE u.bubble_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM unnest(u.access_level) AS level 
          WHERE level ILIKE '%team-seremban%'
        )
      ORDER BY COALESCE(a.name, u.bubble_id) ASC
    `;
    
    console.log(`[DEBUG] Executing team queries...`);
    
    const [teamJB, teamKluang, teamSeremban] = await Promise.all([
      prisma.$queryRawUnsafe(teamJBQuery),
      prisma.$queryRawUnsafe(teamKluangQuery), 
      prisma.$queryRawUnsafe(teamSerembanQuery)
    ]);
    
    const totalUsers = teamJB.length + teamKluang.length + teamSeremban.length;
    
    console.log(`[DEBUG] Team results - JB: ${teamJB.length}, Kluang: ${teamKluang.length}, Seremban: ${teamSeremban.length}`);
    
    // Get 7-day activity data for all users
    console.log(`[DEBUG] Fetching 7-day activity data for all users...`);
    
    const allUserIds = [...teamJB, ...teamKluang, ...teamSeremban].map(u => u.bubble_id);
    
    let userActivityData = {};
    if (allUserIds.length > 0) {
      try {
        // Get last 7 days activity for all users - using same format as working individual report
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
        
        console.log(`[DEBUG] Teams API - Date ranges - 7 days ago: ${sevenDaysAgo.toISOString()}, now: ${now.toISOString()}`);
        console.log(`[DEBUG] Teams API - Looking for activity data for ${allUserIds.length} users:`, allUserIds);
        
        const activityQuery = `
          SELECT 
            linked_user,
            SUM(report_point) as total_points,
            COUNT(*) as activity_count
          FROM agent_daily_report 
          WHERE linked_user = ANY($1)
            AND report_date >= $2
            AND report_date <= $3
          GROUP BY linked_user
        `;
        
        const activityResults = await prisma.$queryRawUnsafe(activityQuery, allUserIds, sevenDaysAgo, now);
        
        // Convert to lookup object
        console.log(`[DEBUG] Teams API - Raw activity results:`, activityResults);
        
        activityResults.forEach(result => {
          const totalPoints = parseInt(result.total_points) || 0;
          const activityCount = parseInt(result.activity_count) || 0;
          const avgDaily = Math.round(totalPoints / 7);
          
          userActivityData[result.linked_user] = {
            total_points: totalPoints,
            activity_count: activityCount,
            average_daily_points: avgDaily
          };
          
          console.log(`[DEBUG] Teams API - User ${result.linked_user}: ${totalPoints} total pts, ${activityCount} activities, ${avgDaily} avg daily`);
        });
        
        console.log(`[DEBUG] Found activity data for ${activityResults.length} users out of ${allUserIds.length} total users`);
      } catch (activityError) {
        console.log(`[DEBUG] Activity data fetch failed: ${activityError.message}`);
      }
    }

    // Calculate team averages
    const calculateTeamAverage = (teamUsers) => {
      if (teamUsers.length === 0) return 0;
      const totalPoints = teamUsers.reduce((sum, user) => {
        const userData = userActivityData[user.bubble_id] || { total_points: 0 };
        return sum + userData.total_points;
      }, 0);
      return Math.round(totalPoints / teamUsers.length);
    };

    // Format users for frontend with activity data
    const formatUser = (user) => {
      const activity = userActivityData[user.bubble_id] || {
        total_points: 0,
        activity_count: 0,
        average_daily_points: 0
      };
      
      return {
        bubble_id: user.bubble_id,
        name: user.agent_name || user.bubble_id,
        profile_picture: user.profile_picture,
        access_level: user.access_level,
        linked_agent_profile: user.linked_agent_profile,
        agent_name: user.agent_name,
        seven_day_points: activity.total_points,
        seven_day_activities: activity.activity_count,
        average_daily_points: activity.average_daily_points
      };
    };
    
    const formattedTeams = {
      jb: teamJB.map(formatUser),
      kluang: teamKluang.map(formatUser), 
      seremban: teamSeremban.map(formatUser)
    };

    res.json({ 
      teams: formattedTeams,
      total_users: totalUsers,
      team_averages: {
        jb: calculateTeamAverage(teamJB),
        kluang: calculateTeamAverage(teamKluang),
        seremban: calculateTeamAverage(teamSeremban)
      },
      debug_info: {
        queries_used: { teamJBQuery, teamKluangQuery, teamSerembanQuery },
        raw_results: {
          jb_count: teamJB.length,
          kluang_count: teamKluang.length, 
          seremban_count: teamSeremban.length
        },
        activity_data_count: Object.keys(userActivityData).length,
        message: 'SUCCESS: Using correct array queries with unnest() + 7-day activity data'
      }
    });
    
  } catch (error) {
    console.log(`[ERROR] Users teams inspection error:`, error.message);
    res.status(500).json({ 
      error: 'Database inspection error', 
      message: error.message 
    });
  }
});

// Debug endpoint to check available tables and user-related data
app.get('/api/debug/tables', async (req, res) => {
  try {
    console.log(`[DEBUG] Checking available database tables`);
    
    // Get all tables
    const allTables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;
    
    const tableNames = allTables.map(t => t.table_name);
    console.log(`[DEBUG] Available tables:`, tableNames);
    
    // Check for user-related tables
    const userRelatedTables = tableNames.filter(name => 
      name.toLowerCase().includes('user') || 
      name.toLowerCase().includes('agent') ||
      name.toLowerCase().includes('team')
    );
    
    let sampleData = {};
    
    // Try to get sample data from user-related tables
    for (const tableName of userRelatedTables) {
      try {
        const sample = await prisma.$queryRawUnsafe(`SELECT * FROM "${tableName}" LIMIT 3`);
        sampleData[tableName] = {
          count: sample.length,
          columns: sample.length > 0 ? Object.keys(sample[0]) : [],
          sample: sample.map(row => 
            JSON.parse(JSON.stringify(row, (key, value) =>
              typeof value === 'bigint' ? value.toString() : value
            ))
          )
        };
      } catch (error) {
        sampleData[tableName] = { error: error.message };
      }
    }
    
    res.json({
      all_tables: tableNames,
      user_related_tables: userRelatedTables,
      sample_data: sampleData
    });
  } catch (error) {
    console.log(`[ERROR] Debug tables error:`, error.message);
    res.status(500).json({ 
      error: 'Database error', 
      message: error.message 
    });
  }
});

// Test if agent_daily_report table exists and has data
app.get('/api/debug/agent-daily-report', async (req, res) => {
  try {
    console.log(`[DEBUG] Checking agent_daily_report table`);
    
    // Check if table exists
    const tableExists = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'agent_daily_report'
    `;
    
    if (tableExists.length === 0) {
      return res.json({
        success: false,
        message: 'agent_daily_report table does not exist',
        table_exists: false
      });
    }
    
    // Get table structure
    const columns = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'agent_daily_report' 
      ORDER BY ordinal_position
    `;
    
    // Get sample data
    const sampleData = await prisma.$queryRaw`SELECT * FROM agent_daily_report LIMIT 5`;
    
    // Get total count
    const totalCount = await prisma.$queryRaw`SELECT COUNT(*) as count FROM agent_daily_report`;
    
    // Get recent data (last 7 days) - simplified to avoid date casting issues
    let recentData = [];
    try {
      recentData = await prisma.$queryRaw`SELECT * FROM agent_daily_report LIMIT 10`;
    } catch (recentError) {
      console.log(`[DEBUG] Could not fetch recent data: ${recentError.message}`);
    }
    
    res.json({
      success: true,
      table_exists: true,
      columns: columns,
      total_records: totalCount[0]?.count || 0,
      sample_data: sampleData,
      recent_data: recentData
    });
    
  } catch (error) {
    console.log(`[ERROR] Agent daily report debug error:`, error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Test PostgreSQL query for users with team-jb access level
app.get('/api/test/team-jb-users', async (req, res) => {
  try {
    console.log(`[TEST] Testing PostgreSQL query for team-jb users`);
    
    // First check the access_level column type
    const accessLevelInfo = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'user' 
      AND column_name = 'access_level'
      AND table_schema = 'public'
    `;
    
    const isArray = accessLevelInfo.length > 0 && accessLevelInfo[0].data_type.includes('[]');
    
    // Build appropriate test query
    let testQuery;
    if (isArray) {
      testQuery = `
        SELECT bubble_id, access_level 
        FROM "user" 
        WHERE 'team-jb' = ANY(access_level)
        ORDER BY bubble_id ASC
      `;
    } else {
      testQuery = `
        SELECT bubble_id, access_level 
        FROM "user" 
        WHERE access_level ILIKE '%team-jb%'
        ORDER BY bubble_id ASC
      `;
    }
    
    console.log(`[TEST] Executing query: ${testQuery}`);
    
    const users = await prisma.$queryRawUnsafe(testQuery);
    
    console.log(`[TEST] Found ${users.length} users with team-jb in access_level`);
    console.log(`[TEST] Sample results:`, users.slice(0, 3));
    
    res.json({
      success: true,
      query_used: testQuery,
      access_level_type: accessLevelInfo[0]?.data_type,
      is_array: isArray,
      results_count: users.length,
      users: users.map(user => ({
        bubble_id: user.bubble_id,
        access_level: user.access_level
      }))
    });
    
  } catch (error) {
    console.log(`[TEST ERROR] Team-jb users test failed:`, error.message);
    console.log(`[TEST ERROR] Full error:`, error);
    
    res.status(500).json({
      success: false,
      error: error.message,
      error_code: error.code,
      query_attempted: `SELECT bubble_id, name, email, contact, access_level, profile_picture FROM "user" WHERE access_level LIKE '%team-jb%' ORDER BY name ASC`
    });
  }
});

// Get latest agent daily reports for mobile Daily Activity Report analysis
app.get('/api/agent-daily-reports/latest', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    console.log(`[DEBUG] Fetching latest ${limit} agent daily reports`);
    
    // First check if agent_daily_report table exists
    const tableExists = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'agent_daily_report'
    `;
    
    if (tableExists.length === 0) {
      return res.status(404).json({ 
        error: 'Table not found',
        message: 'agent_daily_report table does not exist'
      });
    }
    
    // Get table structure
    const columns = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'agent_daily_report' 
      AND table_schema = 'public'
      ORDER BY ordinal_position
    `;
    
    console.log(`[DEBUG] agent_daily_report columns:`, columns.map(c => `${c.column_name} (${c.data_type})`));
    
    // Get latest records ordered by most recent first
    // Try common date column names
    const dateColumns = ['created_date', 'report_date', 'date', 'created_at', 'updated_at', 'synced_at'];
    const availableColumns = columns.map(c => c.column_name);
    let orderByColumn = 'id'; // fallback
    
    for (const dateCol of dateColumns) {
      if (availableColumns.includes(dateCol)) {
        orderByColumn = dateCol;
        break;
      }
    }
    
    console.log(`[DEBUG] Using order by column: ${orderByColumn}`);
    
    const latestReports = await prisma.$queryRawUnsafe(`
      SELECT * FROM agent_daily_report 
      ORDER BY "${orderByColumn}" DESC 
      LIMIT ${parseInt(limit)}
    `);
    
    console.log(`[DEBUG] Found ${latestReports.length} agent daily reports`);
    
    // Clean data for JSON (handle BigInt and other special types)
    const cleanedReports = latestReports.map(report => 
      JSON.parse(JSON.stringify(report, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
      ))
    );
    
    res.json({
      success: true,
      reports: cleanedReports,
      table_info: {
        columns: columns.map(c => ({ name: c.column_name, type: c.data_type })),
        total_records: latestReports.length,
        order_by_column: orderByColumn
      }
    });
    
  } catch (error) {
    console.log(`[ERROR] Agent daily reports fetch error:`, error.message);
    res.status(500).json({ 
      error: 'Database error', 
      message: error.message 
    });
  }
});

// Get user activity report with 7-day summary and 14-day detailed reports
app.get('/api/user/:userId/activity-report', async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 14 } = req.query;
    console.log(`[DEBUG] Getting activity report for user: ${userId}`);
    
    // Calculate date ranges
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
    const fourteenDaysAgo = new Date(now.getTime() - (14 * 24 * 60 * 60 * 1000));
    
    console.log(`[DEBUG] Date ranges - 7 days ago: ${sevenDaysAgo.toISOString()}, 14 days ago: ${fourteenDaysAgo.toISOString()}`);
    
    // 1. Last 7 days summary by activity type
    const activityTypeSummary = await prisma.$queryRaw`
      SELECT 
        activity_type,
        COUNT(*) as count,
        SUM(report_point) as total_points
      FROM agent_daily_report 
      WHERE linked_user = ${userId}
        AND report_date >= ${sevenDaysAgo}
        AND report_date <= ${now}
      GROUP BY activity_type
      ORDER BY total_points DESC
    `;
    
    console.log(`[DEBUG] Activity type summary:`, activityTypeSummary);
    
    // 2. Last 7 days total points by date
    const dailyPointsSummary = await prisma.$queryRaw`
      SELECT 
        DATE(report_date) as report_day,
        SUM(report_point) as total_points,
        COUNT(*) as activity_count
      FROM agent_daily_report 
      WHERE linked_user = ${userId}
        AND report_date >= ${sevenDaysAgo}
        AND report_date <= ${now}
      GROUP BY DATE(report_date)
      ORDER BY report_day DESC
    `;
    
    console.log(`[DEBUG] Daily points summary:`, dailyPointsSummary);
    
    // 3. Last 14 days detailed reports with pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    const detailedReports = await prisma.$queryRaw`
      SELECT 
        adr.id,
        adr.bubble_id,
        adr.activity_type,
        adr.report_point,
        adr.report_date,
        adr.created_date,
        adr.remark,
        adr.tag,
        adr.linked_customer,
        cp.name as customer_name
      FROM agent_daily_report adr
      LEFT JOIN customer_profile cp ON adr.linked_customer = cp.bubble_id
      WHERE adr.linked_user = ${userId}
        AND adr.report_date >= ${fourteenDaysAgo}
        AND adr.report_date <= ${now}
      ORDER BY adr.report_date DESC, adr.created_date DESC
      LIMIT ${parseInt(limit)}
      OFFSET ${offset}
    `;
    
    console.log(`[DEBUG] Found ${detailedReports.length} detailed reports for page ${page}`);
    
    // Get total count for pagination
    const totalCountResult = await prisma.$queryRaw`
      SELECT COUNT(*) as count
      FROM agent_daily_report 
      WHERE linked_user = ${userId}
        AND report_date >= ${fourteenDaysAgo}
        AND report_date <= ${now}
    `;
    
    const totalReports = parseInt(totalCountResult[0].count);
    const totalPages = Math.ceil(totalReports / parseInt(limit));
    
    // Clean data for JSON response
    const cleanedActivitySummary = activityTypeSummary.map(item => ({
      activity_type: item.activity_type,
      count: parseInt(item.count),
      total_points: parseInt(item.total_points || 0)
    }));
    
    const cleanedDailySummary = dailyPointsSummary.map(item => ({
      date: item.report_day,
      total_points: parseInt(item.total_points || 0),
      activity_count: parseInt(item.activity_count)
    }));
    
    const cleanedReports = detailedReports.map(report => 
      JSON.parse(JSON.stringify(report, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
      ))
    );
    
    // Calculate 7-day totals
    const sevenDayTotalPoints = cleanedActivitySummary.reduce((sum, item) => sum + item.total_points, 0);
    const sevenDayTotalActivities = cleanedActivitySummary.reduce((sum, item) => sum + item.count, 0);
    
    res.json({
      success: true,
      user_id: userId,
      summary: {
        seven_day_activity_types: cleanedActivitySummary,
        seven_day_daily_points: cleanedDailySummary,
        seven_day_totals: {
          total_points: sevenDayTotalPoints,
          total_activities: sevenDayTotalActivities
        }
      },
      detailed_reports: {
        reports: cleanedReports,
        pagination: {
          current_page: parseInt(page),
          total_pages: totalPages,
          total_reports: totalReports,
          limit: parseInt(limit),
          has_next: parseInt(page) < totalPages,
          has_prev: parseInt(page) > 1
        }
      },
      date_ranges: {
        seven_days_ago: sevenDaysAgo.toISOString(),
        fourteen_days_ago: fourteenDaysAgo.toISOString(),
        now: now.toISOString()
      }
    });
    
  } catch (error) {
    console.log(`[ERROR] User activity report error:`, error.message);
    res.status(500).json({ 
      error: 'Database error', 
      message: error.message 
    });
  }
});

// Update agent type
app.put('/api/agents/:agentId/type', async (req, res) => {
  try {
    const { agentId } = req.params;
    const { agent_type } = req.body;
    
    console.log(`[DEBUG] Updating agent ${agentId} type to: ${agent_type}`);
    
    if (!agent_type || !['internal', 'outsource', 'block'].includes(agent_type)) {
      return res.status(400).json({ 
        error: 'Invalid agent type', 
        message: 'Agent type must be either "internal", "outsource", or "block"' 
      });
    }
    
    const updatedAgent = await prisma.$queryRaw`
      UPDATE agent 
      SET agent_type = ${agent_type}
      WHERE bubble_id = ${agentId}
      RETURNING bubble_id, name, agent_type
    `;
    
    if (updatedAgent.length === 0) {
      return res.status(404).json({ 
        error: 'Agent not found', 
        message: `Agent with ID ${agentId} not found` 
      });
    }
    
    console.log(`[DEBUG] Agent ${agentId} updated successfully to ${agent_type}`);
    
    res.json({ 
      message: 'Agent type updated successfully',
      agent: updatedAgent[0]
    });
  } catch (error) {
    console.log(`[ERROR] Agent type update error:`, error.message);
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
      WHERE i.paid != true OR i.paid IS NULL
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
            SET paid = true, full_payment_date = COALESCE(full_payment_date, NOW())
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

app.post('/api/invoices/update-anp', async (req, res) => {
  try {
    console.log('[DEBUG] Starting Update ANP calculation');
    
    // Get all invoices with 1st_payment_date that is not null/empty
    // Note: We only need 1st_payment_date, not full_payment_date (ANP is for first payment month)
    const invoicesWithPaymentDate = await prisma.$queryRaw`
      SELECT i.bubble_id, i.amount, i.full_payment_date, i.linked_agent, i."1st_payment_date"
      FROM invoice i
      WHERE i."1st_payment_date" IS NOT NULL 
        AND CAST(i."1st_payment_date" AS TEXT) != ''
        AND CAST(i."1st_payment_date" AS TEXT) != 'null'
        AND i.linked_agent IS NOT NULL
        AND i.amount IS NOT NULL
        AND CAST(i.amount AS DECIMAL) > 0
    `;
    
    console.log(`[DEBUG] Found ${invoicesWithPaymentDate.length} invoices with payment dates`);
    
    let updatedCount = 0;
    const errors = [];
    const processedAgents = new Set();
    
    // Group invoices by agent and month
    const agentMonthlyTotals = {};
    
    for (const invoice of invoicesWithPaymentDate) {
      try {
        const agentId = invoice.linked_agent;
        const firstPaymentDateValue = invoice['1st_payment_date'];
        
        // Additional validation for date
        if (!firstPaymentDateValue || firstPaymentDateValue === '' || firstPaymentDateValue === 'null') {
          console.log(`[DEBUG] Skipping invoice ${invoice.bubble_id} - invalid 1st_payment_date: ${firstPaymentDateValue}`);
          continue;
        }
        
        const firstPaymentDate = new Date(firstPaymentDateValue);
        if (isNaN(firstPaymentDate.getTime())) {
          console.log(`[DEBUG] Skipping invoice ${invoice.bubble_id} - invalid date format: ${firstPaymentDateValue}`);
          continue;
        }
        
        const monthKey = `${firstPaymentDate.getFullYear()}-${String(firstPaymentDate.getMonth() + 1).padStart(2, '0')}`;
        const agentMonthKey = `${agentId}_${monthKey}`;
        
        if (!agentMonthlyTotals[agentMonthKey]) {
          agentMonthlyTotals[agentMonthKey] = {
            agentId: agentId,
            month: monthKey,
            total: 0,
            invoices: []
          };
        }
        
        const amount = parseFloat(invoice.amount || 0);
        agentMonthlyTotals[agentMonthKey].total += amount;
        agentMonthlyTotals[agentMonthKey].invoices.push(invoice.bubble_id);
        
        console.log(`[DEBUG] Agent ${agentId}, Month ${monthKey}, Amount: ${amount}, Running Total: ${agentMonthlyTotals[agentMonthKey].total}`);
        
      } catch (processingError) {
        console.log(`[DEBUG] Error processing invoice ${invoice.bubble_id}:`, processingError.message);
        errors.push({
          invoice_id: invoice.bubble_id,
          error: `Processing error: ${processingError.message}`
        });
      }
    }
    
    // Now update each invoice with the calculated monthly ANP
    for (const [agentMonthKey, data] of Object.entries(agentMonthlyTotals)) {
      try {
        const monthlyTotal = data.total;
        
        console.log(`[DEBUG] Updating invoices for agent ${data.agentId}, month ${data.month} with ANP: ${monthlyTotal}`);
        
        // Update all invoices for this agent-month combination
        for (const invoiceId of data.invoices) {
          await prisma.$executeRaw`
            UPDATE invoice 
            SET achieved_monthly_anp = ${monthlyTotal}
            WHERE bubble_id = ${invoiceId}
          `;
          updatedCount++;
        }
        
        processedAgents.add(data.agentId);
        
      } catch (updateError) {
        console.log(`[DEBUG] Error updating ANP for ${agentMonthKey}:`, updateError.message);
        errors.push({
          agent_month: agentMonthKey,
          error: `Update error: ${updateError.message}`
        });
      }
    }
    
    console.log(`[DEBUG] ANP Update completed. Updated ${updatedCount} invoices for ${processedAgents.size} agents`);
    
    res.json({ 
      message: 'ANP Update completed',
      updated_invoices: updatedCount,
      total_checked: invoicesWithPaymentDate.length,
      processed_agents: processedAgents.size,
      agent_month_combinations: Object.keys(agentMonthlyTotals).length,
      errors: errors
    });
    
  } catch (error) {
    console.error('[ERROR] ANP Update failed:', error);
    res.status(500).json({ 
      error: 'ANP Update failed', 
      message: error.message 
    });
  }
});

// Update eligible amount for comm - adjust eligible_amount_for_comm to match invoice amount
app.put('/api/invoices/:invoiceId/update-eligible-comm', async (req, res) => {
  try {
    const { invoiceId } = req.params;
    console.log(`[DEBUG] Updating eligible amount for comm for invoice: ${invoiceId}`);

    // First, get the current invoice data
    const invoice = await prisma.$queryRaw`
      SELECT bubble_id, amount, amount_eligible_for_comm, eligible_amount_description
      FROM invoice
      WHERE bubble_id = ${invoiceId}
    `;

    if (!invoice || invoice.length === 0) {
      return res.status(404).json({
        error: 'Invoice not found',
        message: `Invoice with ID ${invoiceId} does not exist`
      });
    }

    const currentInvoice = invoice[0];
    const invoiceAmount = parseFloat(currentInvoice.amount || 0);
    const currentEligibleAmount = parseFloat(currentInvoice.amount_eligible_for_comm || 0);

    // Calculate the adjustment amount
    const adjustmentAmount = invoiceAmount - currentEligibleAmount;

    // Create the adjustment description
    const currentDescription = currentInvoice.eligible_amount_description || '';
    const adjustmentDescription = `\nsystem price changed, adjust for RM${adjustmentAmount.toFixed(2)} - by v2.0`;
    const newDescription = currentDescription + adjustmentDescription;

    // Update the invoice
    await prisma.$executeRaw`
      UPDATE invoice
      SET
        amount_eligible_for_comm = ${invoiceAmount},
        eligible_amount_description = ${newDescription}
      WHERE bubble_id = ${invoiceId}
    `;

    console.log(`[DEBUG] Updated invoice ${invoiceId}:`);
    console.log(`  - Original eligible amount: RM${currentEligibleAmount.toFixed(2)}`);
    console.log(`  - New eligible amount: RM${invoiceAmount.toFixed(2)}`);
    console.log(`  - Adjustment: RM${adjustmentAmount.toFixed(2)}`);

    res.json({
      message: 'Eligible amount updated successfully',
      invoice_id: invoiceId,
      original_eligible_amount: currentEligibleAmount,
      new_eligible_amount: invoiceAmount,
      adjustment_amount: adjustmentAmount,
      updated_description: newDescription
    });

  } catch (error) {
    console.error(`[ERROR] Failed to update eligible amount for invoice ${req.params.invoiceId}:`, error);
    res.status(500).json({
      error: 'Failed to update eligible amount',
      message: error.message
    });
  }
});

// Get invoice details with customer and invoice items
app.get('/api/invoice/details/:invoiceId', async (req, res) => {
  try {
    const { invoiceId } = req.params;
    console.log(`[DEBUG] Getting invoice details for: ${invoiceId}`);
    
    // First get the actual invoice table schema to understand available fields
    const invoiceColumns = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'invoice' 
      AND table_schema = 'public'
      ORDER BY ordinal_position
    `;
    
    console.log(`[DEBUG] Invoice table columns:`, invoiceColumns.map(c => c.column_name).join(', '));
    
    // First check if invoice_item table exists
    const invoiceItemTableExists = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      AND table_name = 'invoice_item'
    `;
    
    console.log(`[DEBUG] invoice_item table exists: ${invoiceItemTableExists.length > 0}`);
    
    // If invoice_item table exists, get its columns too
    let invoiceItemColumns = [];
    if (invoiceItemTableExists.length > 0) {
      invoiceItemColumns = await prisma.$queryRaw`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'invoice_item' 
        AND table_schema = 'public'
        ORDER BY ordinal_position
      `;
      console.log(`[DEBUG] Invoice_item table columns:`, invoiceItemColumns.map(c => c.column_name).join(', '));
    }
    
    // Get all invoice data first to see what we have
    const invoiceDetails = await prisma.$queryRaw`
      SELECT i.*, cp.name as customer_name, cp.bubble_id as customer_bubble_id
      FROM invoice i
      LEFT JOIN customer_profile cp ON i.linked_customer = cp.bubble_id
      WHERE i.bubble_id = ${invoiceId}
    `;
    
    if (invoiceDetails.length === 0) {
      console.log(`[DEBUG] Invoice not found: ${invoiceId}`);
      return res.status(404).json({ 
        error: 'Invoice not found', 
        message: `Invoice with ID ${invoiceId} not found` 
      });
    }
    
    const invoice = invoiceDetails[0];
    console.log(`[DEBUG] Found invoice: ${invoice.invoice_id}, customer: ${invoice.customer_name}`);
    console.log(`[DEBUG] Full invoice data:`, JSON.stringify(invoice, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value, 2));
    
    let invoiceItems = [];
    let totalItemAmount = 0;
    
    // Get invoice items if table exists
    if (invoiceItemTableExists.length > 0) {
      try {
        console.log(`[DEBUG] Searching for invoice items for invoice: ${invoiceId}`);
        console.log(`[DEBUG] Invoice linked_invoice_item array:`, invoice.linked_invoice_item);
        
        // PRIMARY APPROACH: Use invoice.linked_invoice_item array (the authoritative source)
        if (invoice.linked_invoice_item && invoice.linked_invoice_item.length > 0) {
          console.log(`[DEBUG] Using linked_invoice_item array with ${invoice.linked_invoice_item.length} items`);
          
          // Build IN clause for the array items - this is the correct approach
          const placeholders = invoice.linked_invoice_item.map((_, index) => `$${index + 1}`).join(',');
          const queryText = `
            SELECT 
              ii.bubble_id,
              ii.description,
              ii.amount,
              ii.sort,
              ii.unit_price,
              ii.qty,
              ii.inv_item_type
            FROM invoice_item ii
            WHERE ii.bubble_id IN (${placeholders})
            ORDER BY COALESCE(CAST(ii.sort AS INTEGER), 999999) ASC, ii.description ASC
          `;
          
          console.log(`[DEBUG] Query:`, queryText);
          console.log(`[DEBUG] Parameters:`, invoice.linked_invoice_item);
          
          invoiceItems = await prisma.$queryRawUnsafe(queryText, ...invoice.linked_invoice_item);
          console.log(`[DEBUG] Found ${invoiceItems.length} invoice items using linked_invoice_item array`);
        } else {
          console.log(`[DEBUG] Invoice has no linked_invoice_item array, trying fallback with linked_invoice field`);
          
          // FALLBACK: Try linked_invoice field approach
          invoiceItems = await prisma.$queryRaw`
            SELECT 
              ii.bubble_id,
              ii.description,
              ii.amount,
              ii.sort,
              ii.unit_price,
              ii.qty,
              ii.inv_item_type
            FROM invoice_item ii
            WHERE ii.linked_invoice = ${invoiceId}
            ORDER BY COALESCE(CAST(ii.sort AS INTEGER), 999999) ASC, ii.description ASC
          `;
          
          console.log(`[DEBUG] Found ${invoiceItems.length} invoice items using linked_invoice fallback`);
        }
        
        // Calculate total amount from invoice items
        totalItemAmount = invoiceItems.reduce((sum, item) => {
          return sum + parseFloat(item.amount || 0);
        }, 0);
        
        console.log(`[DEBUG] Total invoice items amount: ${totalItemAmount}`);
        
      } catch (itemError) {
        console.log(`[ERROR] Error fetching invoice items: ${itemError.message}`);
        console.log(`[ERROR] Error stack:`, itemError.stack);
        // Continue without items rather than failing
        invoiceItems = [];
        totalItemAmount = 0;
      }
    } else {
      console.log(`[DEBUG] invoice_item table does not exist, skipping items fetch`);
    }
    
    // Try to find the best date field available
    const invoiceDate = invoice.invoice_date || invoice.created_date || invoice.date_created || invoice.creation_date || null;
    
    const response = {
      invoice: {
        bubble_id: invoice.bubble_id,
        invoice_id: invoice.invoice_id,
        amount: parseFloat(invoice.amount || 0),
        invoice_date: invoiceDate,
        created_date: invoice.created_date,
        full_payment_date: invoice.full_payment_date,
        customer_name: invoice.customer_name || 'Unknown Customer',
        customer_bubble_id: invoice.customer_bubble_id
      },
      invoice_items: invoiceItems.map(item => ({
        bubble_id: item.bubble_id,
        description: item.description || 'No Description',
        amount: parseFloat(item.amount || 0),
        unit_price: parseFloat(item.unit_price || 0),
        qty: parseInt(item.qty || 1),
        sort: item.sort,
        item_type: item.inv_item_type
      })),
      total_items_amount: totalItemAmount,
      debug_info: {
        invoice_item_table_exists: invoiceItemTableExists.length > 0,
        items_count: invoiceItems.length,
        available_invoice_columns: invoiceColumns.map(c => c.column_name),
        available_invoice_item_columns: invoiceItemColumns.map(c => c.column_name),
        found_date_field: invoiceDate ? 'yes' : 'no'
      }
    };
    
    console.log(`[DEBUG] Invoice details response prepared - Items: ${invoiceItems.length}, Total: ${totalItemAmount}`);
    console.log(`[DEBUG] Full response data:`, JSON.stringify(response, null, 2));
    
    res.json(response);
    
  } catch (error) {
    console.log(`[ERROR] Invoice details API error:`, error.message);
    console.log(`[ERROR] Full error:`, error);
    res.status(500).json({ 
      error: 'Database error', 
      message: error.message,
      invoice_id: req.params.invoiceId
    });
  }
});

// Get single invoice by bubble_id for eligible amount description
app.get('/api/invoice/by-bubble-id/:bubbleId', async (req, res) => {
  try {
    const { bubbleId } = req.params;
    console.log(`[DEBUG] Fetching invoice by bubble_id: ${bubbleId}`);
    
    // Get the specific invoice by bubble_id with customer name from linked table
    const invoice = await prisma.$queryRaw`
      SELECT 
        i.bubble_id,
        i.invoice_id,
        i.eligible_amount_description,
        i.amount,
        i.amount_eligible_for_comm,
        i.invoice_date,
        i.created_date,
        i.linked_customer,
        cp.name as customer_name
      FROM invoice i
      LEFT JOIN customer_profile cp ON i.linked_customer = cp.bubble_id
      WHERE i.bubble_id = ${bubbleId}
      LIMIT 1
    `;
    
    if (invoice.length === 0) {
      return res.status(404).json({ 
        error: 'Invoice not found', 
        message: `Invoice with bubble_id ${bubbleId} not found` 
      });
    }
    
    console.log(`[DEBUG] Found invoice eligible_amount_description:`, invoice[0].eligible_amount_description);
    
    res.json({
      success: true,
      invoice: invoice[0]
    });
    
  } catch (error) {
    console.log(`[ERROR] Get invoice by bubble_id error:`, error.message);
    res.status(500).json({ 
      error: 'Database error', 
      message: error.message,
      bubble_id: req.params.bubbleId
    });
  }
});

// Get commission report for agent
app.get('/api/commission/report', async (req, res) => {
  try {
    const { agent, month, agent_type } = req.query;
    console.log(`[DEBUG] Commission report request - agent: ${agent}, month: ${month}, type: ${agent_type}`);
    
    if (!agent || !month || !agent_type) {
      return res.status(400).json({ 
        error: 'Missing required parameters', 
        message: 'agent, month, and agent_type parameters are required' 
      });
    }

    if (agent_type !== 'internal') {
      return res.status(400).json({ 
        error: 'Unsupported agent type', 
        message: 'Only internal agent commission calculation is currently supported' 
      });
    }

    // Get agent details
    const agentDetails = await prisma.$queryRaw`
      SELECT name, agent_type 
      FROM agent 
      WHERE bubble_id = ${agent}
    `;
    
    if (agentDetails.length === 0) {
      return res.status(404).json({ 
        error: 'Agent not found', 
        message: `Agent with ID ${agent} not found` 
      });
    }

    const agentData = agentDetails[0];
    
    // Verify agent type matches request
    if (agentData.agent_type !== agent_type) {
      return res.status(400).json({ 
        error: 'Agent type mismatch', 
        message: `Agent is not of type ${agent_type}` 
      });
    }

    // Get invoices for this agent with full payment date in the selected month
    const [year, monthNum] = month.split('-');
    const invoices = await prisma.$queryRaw`
      SELECT 
        i.bubble_id,
        i.invoice_id,
        i.amount,
        i.amount_eligible_for_comm,
        i.full_payment_date,
        i.achieved_monthly_anp,
        cp.name as customer_name
      FROM invoice i
      LEFT JOIN customer_profile cp ON i.linked_customer = cp.bubble_id
      WHERE i.linked_agent = ${agent}
        AND i.paid = true
        AND i.full_payment_date IS NOT NULL
        AND EXTRACT(YEAR FROM i.full_payment_date) = ${parseInt(year)}
        AND EXTRACT(MONTH FROM i.full_payment_date) = ${parseInt(monthNum)}
      ORDER BY i.full_payment_date ASC
    `;

    console.log(`[DEBUG] Found ${invoices.length} invoices for commission calculation`);

    let totalBasicCommission = 0;
    let totalBonusCommission = 0;
    const processedInvoices = [];

    // Calculate commission for each invoice
    for (const invoice of invoices) {
      // Basic commission = 3% of amount_eligible_for_comm
      const eligibleAmount = parseFloat(invoice.amount_eligible_for_comm || 0);
      const basicCommission = eligibleAmount * 0.03;
      
      // Bonus commission based on achieved_monthly_anp
      const monthlyANP = parseFloat(invoice.achieved_monthly_anp || 0);
      let bonusCommission = 0;
      
      if (monthlyANP >= 60000 && monthlyANP <= 179999) {
        bonusCommission = 500;
      } else if (monthlyANP >= 180000 && monthlyANP <= 359999) {
        bonusCommission = 1000;
      } else if (monthlyANP >= 360000) {
        bonusCommission = 1500;
      }

      const totalCommission = basicCommission + bonusCommission;

      totalBasicCommission += basicCommission;
      totalBonusCommission += bonusCommission;

      processedInvoices.push({
        bubble_id: invoice.bubble_id,
        invoice_id: invoice.invoice_id,
        customer_name: invoice.customer_name || 'Unknown Customer',
        full_payment_date: invoice.full_payment_date,
        amount: parseFloat(invoice.amount || 0),
        amount_eligible_for_comm: eligibleAmount,
        achieved_monthly_anp: monthlyANP,
        basic_commission: basicCommission,
        bonus_commission: bonusCommission,
        total_commission: totalCommission
      });
    }

    const totalCommission = totalBasicCommission + totalBonusCommission;

    console.log(`[DEBUG] Commission calculation completed - Basic: ${totalBasicCommission}, Bonus: ${totalBonusCommission}, Total: ${totalCommission}`);

    res.json({
      invoices: processedInvoices,
      total_basic_commission: totalBasicCommission,
      total_bonus_commission: totalBonusCommission,
      total_commission: totalCommission,
      agent_name: agentData.name,
      selected_month: month
    });

  } catch (error) {
    console.log(`[ERROR] Commission report API error:`, error.message);
    res.status(500).json({ 
      error: 'Database error', 
      message: error.message 
    });
  }
});

// Get monthly commission report - group invoices by agent for selected month
app.get('/api/commission/monthly-report', async (req, res) => {
  try {
    const { month } = req.query;
    console.log(`[DEBUG] Monthly commission report request - month: ${month}`);

    if (!month) {
      return res.status(400).json({
        error: 'Missing required parameter',
        message: 'month parameter is required (format: YYYY-MM)'
      });
    }

    // Validate month format
    const monthPattern = /^\d{4}-\d{2}$/;
    if (!monthPattern.test(month)) {
      return res.status(400).json({
        error: 'Invalid month format',
        message: 'Month must be in YYYY-MM format'
      });
    }

    const [year, monthNum] = month.split('-');

    // Get all invoices with full payment date in the selected month, grouped by agent
    const invoicesByAgent = await prisma.$queryRaw`
      SELECT
        a.bubble_id as agent_bubble_id,
        a.name as agent_name,
        a.agent_type,
        COUNT(i.bubble_id) as invoice_count,
        SUM(CAST(i.amount_eligible_for_comm AS DECIMAL)) as total_eligible_amount
      FROM invoice i
      INNER JOIN agent a ON i.linked_agent = a.bubble_id
      WHERE i.paid = true
        AND i.full_payment_date IS NOT NULL
        AND EXTRACT(YEAR FROM i.full_payment_date) = ${parseInt(year)}
        AND EXTRACT(MONTH FROM i.full_payment_date) = ${parseInt(monthNum)}
        AND i.amount_eligible_for_comm IS NOT NULL
      GROUP BY a.bubble_id, a.name, a.agent_type
      ORDER BY total_eligible_amount DESC
    `;

    console.log(`[DEBUG] Found ${invoicesByAgent.length} agents with commission invoices`);

    // Calculate totals
    let totalInvoices = 0;
    let totalEligibleAmount = 0;

    const formattedAgents = invoicesByAgent.map(agent => {
      const invoiceCount = parseInt(agent.invoice_count || 0);
      const eligibleAmount = parseFloat(agent.total_eligible_amount || 0);

      totalInvoices += invoiceCount;
      totalEligibleAmount += eligibleAmount;

      return {
        agent_bubble_id: agent.agent_bubble_id,
        agent_name: agent.agent_name || 'Unknown Agent',
        agent_type: agent.agent_type || 'unknown',
        invoice_count: invoiceCount,
        total_eligible_amount: eligibleAmount
      };
    });

    console.log(`[DEBUG] Monthly commission report completed - ${formattedAgents.length} agents, ${totalInvoices} invoices, RM ${totalEligibleAmount.toFixed(2)} total eligible`);

    res.json({
      agents: formattedAgents,
      selected_month: month,
      total_invoices: totalInvoices,
      total_eligible_amount: totalEligibleAmount
    });

  } catch (error) {
    console.log(`[ERROR] Monthly commission report API error:`, error.message);
    res.status(500).json({
      error: 'Database error',
      message: error.message
    });
  }
});

// Debug endpoint to scan PostgreSQL schema for generated_commission_report table
app.get('/api/debug/commission-report-schema', async (req, res) => {
  try {
    console.log(`[DEBUG] Scanning schema for generated_commission_report table`);

    // Check if generated_commission_report table exists
    const tableExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'generated_commission_report'
      ) as table_exists
    `;

    let schema = null;
    if (tableExists[0]?.table_exists) {
      // Get table schema
      schema = await prisma.$queryRaw`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'generated_commission_report'
        ORDER BY ordinal_position
      `;
    }

    // Also check related tables
    const invoiceSchema = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'invoice'
      AND column_name IN ('bubble_id', 'linked_agent', 'amount_eligible_for_comm', 'achieved_monthly_anp', 'full_payment_date', 'paid')
      ORDER BY ordinal_position
    `;

    const agentSchema = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'agent'
      AND column_name IN ('bubble_id', 'name', 'agent_type')
      ORDER BY ordinal_position
    `;

    console.log(`[DEBUG] Table exists: ${tableExists[0]?.table_exists}`);
    console.log(`[DEBUG] Schema columns: ${schema?.length || 0}`);

    res.json({
      generated_commission_report: {
        table_exists: tableExists[0]?.table_exists || false,
        schema: schema || []
      },
      invoice_schema: invoiceSchema,
      agent_schema: agentSchema
    });

  } catch (error) {
    console.log(`[ERROR] Schema scan error:`, error.message);
    res.status(500).json({
      error: 'Schema scan error',
      message: error.message
    });
  }
});

// Generate and store commission report for specific agent in monthly report
app.post('/api/commission/generate-report', async (req, res) => {
  try {
    const { agent_id, month_period } = req.body;
    console.log(`[DEBUG] Generating commission report - agent: ${agent_id}, month: ${month_period}`);

    if (!agent_id || !month_period) {
      return res.status(400).json({
        error: 'Missing required parameters',
        message: 'agent_id and month_period are required'
      });
    }

    // Validate month format
    const monthPattern = /^\d{4}-\d{2}$/;
    if (!monthPattern.test(month_period)) {
      return res.status(400).json({
        error: 'Invalid month format',
        message: 'month_period must be in YYYY-MM format'
      });
    }

    const [year, monthNum] = month_period.split('-');

    // Get agent details
    const agentDetails = await prisma.$queryRaw`
      SELECT bubble_id, name, agent_type
      FROM agent
      WHERE bubble_id = ${agent_id}
    `;

    if (agentDetails.length === 0) {
      return res.status(404).json({
        error: 'Agent not found',
        message: `Agent with ID ${agent_id} not found`
      });
    }

    const agent = agentDetails[0];

    // Get invoices for this agent with full payment date in the selected month
    const invoices = await prisma.$queryRaw`
      SELECT
        i.bubble_id,
        i.invoice_id,
        i.amount,
        i.amount_eligible_for_comm,
        i.achieved_monthly_anp,
        i.full_payment_date,
        i.eligible_amount_description,
        cp.name as customer_name
      FROM invoice i
      LEFT JOIN customer_profile cp ON i.linked_customer = cp.bubble_id
      WHERE i.linked_agent = ${agent_id}
        AND i.paid = true
        AND i.full_payment_date IS NOT NULL
        AND EXTRACT(YEAR FROM i.full_payment_date) = ${parseInt(year)}
        AND EXTRACT(MONTH FROM i.full_payment_date) = ${parseInt(monthNum)}
        AND i.amount_eligible_for_comm IS NOT NULL
      ORDER BY i.invoice_id ASC
    `;

    console.log(`[DEBUG] Found ${invoices.length} invoices for commission calculation`);

    if (invoices.length === 0) {
      return res.status(404).json({
        error: 'No qualifying invoices found',
        message: `No paid invoices found for agent ${agent.name} in ${month_period}`
      });
    }

    let totalBasicCommission = 0;
    let totalBonusCommission = 0;
    const invoiceBubbleIds = [];
    const processedInvoices = [];

    // Calculate commission based on agent type
    for (const invoice of invoices) {
      const eligibleAmount = parseFloat(invoice.amount_eligible_for_comm || 0);
      const monthlyANP = parseFloat(invoice.achieved_monthly_anp || 0);
      const invoiceAmount = parseFloat(invoice.amount || 0);
      invoiceBubbleIds.push(invoice.bubble_id);

      let basicCommission = 0;
      let bonusCommission = 0;

      if (agent.agent_type === 'internal') {
        // Internal agent calculation (same as existing Agent Commission Report)
        basicCommission = eligibleAmount * 0.03; // 3%

        // Bonus commission based on achieved_monthly_anp
        if (monthlyANP >= 60000 && monthlyANP <= 179999) {
          bonusCommission = 500;
        } else if (monthlyANP >= 180000 && monthlyANP <= 359999) {
          bonusCommission = 1000;
        } else if (monthlyANP >= 360000) {
          bonusCommission = 1500;
        }

      } else if (agent.agent_type === 'outsource') {
        // Outsource agent calculation
        if (monthlyANP < 180000) {
          basicCommission = eligibleAmount * 0.045; // 4.5%
        } else if (monthlyANP >= 180000 && monthlyANP <= 359999) {
          basicCommission = eligibleAmount * 0.055; // 5.5%
        } else if (monthlyANP >= 360000) {
          basicCommission = eligibleAmount * 0.065; // 6.5%
        }
        // No bonus commission for outsource agents
        bonusCommission = 0;
      }

      const totalCommissionForInvoice = basicCommission + bonusCommission;

      totalBasicCommission += basicCommission;
      totalBonusCommission += bonusCommission;

      // Add detailed invoice data for frontend display
      processedInvoices.push({
        bubble_id: invoice.bubble_id,
        invoice_id: invoice.invoice_id,
        customer_name: invoice.customer_name || 'Unknown Customer',
        full_payment_date: invoice.full_payment_date,
        amount: invoiceAmount,
        amount_eligible_for_comm: eligibleAmount,
        achieved_monthly_anp: monthlyANP,
        basic_commission: basicCommission,
        bonus_commission: bonusCommission,
        total_commission: totalCommissionForInvoice,
        eligible_amount_description: invoice.eligible_amount_description || ''
      });

      console.log(`[DEBUG] Invoice ${invoice.invoice_id}: Eligible: ${eligibleAmount}, ANP: ${monthlyANP}, Basic: ${basicCommission}, Bonus: ${bonusCommission}`);
    }

    const finalTotalCommission = totalBasicCommission + totalBonusCommission;
    const reportId = `${agent_id}_${month_period}_${Date.now()}`;

    // Fetch commission adjustments
    const adjustments = await prisma.commission_adjustment.findMany({
      where: {
        agent_id: agent_id,
        adjustment_month: month_period,
      },
    });

    const totalAdjustments = adjustments.reduce((acc, adj) => acc + parseFloat(adj.amount), 0);
    const finalCommissionWithAdjustments = finalTotalCommission + totalAdjustments;

    // Check if report already exists for this agent and month
    const existingReport = await prisma.$queryRaw`
      SELECT report_id FROM generated_commission_report
      WHERE agent_id = ${agent_id} AND month_period = ${month_period}
    `;

    if (existingReport.length > 0) {
      // Update existing report
      await prisma.$executeRaw`
        UPDATE generated_commission_report
        SET
          total_basic_commission = ${totalBasicCommission},
          total_bonus_commission = ${totalBonusCommission},
          total_adjustments = ${totalAdjustments},
          final_total_commission = ${finalCommissionWithAdjustments},
          invoice_bubble_ids = ${JSON.stringify(invoiceBubbleIds)}::jsonb,
          created_at = NOW(),
          created_by = 'system_v2.0'
        WHERE agent_id = ${agent_id} AND month_period = ${month_period}
      `;

      console.log(`[DEBUG] Updated existing commission report for ${agent.name} - ${month_period}`);
    } else {
      // Create new report
      await prisma.$executeRaw`
        INSERT INTO generated_commission_report (
          report_id,
          agent_id,
          agent_name,
          month_period,
          total_basic_commission,
          total_bonus_commission,
          total_adjustments,
          final_total_commission,
          commission_paid,
          invoice_bubble_ids,
          created_at,
          created_by
        ) VALUES (
          ${reportId},
          ${agent_id},
          ${agent.name},
          ${month_period},
          ${totalBasicCommission},
          ${totalBonusCommission},
          ${totalAdjustments},
          ${finalCommissionWithAdjustments},
          false,
          ${JSON.stringify(invoiceBubbleIds)}::jsonb,
          NOW(),
          'system_v2.0'
        )
      `;

      console.log(`[DEBUG] Created new commission report for ${agent.name} - ${month_period}`);
    }

    console.log(`[DEBUG] Commission report generated - Agent: ${agent.name}, Month: ${month_period}, Basic: ${totalBasicCommission}, Bonus: ${totalBonusCommission}, Final: ${finalCommissionWithAdjustments}`);

    res.json({
      success: true,
      report_id: existingReport.length > 0 ? existingReport[0].report_id : reportId,
      agent_id: agent_id,
      agent_name: agent.name,
      agent_type: agent.agent_type,
      month_period: month_period,
      invoices_count: invoices.length,
      total_basic_commission: totalBasicCommission,
      total_bonus_commission: totalBonusCommission,
      total_adjustments: totalAdjustments,
      final_total_commission: finalCommissionWithAdjustments,
      invoice_bubble_ids: invoiceBubbleIds,
      action: existingReport.length > 0 ? 'updated' : 'created',
      // Add detailed invoice breakdown for frontend display
      invoices: processedInvoices,
      adjustments: adjustments,
    });

  } catch (error) {
    console.log(`[ERROR] Commission report generation error:`, error.message);
    res.status(500).json({
      error: 'Commission report generation failed',
      message: error.message
    });
  }
});

app.post('/api/commission/add-adjustment', async (req, res) => {
  try {
    console.log('[DEBUG] Commission adjustment request body:', req.body);

    const {
      agent_id,
      agent_name,
      amount,
      description,
      created_by,
      adjustment_month
    } = req.body;

    console.log('[DEBUG] Extracted fields:', {
      agent_id: !!agent_id,
      agent_name: !!agent_name,
      amount: !!amount,
      description: !!description,
      created_by: !!created_by,
      adjustment_month: !!adjustment_month
    });

    if (!agent_id || !agent_name || amount === undefined || amount === null || !description || !created_by || !adjustment_month) {
      console.log('[ERROR] Missing fields - Full validation:', {
        agent_id,
        agent_name,
        amount,
        description,
        created_by,
        adjustment_month
      });
      return res.status(400).json({
        success: false,
        message: 'Missing required fields for commission adjustment.'
      });
    }

    const adjustment = await prisma.commission_adjustment.create({
      data: {
        agent_id,
        agent_name,
        amount: parseFloat(amount),
        description,
        created_by,
        adjustment_month: adjustment_month,
      },
    });

    res.json({
      success: true,
      adjustment
    });

  } catch (error) {
    console.log(`[ERROR] Add commission adjustment error:`, error.message);
    res.status(500).json({
      error: 'Failed to add commission adjustment',
      message: error.message
    });
  }
});


// Delete commission adjustment
app.delete('/api/commission/delete-adjustment/:id', async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`[DEBUG] Deleting commission adjustment ${id}`);

    const deletedAdjustment = await prisma.commission_adjustment.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Commission adjustment deleted successfully',
      adjustment: deletedAdjustment
    });

  } catch (error) {
    console.log(`[ERROR] Delete commission adjustment error:`, error.message);
    res.status(500).json({
      error: 'Failed to delete commission adjustment',
      message: error.message
    });
  }
});

// Get payment details for a specific invoice
app.get('/api/payments/invoice/:invoiceId', async (req, res) => {
  try {
    const { invoiceId } = req.params;
    console.log(`[DEBUG] Getting payment details for invoice: ${invoiceId}`);
    
    // CORRECTED APPROACH: Find payments where linked_invoice matches the invoiceId
    // Based on payment table structure, payments link TO invoices via linked_invoice field
    const payments = await prisma.$queryRaw`
      SELECT 
        p.bubble_id,
        p.amount,
        p.payment_method,
        p.payment_date,
        p.verified_by,
        p.created_date,
        p.remark
      FROM payment p
      WHERE p.linked_invoice = ${invoiceId}
      ORDER BY COALESCE(p.payment_date, p.created_date) ASC
    `;

    console.log(`[DEBUG] Found ${payments.length} payments for invoice ${invoiceId}`);
    console.log(`[DEBUG] Payment query result:`, JSON.stringify(payments, null, 2));

    // If we found payments, try to get verification info
    let paymentsWithVerification = payments;
    if (payments.length > 0) {
      try {
        paymentsWithVerification = await prisma.$queryRaw`
          SELECT 
            p.bubble_id,
            p.amount,
            p.payment_method,
            p.payment_date,
            p.verified_by,
            p.created_date,
            p.remark,
            a.name as verified_by_name
          FROM payment p
          LEFT JOIN "user" u ON p.verified_by = u.bubble_id
          LEFT JOIN agent a ON u.linked_agent_profile = a.bubble_id
          WHERE p.linked_invoice = ${invoiceId}
          ORDER BY COALESCE(p.payment_date, p.created_date) ASC
        `;
        console.log(`[DEBUG] Retrieved payments with verification info`);
      } catch (joinError) {
        console.log(`[DEBUG] Could not get verification info, using basic payment data: ${joinError.message}`);
        // Fall back to payments without verification info
      }
    }

    const formattedPayments = paymentsWithVerification.map(payment => ({
      bubble_id: payment.bubble_id,
      amount: payment.amount,
      payment_method: payment.payment_method,
      payment_date: payment.payment_date || payment.created_date,
      verified_by_name: payment.verified_by_name || 'Unknown',
      remark: payment.remark
    }));

    console.log(`[DEBUG] Returning ${formattedPayments.length} formatted payments`);

    res.json({ 
      payments: formattedPayments
    });

  } catch (error) {
    console.log(`[ERROR] Payment details API error:`, error.message);
    console.log(`[ERROR] Full error:`, error);
    res.status(500).json({ 
      error: 'Database error', 
      message: error.message 
    });
  }
});

// Quick test for specific invoice details API
app.get('/api/test/invoice-details/:invoiceId', async (req, res) => {
  try {
    const { invoiceId } = req.params;
    console.log(`[TEST] Testing invoice details for: ${invoiceId}`);
    
    // Test if invoice exists
    const invoiceExists = await prisma.$queryRaw`
      SELECT bubble_id, invoice_id, amount, linked_customer
      FROM invoice 
      WHERE bubble_id = ${invoiceId}
      LIMIT 1
    `;
    
    // Test if customer_profile table exists
    const customerTableExists = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'customer_profile'
    `;
    
    // Test if invoice_item table exists
    const invoiceItemTableExists = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'invoice_item'
    `;
    
    const response = {
      invoice_id: invoiceId,
      invoice_exists: invoiceExists.length > 0,
      invoice_data: invoiceExists[0] || null,
      customer_table_exists: customerTableExists.length > 0,
      invoice_item_table_exists: invoiceItemTableExists.length > 0,
      timestamp: new Date().toISOString()
    };
    
    console.log(`[TEST] Invoice test result:`, JSON.stringify(response, null, 2));
    
    res.json(response);
    
  } catch (error) {
    console.log(`[TEST ERROR] Invoice test error:`, error.message);
    res.status(500).json({ 
      error: 'Test error', 
      message: error.message,
      invoice_id: req.params.invoiceId
    });
  }
});

// Debug endpoint to understand database structure  
app.get('/api/debug/invoice/:invoiceId', async (req, res) => {
  try {
    const { invoiceId } = req.params;
    console.log(`[DEBUG] Debug endpoint for invoice: ${invoiceId}`);
    
    // First, discover what tables actually exist in the database
    const allTables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;
    
    console.log(`[DEBUG] All tables in database:`, allTables.map(t => t.table_name));
    
    // Check if specific tables exist
    const invoiceTableExists = allTables.some(t => t.table_name === 'invoice');
    const paymentTableExists = allTables.some(t => t.table_name === 'payment');
    const syncedRecordsExists = allTables.some(t => t.table_name === 'synced_records');
    
    console.log(`[DEBUG] Table existence - invoice: ${invoiceTableExists}, payment: ${paymentTableExists}, synced_records: ${syncedRecordsExists}`);
    
    let invoiceFromTable = null;
    let paymentSample = null;
    
    // If invoice table exists, try to find the specific invoice
    if (invoiceTableExists) {
      try {
        invoiceFromTable = await prisma.$queryRaw`
          SELECT * FROM invoice WHERE bubble_id = ${invoiceId} LIMIT 1
        `;
        console.log(`[DEBUG] Invoice from table:`, JSON.stringify(invoiceFromTable, null, 2));
        
        // If found, also get a sample of payments for this invoice
        if (invoiceFromTable.length > 0 && paymentTableExists && invoiceFromTable[0].linked_payment) {
          try {
            paymentSample = await prisma.$queryRaw`
              SELECT COUNT(*) as payment_count 
              FROM payment 
              WHERE bubble_id = ANY(${invoiceFromTable[0].linked_payment})
            `;
            console.log(`[DEBUG] Payment count for this invoice:`, paymentSample[0]?.payment_count);
          } catch (payError) {
            console.log(`[DEBUG] Error checking payment count: ${payError.message}`);
          }
        }
      } catch (error) {
        console.log(`[DEBUG] Error querying invoice table: ${error.message}`);
      }
    }
    
    // If no specific tables exist, check for any table containing invoice data
    let alternativeInvoiceData = null;
    if (!invoiceTableExists) {
      // Look for tables that might contain invoice data
      for (const table of allTables) {
        try {
          const hasInvoiceId = await prisma.$queryRaw`
            SELECT COUNT(*) as count 
            FROM information_schema.columns 
            WHERE table_name = ${table.table_name} 
            AND (column_name ILIKE '%invoice%' OR column_name ILIKE '%bubble_id%')
          `;
          
          if (hasInvoiceId[0].count > 0) {
            console.log(`[DEBUG] Table ${table.table_name} might contain invoice data`);
            // Try to find our invoice in this table
            const sampleData = await prisma.$queryRawUnsafe(`
              SELECT * FROM "${table.table_name}" 
              WHERE bubble_id = '${invoiceId}' OR invoice_id = '${invoiceId}'
              LIMIT 1
            `);
            if (sampleData.length > 0) {
              alternativeInvoiceData = {
                tableName: table.table_name,
                data: sampleData[0],
                columns: Object.keys(sampleData[0])
              };
              break;
            }
          }
        } catch (error) {
          // Skip tables that can't be queried
          console.log(`[DEBUG] Could not check table ${table.table_name}: ${error.message}`);
        }
      }
    }
    
    // Helper function to convert BigInt to string for JSON serialization
    const sanitizeForJson = (obj) => {
      return JSON.parse(JSON.stringify(obj, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
      ));
    };

    const response = {
      invoiceId,
      allTables: allTables.map(t => t.table_name),
      tableExists: {
        invoice: invoiceTableExists,
        payment: paymentTableExists,
        synced_records: syncedRecordsExists
      },
      invoiceData: invoiceFromTable && invoiceFromTable.length > 0 ? {
        found: true,
        columns: Object.keys(invoiceFromTable[0]),
        linkedPayment: invoiceFromTable[0]?.linked_payment,
        paymentCount: paymentSample?.[0]?.payment_count?.toString()
      } : { found: false },
      alternativeInvoiceData: alternativeInvoiceData ? sanitizeForJson(alternativeInvoiceData) : null
    };

    res.json(sanitizeForJson(response));
    
  } catch (error) {
    console.log(`[DEBUG] Debug endpoint error:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

// Flexible data fetching API for development and data operations
app.get('/api/data/fetch/:tableName', async (req, res) => {
  try {
    const { tableName } = req.params;
    const { limit = 50, offset = 0, sort_order = 'DESC' } = req.query;
    
    console.log(`[DEBUG] Data fetch request - Table: ${tableName}, Limit: ${limit}, Offset: ${offset}, Sort: ${sort_order}`);
    
    // Validate table name exists and get its schema
    const tableExists = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      AND table_name = ${tableName}
    `;
    
    if (tableExists.length === 0) {
      return res.status(404).json({ 
        error: 'Table not found', 
        message: `Table '${tableName}' does not exist`,
        available_tables: await getAvailableTables()
      });
    }
    
    // Get table column information
    const columns = await prisma.$queryRaw`
      SELECT 
        column_name, 
        data_type, 
        is_nullable,
        column_default,
        ordinal_position
      FROM information_schema.columns 
      WHERE table_name = ${tableName}
      AND table_schema = 'public'
      ORDER BY ordinal_position
    `;
    
    // Find the best date column to sort by (prioritize creation_date, created_at, created_date, etc.)
    const dateColumns = ['created_date', 'created_at', 'creation_date', 'date_created', 'timestamp', 'synced_at', 'updated_at'];
    let sortColumn = null;
    
    for (const dateCol of dateColumns) {
      const foundCol = columns.find(col => col.column_name.toLowerCase() === dateCol);
      if (foundCol) {
        sortColumn = foundCol.column_name;
        break;
      }
    }
    
    // If no date column found, try to find any column with 'id' for consistent sorting
    if (!sortColumn) {
      const idColumn = columns.find(col => col.column_name.toLowerCase().includes('id'));
      if (idColumn) {
        sortColumn = idColumn.column_name;
      }
    }
    
    // Build the query with dynamic sorting
    let orderByClause = '';
    if (sortColumn) {
      orderByClause = `ORDER BY "${sortColumn}" ${sort_order.toUpperCase()}`;
    }
    
    const query = `
      SELECT * FROM "${tableName}" 
      ${orderByClause}
      LIMIT ${parseInt(limit)} 
      OFFSET ${parseInt(offset)}
    `;
    
    console.log(`[DEBUG] Executing query: ${query}`);
    
    const records = await prisma.$queryRawUnsafe(query);
    
    // Get total count
    const totalCountResult = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM "${tableName}"`);
    const totalCount = parseInt(totalCountResult[0].count);
    
    // Clean data for JSON response (handle BigInt)
    const cleanedRecords = records.map(record => 
      JSON.parse(JSON.stringify(record, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
      ))
    );
    
    console.log(`[DEBUG] Successfully fetched ${cleanedRecords.length} records from ${tableName}`);
    
    const response = {
      table_name: tableName,
      total_records: totalCount,
      returned_records: cleanedRecords.length,
      limit: parseInt(limit),
      offset: parseInt(offset),
      sort_column: sortColumn,
      sort_order: sort_order.toUpperCase(),
      schema: {
        columns: columns.map(col => ({
          name: col.column_name,
          type: col.data_type,
          nullable: col.is_nullable === 'YES',
          default: col.column_default,
          position: col.ordinal_position
        }))
      },
      data: cleanedRecords
    };
    
    res.json(response);
    
  } catch (error) {
    console.log(`[ERROR] Data fetch error for table ${req.params.tableName}:`, error.message);
    res.status(500).json({ 
      error: 'Database error', 
      message: error.message,
      table: req.params.tableName
    });
  }
});

// Helper function to get available tables
async function getAvailableTables() {
  try {
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;
    return tables.map(t => t.table_name);
  } catch (error) {
    return [];
  }
}

// Get list of all available tables with basic info
app.get('/api/data/tables', async (req, res) => {
  try {
    console.log(`[DEBUG] Getting list of all available tables`);
    
    const tables = await prisma.$queryRaw`
      SELECT 
        t.table_name,
        (SELECT COUNT(*) FROM information_schema.columns c WHERE c.table_name = t.table_name AND c.table_schema = 'public') as column_count
      FROM information_schema.tables t
      WHERE t.table_schema = 'public' 
      AND t.table_type = 'BASE TABLE'
      ORDER BY t.table_name
    `;
    
    // Get record counts for each table
    const tablesWithCounts = await Promise.all(
      tables.map(async (table) => {
        try {
          const countResult = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM "${table.table_name}"`);
          return {
            table_name: table.table_name,
            column_count: parseInt(table.column_count),
            record_count: parseInt(countResult[0].count)
          };
        } catch (error) {
          return {
            table_name: table.table_name,
            column_count: parseInt(table.column_count),
            record_count: 0,
            error: error.message
          };
        }
      })
    );
    
    console.log(`[DEBUG] Found ${tablesWithCounts.length} tables`);
    
    res.json({
      total_tables: tablesWithCounts.length,
      tables: tablesWithCounts
    });
    
  } catch (error) {
    console.log(`[ERROR] Tables list error:`, error.message);
    res.status(500).json({ 
      error: 'Database error', 
      message: error.message 
    });
  }
});

// Simple API to check any table directly
app.get('/api/table/check/:tableName', async (req, res) => {
  try {
    const { tableName } = req.params;
    console.log(`[DEBUG] Checking table ${tableName} directly`);
    
    // Get first 5 records to see the structure
    const records = await prisma.$queryRawUnsafe(`
      SELECT * FROM "${tableName}" 
      ORDER BY id DESC 
      LIMIT 5
    `);
    
    console.log(`[DEBUG] Found ${records.length} records in ${tableName}`);
    console.log(`[DEBUG] Sample ${tableName} structure:`, JSON.stringify(records[0], (key, value) =>
      typeof value === 'bigint' ? value.toString() : value, 2));
    
    // Get count of all records
    const totalCount = await prisma.$queryRawUnsafe(`
      SELECT COUNT(*) as count FROM "${tableName}"
    `);
    
    res.json({
      tableName,
      totalRecords: totalCount[0].count.toString(),
      sampleRecords: records.map(r => 
        JSON.parse(JSON.stringify(r, (key, value) =>
          typeof value === 'bigint' ? value.toString() : value
        ))
      )
    });
    
  } catch (error) {
    console.log(`[DEBUG] Error checking table ${req.params.tableName}:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

// Simple API to check payment table directly (keep for backward compatibility)
app.get('/api/payments/check', async (req, res) => {
  try {
    console.log('[DEBUG] Checking payment table directly');
    
    // Get first 5 payment records to see the structure
    const payments = await prisma.$queryRaw`
      SELECT * FROM payment 
      ORDER BY payment_date DESC 
      LIMIT 5
    `;
    
    console.log(`[DEBUG] Found ${payments.length} payment records`);
    console.log('[DEBUG] Sample payment structure:', JSON.stringify(payments[0], (key, value) =>
      typeof value === 'bigint' ? value.toString() : value, 2));
    
    // Get count of all payments
    const totalCount = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM payment
    `;
    
    res.json({
      totalPayments: totalCount[0].count.toString(),
      samplePayments: payments.map(p => 
        JSON.parse(JSON.stringify(p, (key, value) =>
          typeof value === 'bigint' ? value.toString() : value
        ))
      )
    });
    
  } catch (error) {
    console.log('[DEBUG] Error checking payment table:', error.message);
    res.status(500).json({ error: error.message });
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


// WhatsApp Test Scheduler - Check for missing reports every 5 minutes
const formatMalaysiaPhone = (contact) => {
  if (!contact) return null;
  const clean = contact.replace(/\D/g, ''); // Remove non-digits
  if (clean.startsWith('0')) {
    return '+6' + clean; // 0123456789 → +60123456789
  }
  return '+60' + clean; // 123456789 → +60123456789
};

const sendWhatsAppMessage = async (to, message) => {
  try {
    const response = await fetch('https://whatsapp-api-server-production-c15f.up.railway.app/api/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ to, message })
    });

    if (response.ok) {
      console.log(`[WHATSAPP] Message sent successfully to ${to}`);
      return { success: true };
    } else {
      const errorText = await response.text();
      console.error(`[WHATSAPP] Failed to send message: ${response.status} - ${errorText}`);
      return { success: false, error: errorText };
    }
  } catch (error) {
    console.error(`[WHATSAPP] Error sending message: ${error.message}`);
    return { success: false, error: error.message };
  }
};

const checkMissingReports = async () => {
  try {
    console.log('[SCHEDULER] Checking for missing reports...');

    // Get yesterday's date
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    console.log(`[SCHEDULER] Checking reports for date: ${yesterdayStr}`);

    // Get all users with "report" in access_level and their agent info
    const usersWithReportAccess = await prisma.$queryRaw`
      SELECT u.bubble_id as user_id, u.access_level, u.linked_agent_profile, a.name as agent_name, a.contact as agent_contact
      FROM "user" u
      LEFT JOIN agent a ON u.linked_agent_profile = a.bubble_id
      WHERE EXISTS (
        SELECT 1 FROM unnest(u.access_level) AS level
        WHERE level = 'report'
      )
      AND a.name IS NOT NULL
      AND a.contact IS NOT NULL
    `;

    console.log(`[SCHEDULER] Found ${usersWithReportAccess.length} users with report access`);

    // Get users who DID submit reports yesterday
    const usersWithReports = await prisma.$queryRaw`
      SELECT DISTINCT linked_user
      FROM agent_daily_report
      WHERE DATE(report_date) = ${yesterdayStr}
    `;

    const reportedUserIds = new Set(usersWithReports.map(r => r.linked_user));
    console.log(`[SCHEDULER] Found ${reportedUserIds.size} users who submitted reports yesterday`);

    // Find users who DIDN'T submit reports
    const missingReports = usersWithReportAccess.filter(user =>
      !reportedUserIds.has(user.user_id)
    );

    console.log(`[SCHEDULER] Found ${missingReports.length} users with missing reports`);

    if (missingReports.length > 0) {
      // Format message with all missing agents
      let message = `📋 Missing Reports Alert (${yesterdayStr}):\n\n`;

      missingReports.forEach((user, index) => {
        const formattedPhone = formatMalaysiaPhone(user.agent_contact);
        message += `${index + 1}. ${user.agent_name}\n`;
        message += `   WhatsApp: ${formattedPhone}\n\n`;
      });

      message += `Total: ${missingReports.length} agents did not submit reports yesterday.`;

      // Send to your test WhatsApp
      const result = await sendWhatsAppMessage('+601121000099', message);

      if (result.success) {
        console.log(`[SCHEDULER] Test message sent with ${missingReports.length} missing reports`);
      } else {
        console.error(`[SCHEDULER] Failed to send test message: ${result.error}`);
      }
    } else {
      // Send confirmation that all reports are submitted
      const message = `✅ All Reports Submitted (${yesterdayStr})\n\nAll ${usersWithReportAccess.length} agents with report access submitted their reports yesterday. Great job! 🎉`;
      await sendWhatsAppMessage('+601121000099', message);
      console.log(`[SCHEDULER] All reports submitted - confirmation sent`);
    }

  } catch (error) {
    console.error(`[SCHEDULER] Error checking missing reports: ${error.message}`);

    // Send error notification
    const errorMessage = `❌ Scheduler Error\n\nFailed to check missing reports: ${error.message}`;
    await sendWhatsAppMessage('+601121000099', errorMessage);
  }
};

// Start the scheduler - every 5 minutes for testing
cron.schedule('*/5 * * * *', () => {
  console.log('[SCHEDULER] Running 5-minute test job...');
  checkMissingReports();
});

console.log('[SCHEDULER] Test WhatsApp scheduler started - running every 5 minutes');

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