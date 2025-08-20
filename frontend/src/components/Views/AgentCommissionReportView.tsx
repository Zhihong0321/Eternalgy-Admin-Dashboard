import { useState, useEffect } from 'react'
import { Button } from '../ui/button'
import { Card } from '../ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { RefreshCw, DollarSign, Calendar, User, Eye, X } from 'lucide-react'

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

interface ANPRelatedInvoice {
  bubble_id: string
  invoice_id: number
  agent_name: string
  first_payment_date: string
  amount: string
  achieved_monthly_anp: string | null
  first_payment_amount: number | null
}

export function AgentCommissionReportView() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [selectedAgent, setSelectedAgent] = useState<string>('')
  const [selectedMonth, setSelectedMonth] = useState<string>('')
  const [reportData, setReportData] = useState<CommissionReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [agentFilter, setAgentFilter] = useState<'internal' | 'outsource'>('internal')
  
  // ANP Modal State
  const [showANPModal, setShowANPModal] = useState(false)
  const [anpModalLoading, setAnpModalLoading] = useState(false)
  const [anpRelatedInvoices, setAnpRelatedInvoices] = useState<ANPRelatedInvoice[]>([])
  const [selectedInvoice, setSelectedInvoice] = useState<CommissionInvoice | null>(null)

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

  const fetchANPRelatedInvoices = async (invoice: CommissionInvoice) => {
    try {
      setAnpModalLoading(true)
      const response = await fetch(`/api/invoices/anp-related?invoice_id=${invoice.bubble_id}`)
      const data = await response.json()
      
      if (response.ok) {
        setAnpRelatedInvoices(data.invoices || [])
      } else {
        console.error('Failed to fetch ANP related invoices:', data.message)
        setAnpRelatedInvoices([])
      }
    } catch (error) {
      console.error('Error fetching ANP related invoices:', error)
      setAnpRelatedInvoices([])
    } finally {
      setAnpModalLoading(false)
    }
  }

  const handleViewANP = async (invoice: CommissionInvoice) => {
    setSelectedInvoice(invoice)
    setShowANPModal(true)
    await fetchANPRelatedInvoices(invoice)
  }

  const getTotalAmount = () => {
    return anpRelatedInvoices.reduce((sum, invoice) => sum + parseFloat(invoice.amount || '0'), 0)
  }

  const checkANPCalculation = () => {
    if (anpRelatedInvoices.length === 0) return false
    
    const totalAmount = getTotalAmount()
    
    // Check if all invoices have the same achieved_monthly_anp and it equals the total
    const firstANP = parseFloat(anpRelatedInvoices[0]?.achieved_monthly_anp || '0')
    const allSameANP = anpRelatedInvoices.every(invoice => 
      Math.abs(parseFloat(invoice.achieved_monthly_anp || '0') - firstANP) < 0.01
    )
    
    const anpMatchesTotal = Math.abs(totalAmount - firstANP) < 0.01
    
    return allSameANP && anpMatchesTotal && firstANP > 0
  }

  const formatDateANP = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    } catch {
      return dateString
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

  const formatCurrency = (amount: number | string | null) => {
    if (!amount) return 'RM 0.00'
    const num = typeof amount === 'string' ? parseFloat(amount) : amount
    return isNaN(num) ? 'RM 0.00' : new Intl.NumberFormat('en-MY', {
      style: 'currency',
      currency: 'MYR'
    }).format(num)
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
            <Select
              value={agentFilter}
              onValueChange={(value) => {
                setAgentFilter(value as 'internal' | 'outsource')
                setSelectedAgent('') // Reset selected agent when type changes
                setReportData(null) // Clear report data
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select agent type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="internal">Internal Agent</SelectItem>
                <SelectItem value="outsource">Outsource Agent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Agent Selector */}
          <div>
            <label className="block text-sm font-medium mb-2">Select Agent</label>
            <Select
              value={selectedAgent}
              onValueChange={(value) => {
                setSelectedAgent(value)
                setReportData(null) // Clear report data when agent changes
              }}
              disabled={filteredAgents.length === 0}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={
                  filteredAgents.length === 0 
                    ? `No ${agentFilter} agents available` 
                    : 'Choose an agent'
                } />
              </SelectTrigger>
              <SelectContent>
                {filteredAgents.map((agent) => (
                  <SelectItem key={agent.bubble_id} value={agent.bubble_id}>
                    {agent.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Month Selector */}
          <div>
            <label className="block text-sm font-medium mb-2">Select Month</label>
            <Select
              value={selectedMonth}
              onValueChange={(value) => {
                setSelectedMonth(value)
                setReportData(null) // Clear report data when month changes
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select month" />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((month) => (
                  <SelectItem key={month.value} value={month.value}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                    <th className="border border-gray-200 px-4 py-3 text-left font-medium text-gray-900">Customer Name</th>
                    <th className="border border-gray-200 px-4 py-3 text-left font-medium text-gray-900">Payment Date</th>
                    <th className="border border-gray-200 px-4 py-3 text-right font-medium text-gray-900">Invoice Amount</th>
                    <th className="border border-gray-200 px-4 py-3 text-right font-medium text-gray-900">Monthly ANP</th>
                    <th className="border border-gray-200 px-4 py-3 text-right font-medium text-gray-900">Basic Commission (3%)</th>
                    <th className="border border-gray-200 px-4 py-3 text-right font-medium text-gray-900">Bonus Commission</th>
                    <th className="border border-gray-200 px-4 py-3 text-right font-medium text-gray-900">Total Commission</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {reportData.invoices.map((invoice) => (
                    <tr key={invoice.bubble_id} className="hover:bg-gray-50">
                      <td className="border border-gray-200 px-4 py-3 text-gray-900">{invoice.customer_name}</td>
                      <td className="border border-gray-200 px-4 py-3 text-gray-900">{formatDate(invoice.full_payment_date)}</td>
                      <td className="border border-gray-200 px-4 py-3 text-right text-gray-900">{formatCurrency(invoice.amount)}</td>
                      <td className="border border-gray-200 px-4 py-3 text-right text-gray-900">
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="text-xs px-2 py-1"
                          onClick={() => handleViewANP(invoice)}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          {formatCurrency(invoice.achieved_monthly_anp)}
                        </Button>
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-right text-gray-900">{formatCurrency(invoice.basic_commission)}</td>
                      <td className="border border-gray-200 px-4 py-3 text-right text-gray-900">{formatCurrency(invoice.bonus_commission)}</td>
                      <td className="border border-gray-200 px-4 py-3 text-right font-semibold text-gray-900">{formatCurrency(invoice.total_commission)}</td>
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

      {/* ANP Modal */}
      {showANPModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">ANP Calculation Details</h2>
                <p className="text-gray-600 dark:text-gray-300 mt-1">
                  Invoice {selectedInvoice.invoice_id} - Customer: {selectedInvoice.customer_name}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowANPModal(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              {anpModalLoading ? (
                <div className="flex justify-center items-center py-12">
                  <RefreshCw className="h-8 w-8 animate-spin" />
                  <span className="ml-3 text-gray-900 dark:text-white">Loading ANP details...</span>
                </div>
              ) : anpRelatedInvoices.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  No related ANP invoices found
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                    All invoices from agent that received 1st payment in the same month as this commission invoice.
                  </div>

                  {/* ANP Validation Highlight Box */}
                  <div className={`p-4 rounded-lg border-2 text-center font-bold text-lg ${
                    checkANPCalculation() 
                      ? 'bg-green-500/20 border-green-500 text-green-700 dark:text-green-400' 
                      : 'bg-red-500/20 border-red-500 text-red-700 dark:text-red-400'
                  } animate-pulse`}>
                    {checkANPCalculation() 
                      ? '✓ ANP CALCULATION CHECKED' 
                      : '⚠ PLEASE RERUN ANP UPDATE'
                    }
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-2 font-medium text-gray-900 dark:text-white">Invoice ID</th>
                          <th className="text-left py-3 px-2 font-medium text-gray-900 dark:text-white">Agent Name</th>
                          <th className="text-left py-3 px-2 font-medium text-gray-900 dark:text-white">1st Payment Date</th>
                          <th className="text-left py-3 px-2 font-medium text-gray-900 dark:text-white">1st Payment Amount</th>
                          <th className="text-left py-3 px-2 font-medium text-gray-900 dark:text-white">Invoice Amount</th>
                          <th className="text-left py-3 px-2 font-medium text-gray-900 dark:text-white">Achieved Monthly ANP</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800">
                        {anpRelatedInvoices.map((invoice) => (
                          <tr key={invoice.bubble_id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-700">
                            <td className="py-3 px-2 font-medium text-gray-900 dark:text-white">
                              {invoice.invoice_id}
                            </td>
                            <td className="py-3 px-2 text-gray-900 dark:text-white">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-blue-500" />
                                {invoice.agent_name}
                              </div>
                            </td>
                            <td className="py-3 px-2 text-gray-900 dark:text-white">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-green-500" />
                                {formatDateANP(invoice.first_payment_date)}
                              </div>
                            </td>
                            <td className="py-3 px-2 font-medium text-gray-900 dark:text-white">
                              <div className="flex items-center gap-2">
                                <DollarSign className="h-4 w-4 text-orange-500" />
                                {formatCurrency(invoice.first_payment_amount)}
                              </div>
                            </td>
                            <td className="py-3 px-2 font-medium text-gray-900 dark:text-white">
                              <div className="flex items-center gap-2">
                                <DollarSign className="h-4 w-4 text-green-500" />
                                {formatCurrency(invoice.amount)}
                              </div>
                            </td>
                            <td className="py-3 px-2 font-medium text-gray-900 dark:text-white">
                              <div className="flex items-center gap-2">
                                <DollarSign className="h-4 w-4 text-purple-500" />
                                {formatCurrency(invoice.achieved_monthly_anp)}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-gray-300 bg-gray-50 dark:bg-gray-700">
                          <td colSpan={4} className="py-3 px-2 font-bold text-right text-gray-900 dark:text-white">
                            Total Invoice Amount:
                          </td>
                          <td className="py-3 px-2 font-bold text-gray-900 dark:text-white">
                            <div className="flex items-center gap-2 text-lg">
                              <DollarSign className="h-5 w-5 text-green-600" />
                              {formatCurrency(getTotalAmount())}
                            </div>
                          </td>
                          <td className="py-3 px-2"></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}