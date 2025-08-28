# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# 🚨 CRITICAL PERMISSIONS & RULES 🚨

## FILE EDIT PERMISSION GRANTED
**EDIT FILE permission Granted. DONT KEEP ASKING ME for permission again.**

Claude Code has full permission to edit/create/modify files without asking for permission each time.

---

# ⚠️ CRITICAL WARNING - NO OVER-ENGINEERING ⚠️

## 🚨 ABSOLUTELY PROHIBITED 🚨

**I HATE OVER-ENGINEERING. I PROHIBIT IT. I DON'T ALLOW IT.**

### BANNED PRACTICES:
- ❌ Adding frameworks/libraries BEFORE they are actually needed
- ❌ Pre-building "future" features that don't exist yet  
- ❌ Complex configurations for simple requirements
- ❌ Setting up build systems before there's anything to build
- ❌ Adding security/middleware/validation before basic functionality works
- ❌ Creating abstractions for single-use code
- ❌ Any "best practice" that adds complexity without immediate need

### REQUIRED APPROACH:
- ✅ Start with THE SIMPLEST possible working solution
- ✅ Add features ONE AT A TIME when actually needed
- ✅ Get basic functionality working FIRST
- ✅ Only add complexity when current solution breaks/limits progress

### RULE: ASK FIRST
Before adding ANY library, framework, configuration, or "improvement":
**"Do we need this RIGHT NOW to solve the current problem?"**
If answer is NO → DON'T ADD IT

---

# 🐛 DEBUGGING METHODOLOGY - CRITICAL 🐛

## 🚨 NO GUESSWORK ALLOWED 🚨

**I HATE GUESS WORK. WHEN SEEING BUGS/ERRORS, BUILD DETAILED DEBUG FEATURES & LOGGING TO SEE THE PROBLEM.**

### BANNED DEBUGGING PRACTICES:
- ❌ Making random guesses about what might be wrong
- ❌ Trying different solutions without understanding the root cause  
- ❌ "Bypassing" errors with workarounds instead of fixing them
- ❌ Changing multiple things at once hoping something works
- ❌ Assuming what the problem is without evidence

### REQUIRED DEBUGGING APPROACH:
- ✅ **ADD DETAILED LOGGING** - Log every step, variable, file path, request
- ✅ **BUILD DEBUG ENDPOINTS** - Create routes to inspect system state
- ✅ **VERIFY ASSUMPTIONS** - Check if files exist, paths are correct, etc.
- ✅ **ISOLATE THE PROBLEM** - Test each component separately
- ✅ **GATHER EVIDENCE** - Collect actual data about what's happening
- ✅ **ONE CHANGE AT A TIME** - Make targeted fixes based on evidence

### DEBUG RULE:
**Before making ANY code changes to fix a bug:**
1. **UNDERSTAND THE PROBLEM** - Add logging/debugging to see exactly what's wrong
2. **VERIFY THE FIX** - Ensure the solution addresses the root cause
3. **TEST THE FIX** - Confirm it actually works

**If you don't understand WHY something is broken, don't try to fix it yet. Debug it first.**

## 🚨 CRITICAL: ASK FOR CLARIFICATION - NO GUESSING 🚨

**NEVER MAKE ASSUMPTIONS OR GUESSES. ALWAYS ASK FOR CLARIFICATION FIRST.**

### WHY GUESSING IS BANNED:
- ❌ Wastes time and tokens on wrong solutions
- ❌ Produces buggy, slow, and bad outcomes  
- ❌ Creates more problems than it solves
- ❌ Leads to incorrect implementations

### REQUIRED APPROACH:
- ✅ **ASK FOR MISSING INFORMATION** - If unclear about requirements, ask specific questions
- ✅ **REQUEST EXAMPLES** - Ask for concrete examples when requirements are vague
- ✅ **VERIFY UNDERSTANDING** - Confirm interpretation before implementing
- ✅ **GET CLARIFICATION ON DATA STRUCTURES** - Ask about field names, data types, relationships

### RULE: WHEN IN DOUBT, ASK
**Before making ANY assumptions about:**
- Data field names or structures
- User requirements
- Expected behavior
- API responses
- Database relationships

**→ ASK SPECIFIC QUESTIONS FIRST**

---

# 📊 PROJECT-SPECIFIC DATA KNOWLEDGE 📊

## User Team Assignment Logic
**CRITICAL: How to determine user's team/group:**
- Check `user.access_level` field (this is an array/list of text values)
- Look for these specific team identifiers:
  - `team-jb` = JB Team
  - `team-kluang` = Kluang Team  
  - `team-seremban` = Seremban Team

Example:
```javascript
// User team detection
const user = {
  access_level: ["sales", "team-jb", "report"]  // This user is in JB team
}

// Check team membership
const isJBTeam = user.access_level.includes('team-jb')
const isKluangTeam = user.access_level.includes('team-kluang')
const isSerembanTeam = user.access_level.includes('team-seremban')
```

---

## Project Overview

**Eternalgy Admin Dashboard 2.0** is a simple Node.js backend (will become PostgreSQL-based admin dashboard for ERP data).

**Status**: 🚀 MINIMAL SETUP - Simple Express server only

## Core Purpose

This system operates EXCLUSIVELY on existing PostgreSQL data. All data sync operations are handled by a separate system (Eternalgy ERP Rebuild 4).

## Common Development Commands

### Backend (Node.js/Express/Prisma)
```bash
# Development with hot reload
npm run dev

# Production start  
npm start

# Database operations
npm run build          # Generate Prisma client
npm run db:push        # Push schema to database
npm run db:studio      # Open Prisma Studio
```

### Frontend (React/TypeScript/Vite)
```bash
cd frontend

# Development server
npm run dev

# Build for production
npm run build

# Lint code
npm run lint

# Preview production build
npm run preview
```

## Architecture Overview

**Pure Data Operations**: `PostgreSQL → Prisma → Business Logic → React UI`

### Core Components

1. **Backend Services** (`backend/src/services/`)
   - Data access services for ERP operations
   - Business logic for admin dashboard
   - API endpoints for frontend communication

2. **API Endpoints** (`backend/src/routes/`)
   - `/api/data` - Data retrieval and filtering
   - `/api/admin` - Admin operations and user management
   - `/api/reports` - Report generation and exports

3. **Frontend Architecture** (`frontend/src/`)
   - React 19 + TypeScript + Vite
   - shadcn/ui components with Tailwind CSS
   - Pages: Dashboard, Data Browser, Reports, Admin
   - Custom hooks for API communication

### Key Design Principles

- **Railway-Only Development**: This project can ONLY run/deploy/test on Railway Server. No localhost testing allowed.
- **Railway-First Development**: All development, testing, and deployment on Railway.app only
- **Read-Only Bubble Data**: Data from Bubble.io sync is READ-ONLY (with admin override capability)
- **Pure PostgreSQL Operations**: All business logic operates on PostgreSQL data

## Database Schema

Uses Prisma ORM with PostgreSQL. Key data sources:

### READ-ONLY: Bubble.io Synced Data
- `synced_records` - All business data from Bubble.io (Customer, Order, Product, etc.)
- `sync_status` - Sync system monitoring (optional reference)

### ADMIN DASHBOARD: New Tables
- `admin_users` - Dashboard user management
- `dashboard_settings` - User preferences and configurations
- `activity_logs` - User action tracking and audit logs

## Environment Variables

Required for development:
```bash
DATABASE_URL=postgresql://... (shared with sync system)
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://your-railway-frontend-url
```

## Testing and Deployment

### Testing Strategy
- **NO localhost testing** - Railway-only development per project rules
- Use Railway deployment for all testing
- Production URL: TBD (Railway auto-generated)

### Key Test Endpoints
- `GET /health` - Service health check
- `GET /api/test-db` - Verify PostgreSQL connectivity
- `GET /api/data/types` - Discover available data types
- `GET /api/data/records?type=Customer&limit=10` - Test data retrieval

## Critical Development Rules

Based on project requirements:

❌ **NEVER DO:**
- localhost testing or development
- Modify sync system or data import logic
- Write to Bubble.io synced data (unless admin override)
- Create hardcoded business rules

✅ **ALWAYS DO:**
- Railway-only development and testing
- Read data from PostgreSQL via Prisma
- Create admin-focused business logic
- Build responsive, modern UI components
- Follow TypeScript and React best practices

## Database Access Patterns

### Primary Data Source: `synced_records`
```javascript
// Get all customers
const customers = await prisma.synced_records.findMany({
  where: { data_type: 'Customer' }
});

// Get specific record by bubble_id
const record = await prisma.synced_records.findUnique({
  where: { bubble_id: 'some-bubble-id' }
});

// Filter by data type and date
const recentOrders = await prisma.synced_records.findMany({
  where: {
    data_type: 'Order',
    synced_at: { gte: new Date('2024-01-01') }
  }
});
```

### Data Structure
- `bubble_id` - Unique record identifier from Bubble.io
- `data_type` - Business entity type (Customer, Order, Product, etc.)
- `raw_data` - Complete JSON business data from Bubble.io
- `processed_data` - Cleaned/structured data (optional)
- `synced_at` - Timestamp when data was synced

## Tech Stack

- **Backend**: Node.js + Express + Prisma ORM
- **Frontend**: React 19 + TypeScript + Vite + shadcn/ui
- **Database**: PostgreSQL (shared with sync system)
- **Styling**: Tailwind CSS
- **State Management**: Zustand + TanStack Query
- **HTTP Client**: Axios

## Data Authority

- **Bubble.io Data**: READ-ONLY by default (admin can override with proper authorization)
- **Dashboard Data**: Full CRUD operations (admin_users, dashboard_settings, activity_logs)
- **Future Enhancement**: Admin authorization system will allow selective write operations

## Performance Considerations

- Optimized queries for large datasets
- Proper indexing on `synced_records` table
- Pagination for data browser
- Caching for frequently accessed data
- Export capabilities for large reports

## UI/UX Guidelines

- Modern, clean admin dashboard design
- Responsive layout for all screen sizes
- shadcn/ui component library for consistency
- Dark/light mode support
- Intuitive navigation and data filtering
- Fast data loading and search capabilities