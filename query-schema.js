import pkg from 'pg';
const { Client } = pkg;

const client = new Client({
  connectionString: 'postgresql://postgres:tkaYtCcfkqfsWKjQguFMqIcANbJNcNZA@shinkansen.proxy.rlwy.net:34999/railway'
});

async function getSchemas() {
  try {
    await client.connect();
    console.log('Connected to PostgreSQL');
    
    // Get all tables
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    console.log('Tables found:', tablesResult.rows.map(r => r.table_name));
    
    const schemas = {};
    
    // Get structure for each table
    for (const table of tablesResult.rows) {
      const tableName = table.table_name;
      console.log(`\nGetting schema for: ${tableName}`);
      
      const columnsResult = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = $1
        ORDER BY ordinal_position
      `, [tableName]);
      
      schemas[tableName] = columnsResult.rows;
      console.log(`  - ${columnsResult.rows.length} columns found`);
    }
    
    // Write results to file
    const fs = await import('fs');
    await fs.writeFileSync('schema-results.json', JSON.stringify({
      tables: tablesResult.rows.map(r => r.table_name),
      schemas: schemas
    }, null, 2));
    
    console.log('\nSchema discovery complete! Results saved to schema-results.json');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

getSchemas();