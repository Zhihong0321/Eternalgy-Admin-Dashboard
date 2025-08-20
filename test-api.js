/**
 * Test script for the Database API
 * Run this locally to test API endpoints
 */

import { EternalgyDBClient } from './api-client.js';

async function testAPI() {
  console.log('🧪 Testing Eternalgy Database API');
  console.log('=====================================');

  // You'll need to replace this with your actual Railway URL
  const RAILWAY_URL = process.env.RAILWAY_URL || 'https://your-railway-url.up.railway.app';
  
  if (RAILWAY_URL === 'https://your-railway-url.up.railway.app') {
    console.log('❌ Please set RAILWAY_URL environment variable or update the URL in this script');
    console.log('   Example: export RAILWAY_URL=https://eternalgy-admin-dashboard-production.up.railway.app');
    return;
  }

  const client = new EternalgyDBClient(RAILWAY_URL);

  // Test 1: Health Check
  console.log('\n🔍 Test 1: Health Check');
  try {
    const health = await client.checkHealth();
    console.log('✅ Health check passed:', health.status);
    console.log('   Database:', health.database);
  } catch (error) {
    console.log('❌ Health check failed:', error.message);
    return; // Exit if basic connection fails
  }

  // Test 2: Get Data Types
  console.log('\n📊 Test 2: Get Data Types');
  try {
    const dataTypes = await client.getDataTypes();
    console.log(`✅ Found ${dataTypes.length} data types`);
    dataTypes.forEach(type => {
      console.log(`   - ${type.data_type}: ${type._count.data_type} records`);
    });
  } catch (error) {
    console.log('❌ Get data types failed:', error.message);
  }

  // Test 3: Get Admin Users
  console.log('\n👤 Test 3: Get Admin Users');
  try {
    const users = await client.getAdminUsers();
    console.log(`✅ Found ${users.length} admin users`);
    if (users.length === 0) {
      console.log('   (No admin users found - this is expected for a new setup)');
    }
  } catch (error) {
    console.log('❌ Get admin users failed:', error.message);
  }

  // Test 4: Get Settings
  console.log('\n⚙️  Test 4: Get Dashboard Settings');
  try {
    const settings = await client.getSettings();
    console.log(`✅ Found ${settings.length} settings`);
    if (settings.length === 0) {
      console.log('   (No settings found - this is expected for a new setup)');
    }
  } catch (error) {
    console.log('❌ Get settings failed:', error.message);
  }

  // Test 5: Execute Query
  console.log('\n🔍 Test 5: Execute SQL Query');
  try {
    const result = await client.query('SELECT COUNT(*) as total_records FROM synced_records');
    console.log('✅ Query executed successfully');
    console.log(`   Total synced records: ${result.result[0].total_records}`);
  } catch (error) {
    console.log('❌ SQL query failed:', error.message);
  }

  console.log('\n🎉 API testing complete!');
  console.log('\nNext steps:');
  console.log('1. Deploy this code to Railway');
  console.log('2. Set DATABASE_URL in Railway environment variables');
  console.log('3. Run `npm run db:push` to create database tables');
  console.log('4. Update the RAILWAY_URL in your local scripts');
}

// Run the test
testAPI().catch(console.error);