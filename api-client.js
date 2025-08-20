/**
 * Eternalgy Database API Client
 * Use this for local development to access Railway PostgreSQL database
 */

class EternalgyDBClient {
  constructor(baseUrl = 'https://your-railway-url.up.railway.app') {
    this.baseUrl = baseUrl;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}/api/db${endpoint}`;
    
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error.message);
      throw error;
    }
  }

  // Health check
  async checkHealth() {
    return this.request('/health');
  }

  // Get all data types with counts
  async getDataTypes() {
    return this.request('/data-types');
  }

  // Get records by data type
  async getRecords(dataType, options = {}) {
    const { limit = 50, offset = 0, search } = options;
    const params = new URLSearchParams({ limit, offset });
    if (search) params.append('search', search);
    
    return this.request(`/records/${dataType}?${params}`);
  }

  // Get specific record by bubble_id
  async getRecord(bubbleId) {
    return this.request(`/record/${bubbleId}`);
  }

  // Execute raw SQL query (SELECT only)
  async query(sql, params = []) {
    return this.request('/query', {
      method: 'POST',
      body: JSON.stringify({ sql, params })
    });
  }

  // Get admin users
  async getAdminUsers() {
    return this.request('/admin-users');
  }

  // Get dashboard settings
  async getSettings(userId = null) {
    const params = userId ? `?user_id=${userId}` : '';
    return this.request(`/settings${params}`);
  }

  // Get activity logs
  async getActivityLogs(options = {}) {
    const { limit = 100, offset = 0, user_id, action } = options;
    const params = new URLSearchParams({ limit, offset });
    if (user_id) params.append('user_id', user_id);
    if (action) params.append('action', action);
    
    return this.request(`/activity-logs?${params}`);
  }
}

// Example usage functions
async function exampleUsage() {
  // Initialize client with your Railway URL
  const client = new EternalgyDBClient('https://your-railway-url.up.railway.app');

  try {
    // Check database health
    console.log('🔍 Checking database health...');
    const health = await client.checkHealth();
    console.log('Health:', health);

    // Get all data types
    console.log('\n📊 Getting data types...');
    const dataTypes = await client.getDataTypes();
    console.log('Data Types:', dataTypes);

    // Get customers (example)
    if (dataTypes.some(t => t.data_type === 'Customer')) {
      console.log('\n👥 Getting customers...');
      const customers = await client.getRecords('Customer', { limit: 10 });
      console.log('Customers:', customers);
    }

    // Get admin users
    console.log('\n👤 Getting admin users...');
    const adminUsers = await client.getAdminUsers();
    console.log('Admin Users:', adminUsers);

    // Example SQL query
    console.log('\n🔍 Running example query...');
    const queryResult = await client.query('SELECT COUNT(*) as total FROM synced_records');
    console.log('Total Records:', queryResult);

  } catch (error) {
    console.error('❌ Example failed:', error.message);
  }
}

// Export for Node.js usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { EternalgyDBClient, exampleUsage };
}

// Export for ES6 modules
export { EternalgyDBClient, exampleUsage };

// Browser global
if (typeof window !== 'undefined') {
  window.EternalgyDBClient = EternalgyDBClient;
}

// Run example if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  exampleUsage();
}