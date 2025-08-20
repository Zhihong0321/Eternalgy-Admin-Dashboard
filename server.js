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
      SELECT * FROM invoice WHERE paid_ = true LIMIT 1
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

// Debug route to check paid invoices directly
app.get('/api/debug/paid-invoices', async (req, res) => {
  try {
    console.log(`[DEBUG] Direct paid invoices check started`);
    
    // Check total invoices
    const totalInvoices = await prisma.$queryRaw`SELECT COUNT(*) as count FROM invoice`;
    console.log(`[DEBUG] Total invoices in database:`, totalInvoices[0].count);
    
    // Check paid invoices with different queries
    const paidTrue = await prisma.$queryRaw`SELECT COUNT(*) as count FROM invoice WHERE paid_ = true`;
    const paidFalse = await prisma.$queryRaw`SELECT COUNT(*) as count FROM invoice WHERE paid_ = false`;
    const paidNull = await prisma.$queryRaw`SELECT COUNT(*) as count FROM invoice WHERE paid_ IS NULL`;
    
    console.log(`[DEBUG] Paid = true:`, paidTrue[0].count);
    console.log(`[DEBUG] Paid = false:`, paidFalse[0].count);
    console.log(`[DEBUG] Paid = null:`, paidNull[0].count);
    
    // Get sample of paid invoices
    const samplePaid = await prisma.$queryRaw`
      SELECT bubble_id, paid_, amount, full_payment_date 
      FROM invoice 
      WHERE paid_ = true 
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
    let whereConditions = ['i.paid_ = true'];
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
        AND i.paid_ = true
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

// Get payment details for a specific invoice
app.get('/api/payments/invoice/:invoiceId', async (req, res) => {
  try {
    const { invoiceId } = req.params;
    console.log(`[DEBUG] Getting payment details for invoice: ${invoiceId}`);
    
    // First get the invoice to find linked payments
    const invoice = await prisma.$queryRaw`
      SELECT linked_payment, invoice_id
      FROM invoice 
      WHERE bubble_id = ${invoiceId}
    `;
    
    console.log(`[DEBUG] Invoice query result:`, JSON.stringify(invoice, null, 2));
    
    if (invoice.length === 0) {
      console.log(`[DEBUG] No invoice found with bubble_id: ${invoiceId}`);
      return res.json({ payments: [], message: 'Invoice not found' });
    }
    
    if (!invoice[0].linked_payment) {
      console.log(`[DEBUG] Invoice has no linked_payment field`);
      return res.json({ payments: [], message: 'No linked payments' });
    }

    const linkedPaymentIds = invoice[0].linked_payment;
    console.log(`[DEBUG] Found ${linkedPaymentIds.length} linked payment IDs:`, linkedPaymentIds);

    // Check if payments exist first
    const paymentCheck = await prisma.$queryRaw`
      SELECT COUNT(*) as count
      FROM payment p
      WHERE p.bubble_id = ANY(${linkedPaymentIds})
    `;
    
    console.log(`[DEBUG] Payment count check:`, paymentCheck[0].count);

    // Get payment details with verification information
    // First try simple query without joins to see if payments exist
    const paymentsSimple = await prisma.$queryRaw`
      SELECT 
        p.bubble_id,
        p.amount,
        p.payment_method,
        p.payment_date,
        p.verified_by
      FROM payment p
      WHERE p.bubble_id = ANY(${linkedPaymentIds})
      ORDER BY p.payment_date ASC
    `;

    console.log(`[DEBUG] Simple payments query result:`, JSON.stringify(paymentsSimple, null, 2));

    // Now try with joins for verification info
    const payments = await prisma.$queryRaw`
      SELECT 
        p.bubble_id,
        p.amount,
        p.payment_method,
        p.payment_date,
        p.verified_by,
        ap.name as verified_by_name
      FROM payment p
      LEFT JOIN "user" u ON p.verified_by = u.bubble_id
      LEFT JOIN agent_profile ap ON u.linked_agent_profile = ap.bubble_id
      WHERE p.bubble_id = ANY(${linkedPaymentIds})
      ORDER BY p.payment_date ASC
    `;

    console.log(`[DEBUG] Retrieved ${payments.length} payment records with joins`);

    const formattedPayments = payments.map(payment => ({
      bubble_id: payment.bubble_id,
      amount: payment.amount,
      payment_method: payment.payment_method,
      payment_date: payment.payment_date,
      verified_by_name: payment.verified_by_name
    }));

    console.log(`[DEBUG] Formatted payments:`, JSON.stringify(formattedPayments, null, 2));

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