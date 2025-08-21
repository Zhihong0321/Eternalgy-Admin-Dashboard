# Eternalgy Admin Dashboard 2.0 - API Documentation

## Overview
This document provides comprehensive API documentation for the Eternalgy Admin Dashboard 2.0 backend services. All endpoints return JSON responses and use standard HTTP status codes.

**Base URL:** `https://your-railway-deployment.railway.app`
**Version:** 2.0
**Last Updated:** August 21, 2025

---

## Table of Contents
1. [Health & Status](#health--status)
2. [Data Operations](#data-operations)
3. [Invoice Management](#invoice-management)
4. [Agent Management](#agent-management)
5. [Commission Reports](#commission-reports)
6. [ANP (Average New Premium) Operations](#anp-operations)
7. [Payment Operations](#payment-operations)
8. [Debug & Development](#debug--development)
9. [Error Handling](#error-handling)
10. [Authentication](#authentication)

---

## Health & Status

### Check API Health
**GET** `/api/health`

Returns basic API status information.

**Response:**
```json
{
  "message": "Eternalgy Admin Dashboard API",
  "status": "success"
}
```

### Database Status
**GET** `/api/db-status`

Check database connectivity and basic table status.

**Response:**
```json
{
  "status": "connected",
  "tables": { "synced_records": "exists" },
  "record_count": 15420
}
```

---

## Data Operations

### Fetch Data from Any Table
**GET** `/api/data/fetch/:tableName`

Flexible endpoint to fetch data from any database table with pagination and sorting.

**Parameters:**
- `tableName` (path, required) - Name of the database table
- `limit` (query, optional) - Number of records to return (default: 50, max: 1000)
- `offset` (query, optional) - Pagination offset (default: 0)
- `sort_order` (query, optional) - Sort order: `ASC` or `DESC` (default: DESC)

**Example Request:**
```
GET /api/data/fetch/invoice?limit=20&offset=0&sort_order=DESC
```

**Response:**
```json
{
  "table_name": "invoice",
  "total_records": 1250,
  "returned_records": 20,
  "limit": 20,
  "offset": 0,
  "sort_column": "created_date",
  "sort_order": "DESC",
  "schema": {
    "columns": [
      {
        "name": "bubble_id",
        "type": "text",
        "nullable": false,
        "default": null,
        "position": 1
      },
      {
        "name": "invoice_id",
        "type": "bigint",
        "nullable": true,
        "default": null,
        "position": 2
      }
    ]
  },
  "data": [
    {
      "bubble_id": "1234567890abcdef",
      "invoice_id": "12345",
      "amount": "25000.00",
      "created_date": "2025-08-20T10:30:00Z"
    }
  ]
}
```

### List All Available Tables
**GET** `/api/data/tables`

Get a list of all available database tables with metadata.

**Response:**
```json
{
  "total_tables": 15,
  "tables": [
    {
      "table_name": "agent",
      "column_count": 8,
      "record_count": 45
    },
    {
      "table_name": "invoice",
      "column_count": 25,
      "record_count": 1250
    }
  ]
}
```

### Get Records from Specific Table (Legacy)
**GET** `/api/records/:table`

**Parameters:**
- `table` (path, required) - Table name
- `limit` (query, optional) - Limit records (default: 50)

---

## Invoice Management

### Get Fully Paid Invoices
**GET** `/api/invoices/fully-paid`

Retrieve invoices that are marked as fully paid with filtering options.

**Parameters:**
- `limit` (query, optional) - Number of records (default: 100)
- `offset` (query, optional) - Pagination offset (default: 0)
- `month` (query, optional) - Filter by month in format `YYYY-MM` (e.g., "2025-08")
- `agent` (query, optional) - Filter by agent bubble_id

**Example Request:**
```
GET /api/invoices/fully-paid?month=2025-08&agent=agent_bubble_id&limit=50
```

**Response:**
```json
{
  "invoices": [
    {
      "invoice_id": 12345,
      "bubble_id": "invoice_bubble_id",
      "amount": "25000.00",
      "full_payment_date": "2025-08-15T00:00:00Z",
      "payment_count": 3,
      "payment_sum": 25000.00,
      "agent_name": "John Smith",
      "customer_name": "ABC Company"
    }
  ],
  "total": 150
}
```

### Get Invoice Details with Items
**GET** `/api/invoice/details/:invoiceId`

Get detailed invoice information including customer data and invoice items.

**Parameters:**
- `invoiceId` (path, required) - Invoice bubble_id

**Response:**
```json
{
  "invoice": {
    "bubble_id": "invoice_bubble_id",
    "invoice_id": 12345,
    "amount": 25000.00,
    "invoice_date": "2025-08-01T00:00:00Z",
    "customer_name": "ABC Company",
    "customer_bubble_id": "customer_bubble_id"
  },
  "invoice_items": [
    {
      "bubble_id": "item_bubble_id",
      "description": "Premium Insurance Package",
      "amount": 20000.00,
      "sort": 1
    },
    {
      "bubble_id": "item_bubble_id_2",
      "description": "Additional Coverage",
      "amount": 5000.00,
      "sort": 2
    }
  ],
  "total_items_amount": 25000.00
}
```

### Get ANP Calculator Invoices
**GET** `/api/invoices/anp-calculator`

Get invoices for ANP (Average New Premium) calculations.

**Parameters:**
- `limit` (query, optional) - Number of records (default: 100)
- `offset` (query, optional) - Pagination offset (default: 0)
- `month` (query, optional) - Filter by month in format `YYYY-MM`
- `agent` (query, optional) - Filter by agent bubble_id

**Response:**
```json
{
  "invoices": [
    {
      "bubble_id": "invoice_bubble_id",
      "invoice_id": 12345,
      "first_payment_date": "2025-08-01T00:00:00Z",
      "achieved_monthly_anp": "510200.40",
      "agent_name": "John Smith",
      "customer_name": "ABC Company",
      "payment_sum": 25000.00
    }
  ],
  "total": 75
}
```

### Rescan Invoice Payments
**POST** `/api/invoices/rescan-payments`

Rescan all unpaid invoices to check if they should be marked as paid based on payment records.

**Response:**
```json
{
  "message": "Rescan completed",
  "updated_invoices": 15,
  "total_checked": 1200,
  "errors": []
}
```

---

## Agent Management

### Get Agents List
**GET** `/api/agents/list`

Get all agents for filter dropdowns and management.

**Response:**
```json
{
  "agents": [
    {
      "bubble_id": "agent_bubble_id",
      "name": "John Smith",
      "contact": "+1234567890",
      "agent_type": "internal"
    }
  ]
}
```

### Update Agent Type
**PUT** `/api/agents/:agentId/type`

Update an agent's type classification.

**Parameters:**
- `agentId` (path, required) - Agent bubble_id

**Request Body:**
```json
{
  "agent_type": "internal"
}
```

**Valid agent_type values:** `internal`, `outsource`, `block`

**Response:**
```json
{
  "message": "Agent type updated successfully",
  "agent": {
    "bubble_id": "agent_bubble_id",
    "name": "John Smith",
    "agent_type": "internal"
  }
}
```

---

## Commission Reports

### Generate Commission Report
**GET** `/api/commission/report`

Generate commission report for a specific agent and month.

**Parameters:**
- `agent` (query, required) - Agent bubble_id
- `month` (query, required) - Month in format `YYYY-MM`
- `agent_type` (query, required) - Agent type (`internal` or `outsource`)

**Example Request:**
```
GET /api/commission/report?agent=agent_bubble_id&month=2025-08&agent_type=internal
```

**Response:**
```json
{
  "invoices": [
    {
      "bubble_id": "invoice_bubble_id",
      "invoice_id": 12345,
      "customer_name": "ABC Company",
      "full_payment_date": "2025-08-15T00:00:00Z",
      "amount": 25000.00,
      "amount_eligible_for_comm": 25000.00,
      "achieved_monthly_anp": 510200.40,
      "basic_commission": 750.00,
      "bonus_commission": 1500.00,
      "total_commission": 2250.00
    }
  ],
  "total_basic_commission": 2250.00,
  "total_bonus_commission": 4500.00,
  "total_commission": 6750.00,
  "agent_name": "John Smith",
  "selected_month": "2025-08"
}
```

**Commission Calculation Rules:**
- **Basic Commission:** 3% of `amount_eligible_for_comm`
- **Bonus Commission:** Based on `achieved_monthly_anp`:
  - RM 60,000 - RM 179,999: RM 500
  - RM 180,000 - RM 359,999: RM 1,000
  - RM 360,000+: RM 1,500

---

## ANP Operations

### Update ANP Calculations
**POST** `/api/invoices/update-anp`

Recalculate and update ANP (Average New Premium) for all invoices based on first payment dates.

**Response:**
```json
{
  "message": "ANP Update completed",
  "updated_invoices": 1200,
  "total_checked": 1250,
  "processed_agents": 45,
  "agent_month_combinations": 120,
  "errors": []
}
```

### Get ANP Related Invoices
**GET** `/api/invoices/anp-related`

Get all invoices from the same agent and month for ANP calculation context.

**Parameters:**
- `invoice_id` (query, required) - Invoice bubble_id to find related invoices

**Response:**
```json
{
  "invoices": [
    {
      "bubble_id": "invoice_bubble_id",
      "invoice_id": 12345,
      "first_payment_date": "2025-08-01T00:00:00Z",
      "achieved_monthly_anp": "510200.40",
      "amount": "25000.00",
      "agent_name": "John Smith",
      "first_payment_amount": 5000.00
    }
  ],
  "agent_name": "John Smith",
  "target_month": "2025-08"
}
```

---

## Payment Operations

### Get Payment Details for Invoice
**GET** `/api/payments/invoice/:invoiceId`

Get all payment records associated with a specific invoice.

**Parameters:**
- `invoiceId` (path, required) - Invoice bubble_id

**Response:**
```json
{
  "payments": [
    {
      "bubble_id": "payment_bubble_id",
      "amount": "5000.00",
      "payment_method": "Bank Transfer",
      "payment_date": "2025-08-01T00:00:00Z",
      "verified_by_name": "Admin User",
      "remark": "First payment"
    }
  ]
}
```

### Check Payment Table
**GET** `/api/payments/check`

Get sample payment records for development and debugging.

**Response:**
```json
{
  "totalPayments": "5420",
  "samplePayments": [
    {
      "bubble_id": "payment_bubble_id",
      "amount": "5000.00",
      "payment_method": "Bank Transfer",
      "payment_date": "2025-08-01T00:00:00Z",
      "verified_by": "user_bubble_id",
      "remark": "Payment received"
    }
  ]
}
```

---

## Debug & Development

### Get Database Schemas
**GET** `/api/debug/schemas`

Get detailed schema information for key tables.

**Response:**
```json
{
  "invoice": {
    "schema": [
      {
        "column_name": "bubble_id",
        "data_type": "text",
        "is_nullable": "NO",
        "column_default": null
      }
    ],
    "sample": {
      "bubble_id": "sample_invoice_id",
      "amount": "25000.00"
    }
  },
  "customer": { "schema": [...] },
  "agent": { "schema": [...] }
}
```

### Debug Paid Invoices
**GET** `/api/debug/paid-invoices`

Get statistics about paid vs unpaid invoices for debugging.

**Response:**
```json
{
  "totalInvoices": 1250,
  "paidTrue": 850,
  "paidFalse": 350,
  "paidNull": 50,
  "samplePaid": [
    {
      "bubble_id": "invoice_bubble_id",
      "paid_": true,
      "amount": "25000.00",
      "full_payment_date": "2025-08-15T00:00:00Z"
    }
  ]
}
```

### Debug Invoice Details
**GET** `/api/debug/invoice/:invoiceId`

Comprehensive debugging information for a specific invoice.

**Parameters:**
- `invoiceId` (path, required) - Invoice bubble_id

### Check Any Table
**GET** `/api/table/check/:tableName`

Get sample records from any table for debugging.

**Parameters:**
- `tableName` (path, required) - Table name

---

## Error Handling

### Standard HTTP Status Codes

- **200 OK** - Request successful
- **400 Bad Request** - Invalid parameters or missing required fields
- **404 Not Found** - Resource not found (table, invoice, agent, etc.)
- **500 Internal Server Error** - Database or server error

### Error Response Format

```json
{
  "error": "Error type",
  "message": "Detailed error message",
  "table": "table_name",
  "available_tables": ["agent", "invoice", "customer_profile"]
}
```

### Common Error Scenarios

1. **Table Not Found (404):**
```json
{
  "error": "Table not found",
  "message": "Table 'invalid_table' does not exist",
  "available_tables": ["agent", "invoice", "customer_profile"]
}
```

2. **Invalid Parameters (400):**
```json
{
  "error": "Missing required parameters",
  "message": "agent, month, and agent_type parameters are required"
}
```

3. **Database Error (500):**
```json
{
  "error": "Database error",
  "message": "Connection timeout or query failed"
}
```

---

## Authentication

**Current Status:** No authentication required for development environment.

**Future Implementation:** JWT-based authentication will be implemented for production deployment.

---

## Best Practices

### 1. Pagination
Always use `limit` and `offset` parameters for large datasets:
```
GET /api/data/fetch/invoice?limit=50&offset=100
```

### 2. Date Filtering
Use ISO 8601 format for date parameters:
```
GET /api/invoices/fully-paid?month=2025-08
```

### 3. Error Handling
Always check HTTP status codes and handle error responses appropriately.

### 4. Rate Limiting
No current rate limiting, but recommended to implement in production.

### 5. Data Types
- All currency amounts are returned as strings to maintain precision
- Dates are in ISO 8601 format with timezone information
- BigInt values are automatically converted to strings in JSON responses

---

## Development Examples

### Fetch Latest Invoices
```javascript
const response = await fetch('/api/data/fetch/invoice?limit=20&sort_order=DESC');
const data = await response.json();
console.log(`Found ${data.returned_records} out of ${data.total_records} invoices`);
```

### Generate Commission Report
```javascript
const response = await fetch('/api/commission/report?agent=agent123&month=2025-08&agent_type=internal');
const report = await response.json();
console.log(`Total commission: ${report.total_commission}`);
```

### Get Invoice Details
```javascript
const response = await fetch('/api/invoice/details/invoice_bubble_id');
const invoice = await response.json();
console.log(`Invoice ${invoice.invoice.invoice_id} has ${invoice.invoice_items.length} items`);
```

---

## Changelog

### Version 2.0 (August 21, 2025)
- Added flexible data fetching API (`/api/data/fetch/:tableName`)
- Added table listing API (`/api/data/tables`)
- Added invoice details with items API (`/api/invoice/details/:invoiceId`)
- Added commission report generation
- Added ANP calculation and related invoices
- Added comprehensive schema introspection
- Added payment details for invoices
- Added debug and development endpoints

---

**Note:** This API documentation is automatically maintained. For the latest updates, check the server.js file or the deployed API health endpoint.