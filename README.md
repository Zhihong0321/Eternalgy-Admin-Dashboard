# Eternalgy Admin Dashboard 2.0

A modern PostgreSQL-based admin dashboard for ERP data operations, reporting, and business intelligence.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL database (shared with Eternalgy ERP Rebuild 4)
- Railway account for deployment

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/Eternalgy-Admin-Dashboard-2.0.git
cd Eternalgy-Admin-Dashboard-2.0

# Setup backend
cd backend
npm install
cp ../.env.example .env
# Edit .env with your database credentials

# Setup frontend
cd ../frontend
npm install

# Generate Prisma client
cd ../backend
npm run build
```

### Development

```bash
# Start backend (in backend/ directory)
npm run dev

# Start frontend (in frontend/ directory)
npm run dev
```

## 🏗️ Architecture

### Backend
- **Framework**: Node.js + Express
- **Database**: PostgreSQL + Prisma ORM
- **Authentication**: TBD
- **API**: RESTful endpoints

### Frontend
- **Framework**: React 19 + TypeScript
- **Build Tool**: Vite
- **UI Library**: shadcn/ui + Tailwind CSS
- **State Management**: Zustand + TanStack Query
- **Routing**: React Router

## 📊 Database Schema

### Data Sources
- `synced_records` - Business data from Bubble.io (READ-ONLY)
- `admin_users` - Dashboard user management
- `dashboard_settings` - User preferences
- `activity_logs` - Audit trail

## 🚢 Deployment

This project is designed for Railway deployment:

1. Connect your GitHub repository to Railway
2. Set environment variables in Railway dashboard
3. Deploy both backend and frontend services
4. Configure custom domains (optional)

## 🔒 Data Authority

- **Bubble.io Data**: Read-only access by default
- **Dashboard Data**: Full CRUD operations
- **Admin Override**: Future capability for authorized data modifications

## 📝 Development Guidelines

- Railway-only development (no localhost testing)
- Follow TypeScript best practices
- Use Prisma for all database operations
- Implement proper error handling
- Follow shadcn/ui design patterns

## 🛠️ API Endpoints

### Health & Testing
- `GET /health` - Service health check
- `GET /api/test-db` - Database connectivity test

### Data Operations
- `GET /api/data/types` - Available data types
- `GET /api/data/records` - Retrieve records with filtering
- `GET /api/data/stats` - Data statistics and counts

### Admin Operations
- `GET /api/admin/users` - User management
- `POST /api/admin/settings` - Save dashboard settings
- `GET /api/admin/logs` - Activity audit logs

## 📦 Project Structure

```
├── backend/
│   ├── src/
│   │   ├── controllers/    # Business logic
│   │   ├── services/       # Data access layer
│   │   ├── routes/         # API endpoints
│   │   ├── middleware/     # Auth, validation
│   │   └── utils/          # Helper functions
│   ├── prisma/
│   │   └── schema.prisma   # Database schema
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Route pages
│   │   ├── hooks/          # Custom hooks
│   │   ├── services/       # API clients
│   │   └── types/          # TypeScript types
│   └── package.json
├── docs/                   # Documentation
├── CLAUDE.md              # AI assistant instructions
└── README.md
```

## 🤝 Contributing

1. Follow the development guidelines in `CLAUDE.md`
2. Use Railway for all testing and development
3. Follow TypeScript and React best practices
4. Test all changes on Railway before merging

## 📄 License

MIT License - see LICENSE file for details