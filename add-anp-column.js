import pkg from 'pg';
const { Client } = pkg;

const client = new Client({
  connectionString: 'postgresql://postgres:tkaYtCcfkqfsWKjQguFMqIcANbJNcNZA@shinkansen.proxy.rlwy.net:34999/railway'
});

async function addANPColumn() {
  try {
    await client.connect();
    console.log('Connected to PostgreSQL');
    
    // Add the achieved_monthly_anp column to invoice table
    console.log('Adding achieved_monthly_anp column to invoice table...');
    
    await client.query(`
      ALTER TABLE invoice 
      ADD COLUMN IF NOT EXISTS achieved_monthly_anp DECIMAL
    `);
    
    console.log('✅ Successfully added achieved_monthly_anp column to invoice table');
    
    // Verify the column was added
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'invoice' 
      AND column_name = 'achieved_monthly_anp'
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ Column verification successful:', result.rows[0]);
    } else {
      console.log('❌ Column not found after creation');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

addANPColumn();