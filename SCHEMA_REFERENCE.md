# Database Schema Reference

**Generated on:** 2025-08-20  
**Purpose:** Reference for precise field names and relationships  
**Source:** Railway PostgreSQL database via `/api/debug/schemas`

## Table Schemas

### Invoice Table
**Key Fields:** 71 columns total
- `id` (integer, NOT NULL, auto-increment)
- `invoice_id` (integer, nullable) 
- `bubble_id` (text, nullable)
- `amount` (text, nullable)
- `paid_` (boolean, nullable)
- `full_payment_date` (timestamp, nullable)
- `linked_customer` (text, nullable) → References customer_profile.bubble_id
- `linked_agent` (text, nullable) → References agent.bubble_id  
- `linked_payment` (ARRAY, nullable) → Array of payment.bubble_id values

### Customer Table  
**Status:** Empty schema - table exists but no columns found

### Customer Profile Table
**Key Fields:** 16 columns total
- `id` (integer, NOT NULL, auto-increment)
- `bubble_id` (text, nullable)
- `name` (text, nullable) ← **Customer name field**
- `contact` (text, nullable)
- `address` (text, nullable)
- `linked_agent` (text, nullable)

### Agent Table
**Key Fields:** 23 columns total
- `id` (integer, NOT NULL, auto-increment)
- `bubble_id` (text, nullable)
- `name` (text, nullable) ← **Agent name field**
- `contact` (text, nullable)
- `email` (text, nullable)
- `agent_type` (text, nullable)

### Payment Table
**Key Fields:** 22 columns total
- `id` (integer, NOT NULL, auto-increment)
- `bubble_id` (text, nullable)
- `amount` (text, nullable) ← **Payment amount field**
- `payment_date` (timestamp, nullable)
- `linked_invoice` (text, nullable) → References invoice.bubble_id
- `linked_customer` (text, nullable)
- `payment_method` (text, nullable)

## Sample Data Examples

### Sample Invoice Record
```json
{
  "id": 2,
  "bubble_id": "1708562030126x966996074806116400",
  "invoice_id": 1000002,
  "amount": "7740",
  "paid_": true,
  "full_payment_date": "2024-02-19T16:00:00.000Z",
  "linked_customer": "1708562011724x866113013604941800",
  "linked_agent": "1695099947500x542053329338630140", 
  "linked_payment": ["1708562189594x427994653613883400", "1708562252466x549735184111763460"]
}
```

## Field Relationships & Mappings

### For Full Payment Invoice Display:
1. **Invoice ID:** `invoice.invoice_id` (integer) or `invoice.id` (auto-increment)
2. **Agent Name:** 
   ```sql
   JOIN agent ON invoice.linked_agent = agent.bubble_id
   SELECT agent.name
   ```
3. **Customer Name:**
   ```sql  
   JOIN customer_profile ON invoice.linked_customer = customer_profile.bubble_id
   SELECT customer_profile.name
   ```
4. **Payment Count:** 
   ```sql
   SELECT array_length(invoice.linked_payment, 1) as payment_count
   ```
5. **Payment Sum:**
   ```sql
   SELECT SUM(CAST(payment.amount AS DECIMAL)) 
   FROM payment 
   WHERE payment.bubble_id = ANY(invoice.linked_payment)
   ```
6. **Invoice Amount:** `invoice.amount` (text - needs CAST to numeric)
7. **Payment Date:** `invoice.full_payment_date` (timestamp)

## Key Discoveries
- ✅ **customer** table is empty - use **customer_profile** instead
- ✅ **linked_payment** is an ARRAY of bubble_ids
- ✅ **amount** fields are stored as TEXT (need to CAST to numeric)
- ✅ All relationships use **bubble_id** as foreign keys
- ✅ **invoice_id** is separate from auto-increment **id**

## SQL Query Template for Full Payment Invoice
```sql
SELECT 
  i.invoice_id,
  i.amount as invoice_amount,
  i.full_payment_date,
  i.linked_payment,
  array_length(i.linked_payment, 1) as payment_count,
  a.name as agent_name,
  cp.name as customer_name
FROM invoice i
LEFT JOIN agent a ON i.linked_agent = a.bubble_id  
LEFT JOIN customer_profile cp ON i.linked_customer = cp.bubble_id
WHERE i.paid_ = true
ORDER BY i.invoice_id ASC
```