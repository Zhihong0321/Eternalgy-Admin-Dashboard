# Eternalgy Database API Documentation

This API provides remote access to the PostgreSQL database for local development.

## Base URL
Replace `YOUR_RAILWAY_URL` with your actual Railway deployment URL:
```
https://your-railway-url.up.railway.app/api/db
```

## Authentication
Currently no authentication required (add as needed for production).

## Endpoints

### Health Check
```http
GET /api/db/health
```
Returns database connection status and version.

**Response:**
```json
{
  "status": "connected",
  "database": "postgresql", 
  "version": "PostgreSQL 15.x..."
}
```

### Get Data Types
```http
GET /api/db/data-types
```
Returns all available data types with record counts.

**Response:**
```json
[
  {
    "data_type": "Customer",
    "_count": { "data_type": 150 }
  },
  {
    "data_type": "Order", 
    "_count": { "data_type": 300 }
  }
]
```

### Get Records by Type
```http
GET /api/db/records/{dataType}?limit=50&offset=0&search=query
```

**Parameters:**
- `dataType` (path): The data type to fetch (e.g., "Customer", "Order")
- `limit` (query): Number of records to return (default: 50)
- `offset` (query): Number of records to skip (default: 0)
- `search` (query): Search term for filtering records

**Response:**
```json
{
  "records": [...],
  "pagination": {
    "total": 150,
    "limit": 50,
    "offset": 0,
    "hasMore": true
  }
}
```

### Get Specific Record
```http
GET /api/db/record/{bubbleId}
```
Returns a specific record by its Bubble.io ID.

### Execute SQL Query
```http
POST /api/db/query
```
Execute a raw SELECT query (read-only).

**Body:**
```json
{
  "sql": "SELECT COUNT(*) FROM synced_records WHERE data_type = $1",
  "params": ["Customer"]
}
```

### Admin Users
```http
GET /api/db/admin-users
```
Returns all admin users (excluding sensitive data).

### Dashboard Settings
```http
GET /api/db/settings?user_id=123
```
Returns dashboard settings, optionally filtered by user.

### Activity Logs
```http
GET /api/db/activity-logs?limit=100&offset=0&user_id=123&action=login
```
Returns activity logs with optional filtering.

## Usage Examples

### JavaScript/Node.js
```javascript
// Using the provided client
import { EternalgyDBClient } from './api-client.js';

const client = new EternalgyDBClient('https://your-railway-url.up.railway.app');

// Get health status
const health = await client.checkHealth();

// Get customers
const customers = await client.getRecords('Customer', { limit: 10 });

// Search orders
const orders = await client.getRecords('Order', { 
  search: 'pending',
  limit: 20 
});
```

### cURL Examples
```bash
# Health check
curl https://your-railway-url.up.railway.app/api/db/health

# Get data types
curl https://your-railway-url.up.railway.app/api/db/data-types

# Get customers
curl "https://your-railway-url.up.railway.app/api/db/records/Customer?limit=10"

# Execute query
curl -X POST https://your-railway-url.up.railway.app/api/db/query \
  -H "Content-Type: application/json" \
  -d '{"sql": "SELECT COUNT(*) FROM synced_records"}'
```

### Python Example
```python
import requests

base_url = "https://your-railway-url.up.railway.app/api/db"

# Health check
response = requests.get(f"{base_url}/health")
print(response.json())

# Get records
response = requests.get(f"{base_url}/records/Customer", 
                       params={"limit": 10})
data = response.json()
print(f"Found {len(data['records'])} customers")
```

## Error Responses
All endpoints return standard HTTP status codes:
- `200`: Success
- `404`: Record not found
- `500`: Server/database error

Error response format:
```json
{
  "error": "Error message",
  "message": "Detailed error description"
}
```

## Database Schema
The API provides access to these tables:
- `synced_records`: Bubble.io synced data (READ-ONLY)
- `sync_status`: Sync system status
- `admin_users`: Dashboard admin users
- `dashboard_settings`: User preferences
- `activity_logs`: Audit trail