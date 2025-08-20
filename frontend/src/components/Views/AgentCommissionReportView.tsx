import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface Agent {
  bubble_id: string
  name: string
  contact: string | null
  agent_type: string
}

interface CommissionInvoice {
  bubble_id: string
  invoice_id: number
  customer_name: string
  full_payment_date: string
  amount: number
  amount_eligible_for_comm: number
  achieved_monthly_anp: number
  basic_commission: number
  bonus_commission: number
  total_commission: number
}

interface CommissionReport {
  invoices: CommissionInvoice[]
  total_basic_commission: number
  total_bonus_commission: number
  total_commission: number
  agent_name: string
  selected_month: string
}

export function AgentCommissionReportView() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [selectedAgent, setSelectedAgent] = useState<string>('')
  const [selectedMonth, setSelectedMonth] = useState<string>('')
  const [reportData, setReportData] = useState<CommissionReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [agentFilter, setAgentFilter] = useState<'internal' | 'outsource'>('internal')

  // Generate month options (current month to last 12 months)
  const generateMonthOptions = () => {
    const months = []
    const currentDate = new Date()
    
    for (let i = 0; i < 12; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1)
      const monthValue = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const monthLabel = date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long' 
      })
      months.push({ value: monthValue, label: monthLabel })
    }
    
    return months
  }

  const monthOptions = generateMonthOptions()

  // Load agents on component mount
  useEffect(() => {
    loadAgents()
    // Set current month as default
    if (monthOptions.length > 0) {
      setSelectedMonth(monthOptions[0].value)
    }
  }, [])

  // Filter agents when agent type filter changes
  const filteredAgents = agents.filter(agent => agent.agent_type === agentFilter)

  const loadAgents = async () => {
    try {
      const response = await fetch('/api/agents/list')
      const data = await response.json()
      setAgents(data.agents)
    } catch (error) {
      console.error('Error loading agents:', error)
    }
  }

  const generateCommissionReport = async () => {
    if (!selectedAgent || !selectedMonth) {
      alert('Please select both an agent and a month')
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/commission/report?agent=${selectedAgent}&month=${selectedMonth}&agent_type=${agentFilter}`)
      
      if (!response.ok) {
        throw new Error('Failed to generate report')
      }
      
      const data = await response.json()
      setReportData(data)
    } catch (error) {
      console.error('Error generating commission report:', error)
      alert('Error generating commission report')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-MY', {
      style: 'currency',
      currency: 'MYR'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-2">Agent Commission Report</h2>
        <p className="text-muted-foreground">
          Generate commission reports for internal and outsource agents
        </p>
      </div>

      {/* Filters */}
      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Agent Type Filter */}
          <div>
            <label className="block text-sm font-medium mb-2">Agent Type</label>
            <select
              value={agentFilter}
              onChange={(e) => {
                setAgentFilter(e.target.value as 'internal' | 'outsource')
                setSelectedAgent('') // Reset selected agent when type changes
                setReportData(null) // Clear report data
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="internal">Internal Agent</option>
              <option value="outsource">Outsource Agent</option>
            </select>
          </div>

          {/* Agent Selector */}
          <div>
            <label className="block text-sm font-medium mb-2">Select Agent</label>
            <select
              value={selectedAgent}
              onChange={(e) => {
                setSelectedAgent(e.target.value)
                setReportData(null) // Clear report data when agent changes
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={filteredAgents.length === 0}
            >
              <option value="">
                {filteredAgents.length === 0 
                  ? `No ${agentFilter} agents available` 
                  : 'Choose an agent'
                }
              </option>
              {filteredAgents.map((agent) => (
                <option key={agent.bubble_id} value={agent.bubble_id}>
                  {agent.name}
                </option>
              ))}
            </select>
          </div>

          {/* Month Selector */}
          <div>
            <label className="block text-sm font-medium mb-2">Select Month</label>
            <select
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value)
                setReportData(null) // Clear report data when month changes
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {monthOptions.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
          </div>

          {/* Generate Button */}
          <div className="flex items-end">
            <Button
              onClick={generateCommissionReport}
              disabled={loading || !selectedAgent || !selectedMonth}
              className="w-full"
            >
              {loading ? 'Generating...' : 'Generate Commission Report'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Commission Report Results */}
      {reportData && (
        <Card className="p-6">
          {/* Summary Section */}
          <div className="mb-6">
            <h3 className="text-xl font-semibold mb-4">
              Commission Report: {reportData.agent_name} - {new Date(reportData.selected_month + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-blue-600 mb-1">Total Basic Commission</h4>
                <p className="text-2xl font-bold text-blue-700">{formatCurrency(reportData.total_basic_commission)}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-green-600 mb-1">Total Bonus Commission</h4>
                <p className="text-2xl font-bold text-green-700">{formatCurrency(reportData.total_bonus_commission)}</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-purple-600 mb-1">Total Commission</h4>
                <p className="text-2xl font-bold text-purple-700">{formatCurrency(reportData.total_commission)}</p>
              </div>
            </div>
          </div>

          {/* Invoice Details Table */}
          {reportData.invoices.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-200">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-200 px-4 py-3 text-left font-medium">Customer Name</th>
                    <th className="border border-gray-200 px-4 py-3 text-left font-medium">Payment Date</th>
                    <th className="border border-gray-200 px-4 py-3 text-right font-medium">Invoice Amount</th>
                    <th className="border border-gray-200 px-4 py-3 text-right font-medium">Monthly ANP</th>
                    <th className="border border-gray-200 px-4 py-3 text-right font-medium">Basic Commission (3%)</th>
                    <th className="border border-gray-200 px-4 py-3 text-right font-medium">Bonus Commission</th>
                    <th className="border border-gray-200 px-4 py-3 text-right font-medium">Total Commission</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.invoices.map((invoice) => (
                    <tr key={invoice.bubble_id} className="hover:bg-gray-50">
                      <td className="border border-gray-200 px-4 py-3">{invoice.customer_name}</td>
                      <td className="border border-gray-200 px-4 py-3">{formatDate(invoice.full_payment_date)}</td>
                      <td className="border border-gray-200 px-4 py-3 text-right">{formatCurrency(invoice.amount)}</td>
                      <td className="border border-gray-200 px-4 py-3 text-right">{formatCurrency(invoice.achieved_monthly_anp)}</td>
                      <td className="border border-gray-200 px-4 py-3 text-right">{formatCurrency(invoice.basic_commission)}</td>
                      <td className="border border-gray-200 px-4 py-3 text-right">{formatCurrency(invoice.bonus_commission)}</td>
                      <td className="border border-gray-200 px-4 py-3 text-right font-semibold">{formatCurrency(invoice.total_commission)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No invoices found for the selected agent and month.
            </div>
          )}
        </Card>
      )}
    </div>
  )
}