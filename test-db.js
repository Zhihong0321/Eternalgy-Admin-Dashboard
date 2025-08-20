import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const prisma = new PrismaClient()

async function testConnection() {
  try {
    console.log('Testing database connection...')
    
    // Test basic connection
    await prisma.$connect()
    console.log('✅ Successfully connected to PostgreSQL database')
    
    // Test query execution
    const result = await prisma.$queryRaw`SELECT version();`
    console.log('✅ Database version:', result[0].version)
    
    // Check if tables exist
    const tables = await prisma.$queryRaw`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public';
    `
    console.log('📋 Existing tables:', tables.map(t => t.table_name))
    
    console.log('✅ Database connection test completed successfully!')
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

testConnection()