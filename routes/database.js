import express from 'express'
import { PrismaClient } from '@prisma/client'

const router = express.Router()
const prisma = new PrismaClient()

// Health check endpoint
router.get('/health', async (req, res) => {
  try {
    await prisma.$connect()
    const result = await prisma.$queryRaw`SELECT version();`
    res.json({ 
      status: 'connected', 
      database: 'postgresql',
      version: result[0].version 
    })
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      message: error.message 
    })
  }
})

// Get all data types
router.get('/data-types', async (req, res) => {
  try {
    const types = await prisma.synced_records.groupBy({
      by: ['data_type'],
      _count: {
        data_type: true
      }
    })
    res.json(types)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get records by data type
router.get('/records/:dataType', async (req, res) => {
  try {
    const { dataType } = req.params
    const { limit = 50, offset = 0, search } = req.query
    
    const where = { data_type: dataType }
    if (search) {
      where.OR = [
        { bubble_id: { contains: search, mode: 'insensitive' } },
        { raw_data: { path: [], string_contains: search } }
      ]
    }
    
    const records = await prisma.synced_records.findMany({
      where,
      take: parseInt(limit),
      skip: parseInt(offset),
      orderBy: { synced_at: 'desc' }
    })
    
    const total = await prisma.synced_records.count({ where })
    
    res.json({
      records,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + parseInt(limit) < total
      }
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get specific record by bubble_id
router.get('/record/:bubbleId', async (req, res) => {
  try {
    const { bubbleId } = req.params
    const record = await prisma.synced_records.findUnique({
      where: { bubble_id: bubbleId }
    })
    
    if (!record) {
      return res.status(404).json({ error: 'Record not found' })
    }
    
    res.json(record)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Execute raw SQL query (for admin use)
router.post('/query', async (req, res) => {
  try {
    const { sql, params = [] } = req.body
    
    // Basic security check - only allow SELECT statements
    if (!sql.trim().toLowerCase().startsWith('select')) {
      return res.status(403).json({ error: 'Only SELECT queries are allowed' })
    }
    
    const result = await prisma.$queryRawUnsafe(sql, ...params)
    res.json({ result })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get admin users
router.get('/admin-users', async (req, res) => {
  try {
    const users = await prisma.admin_users.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        created_at: true,
        updated_at: true
      }
    })
    res.json(users)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get dashboard settings
router.get('/settings', async (req, res) => {
  try {
    const { user_id } = req.query
    const where = user_id ? { user_id } : {}
    
    const settings = await prisma.dashboard_settings.findMany({
      where,
      orderBy: { updated_at: 'desc' }
    })
    res.json(settings)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get activity logs
router.get('/activity-logs', async (req, res) => {
  try {
    const { limit = 100, offset = 0, user_id, action } = req.query
    
    const where = {}
    if (user_id) where.user_id = user_id
    if (action) where.action = { contains: action, mode: 'insensitive' }
    
    const logs = await prisma.activity_logs.findMany({
      where,
      take: parseInt(limit),
      skip: parseInt(offset),
      orderBy: { created_at: 'desc' }
    })
    
    const total = await prisma.activity_logs.count({ where })
    
    res.json({
      logs,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + parseInt(limit) < total
      }
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router