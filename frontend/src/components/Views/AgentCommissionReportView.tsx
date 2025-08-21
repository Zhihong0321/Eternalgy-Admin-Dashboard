import { useState, useEffect } from 'react'
import { Button } from '../ui/button'
import { Card } from '../ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog'
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

interface InvoiceItem {
  bubble_id: string
  description: string
  amount: number
  unit_price: number
  qty: number
  sort: number | string
  item_type: string | null
}

interface InvoiceDetails {
  invoice: {
    bubble_id: string
    invoice_id: number
    amount: number
    invoice_date: string | null
    created_date: string
    full_payment_date: string | null
    customer_name: string
    customer_bubble_id: string | null
  }
  invoice_items: InvoiceItem[]
  total_items_amount: number
  debug_info?: {
    invoice_item_table_exists: boolean
    items_count: number
  }
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
  const [invoiceDetails, setInvoiceDetails] = useState<InvoiceDetails | null>(null)
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)
  const [isLoadingInvoice, setIsLoadingInvoice] = useState(false)

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

  const handleViewInvoice = async (invoice: CommissionInvoice) => {
    setIsLoadingInvoice(true)
    setShowInvoiceModal(true)
    
    try {
      console.log('Fetching invoice details for:', invoice.bubble_id)
      const response = await fetch(`/api/invoice/details/${invoice.bubble_id}`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('Invoice details received:', data)
      console.log('Invoice items count:', data.invoice_items ? data.invoice_items.length : 'No items')
      console.log('Invoice date:', data.invoice ? data.invoice.invoice_date : 'No date')
      console.log('Debug info:', data.debug_info)
      setInvoiceDetails(data)
    } catch (error) {
      console.error('Error fetching invoice details:', error)
      alert('Failed to load invoice details. Please try again.')
      setShowInvoiceModal(false)
    } finally {
      setIsLoadingInvoice(false)
    }
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[180px]">Customer Name</TableHead>
                    <TableHead>Payment Date</TableHead>
                    <TableHead className="text-right">Eligible Amount</TableHead>
                    <TableHead className="text-right">Invoice Amount</TableHead>
                    <TableHead className="text-right">Monthly ANP</TableHead>
                    <TableHead className="text-right">Basic Commission (3%)</TableHead>
                    <TableHead className="text-right">Bonus Commission</TableHead>
                    <TableHead className="text-right">Total Commission</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.invoices.map((invoice) => (
                    <TableRow key={invoice.bubble_id}>
                      <TableCell className="font-medium">{invoice.customer_name}</TableCell>
                      <TableCell>{formatDate(invoice.full_payment_date)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(invoice.amount_eligible_for_comm)}</TableCell>
                      <TableCell className="text-right">
                        <button 
                          onClick={() => handleViewInvoice(invoice)}
                          className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                        >
                          {formatCurrency(invoice.amount)}
                        </button>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="text-xs px-2 py-1"
                          onClick={() => handleViewANP(invoice)}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          {formatCurrency(invoice.achieved_monthly_anp)}
                        </Button>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(invoice.basic_commission)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(invoice.bonus_commission)}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(invoice.total_commission)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Invoice ID</TableHead>
                          <TableHead>Agent Name</TableHead>
                          <TableHead>1st Payment Date</TableHead>
                          <TableHead>1st Payment Amount</TableHead>
                          <TableHead>Invoice Amount</TableHead>
                          <TableHead>Achieved Monthly ANP</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {anpRelatedInvoices.map((invoice) => (
                          <TableRow key={invoice.bubble_id}>
                            <TableCell className="font-medium">
                              {invoice.invoice_id}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-blue-500" />
                                {invoice.agent_name}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-green-500" />
                                {formatDateANP(invoice.first_payment_date)}
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <DollarSign className="h-4 w-4 text-orange-500" />
                                {formatCurrency(invoice.first_payment_amount)}
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <DollarSign className="h-4 w-4 text-green-500" />
                                {formatCurrency(invoice.amount)}
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <DollarSign className="h-4 w-4 text-purple-500" />
                                {formatCurrency(invoice.achieved_monthly_anp)}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="border-t-2 bg-muted/50">
                          <TableCell colSpan={4} className="font-bold text-right">
                            Total Invoice Amount:
                          </TableCell>
                          <TableCell className="font-bold">
                            <div className="flex items-center gap-2 text-lg">
                              <DollarSign className="h-5 w-5 text-green-600" />
                              {formatCurrency(getTotalAmount())}
                            </div>
                          </TableCell>
                          <TableCell></TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Invoice Details Modal */}
      <Dialog open={showInvoiceModal} onOpenChange={setShowInvoiceModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">Invoice Details</DialogTitle>
            <DialogDescription>
              {invoiceDetails ? `Invoice #${invoiceDetails.invoice.invoice_id}` : 'Loading invoice details...'}
            </DialogDescription>
          </DialogHeader>
          
          {isLoadingInvoice ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-6 w-6 animate-spin mr-2" />
              <span>Loading invoice details...</span>
            </div>
          ) : invoiceDetails ? (
            <div className="space-y-6 p-4">
              {/* Invoice Header - Styled like a real invoice */}
              <div className="border border-gray-200 rounded-lg p-6 bg-white">
                <div className="mb-4 border-b pb-4">
                  <h2 className="text-2xl font-bold text-gray-900">INVOICE</h2>
                  <p className="text-lg text-gray-600">#{invoiceDetails.invoice.invoice_id}</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Bill To:</h3>
                    <p className="text-gray-700 font-medium">{invoiceDetails.invoice.customer_name || 'Unknown Customer'}</p>
                  </div>
                  
                  <div className="text-left md:text-right">
                    <div className="space-y-2">
                      <div>
                        <span className="text-sm text-gray-600">Invoice Date: </span>
                        <span className="font-medium">
                          {invoiceDetails.invoice.invoice_date 
                            ? new Date(invoiceDetails.invoice.invoice_date).toLocaleDateString()
                            : 'N/A'
                          }
                        </span>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">Amount: </span>
                        <span className="font-bold text-lg text-green-600">
                          RM {Number(invoiceDetails.invoice.amount || 0).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Invoice Items Table */}
              <div className="border border-gray-200 rounded-lg p-6 bg-white">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Items & Services</h3>
                  <span className="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">
                    {invoiceDetails.invoice_items ? invoiceDetails.invoice_items.length : 0} items
                  </span>
                </div>
                
                <Table>
                  <TableHeader>
                    <TableRow className="border-b-2 border-gray-300">
                      <TableHead className="text-left font-bold text-gray-900 py-3">Description</TableHead>
                      <TableHead className="text-right font-bold text-gray-900 py-3 w-32">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoiceDetails.invoice_items && invoiceDetails.invoice_items.length > 0 ? (
                      <>
                        {invoiceDetails.invoice_items.map((item, index) => {
                          console.log(`[DEBUG] Invoice item ${index}:`, item);
                          const amount = Number(item.amount || 0);
                          const formattedAmount = amount.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                          console.log(`[DEBUG] Item amount: ${item.amount} -> ${amount} -> ${formattedAmount}`);
                          
                          return (
                            <TableRow key={item.bubble_id || index} className="border-b border-gray-100">
                              <TableCell className="py-3 text-gray-700">
                                {item.description || 'No Description'}
                                {item.item_type && (
                                  <span className="ml-2 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                    {item.item_type}
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="py-3 text-right font-medium">
                                RM {formattedAmount}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        <TableRow className="border-t-2 border-gray-300 bg-gray-50">
                          <TableCell className="py-4 font-bold text-gray-900 text-lg">
                            TOTAL AMOUNT
                          </TableCell>
                          <TableCell className="py-4 text-right font-bold text-lg text-green-600">
                            RM {Number(invoiceDetails.total_items_amount || invoiceDetails.invoice.amount || 0).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </TableCell>
                        </TableRow>
                      </>
                    ) : (
                      <>
                        <TableRow>
                          <TableCell className="py-3 text-gray-700">
                            Insurance Premium (Total Invoice Amount)
                          </TableCell>
                          <TableCell className="py-3 text-right font-medium">
                            RM {Number(invoiceDetails.invoice.amount || 0).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </TableCell>
                        </TableRow>
                        <TableRow className="border-t-2 border-gray-300 bg-gray-50">
                          <TableCell className="py-4 font-bold text-gray-900 text-lg">
                            TOTAL AMOUNT
                          </TableCell>
                          <TableCell className="py-4 text-right font-bold text-lg text-green-600">
                            RM {Number(invoiceDetails.invoice.amount || 0).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </TableCell>
                        </TableRow>
                      </>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Debug Info (only show if there are issues) */}
              {invoiceDetails.debug_info && !invoiceDetails.debug_info.invoice_item_table_exists && (
                <div className="text-xs text-gray-500 p-2 bg-yellow-50 border border-yellow-200 rounded">
                  Note: Invoice items table not available in database. Showing invoice total amount only.
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg">Failed to load invoice details</p>
              <p className="text-sm mt-2">Please try again or contact support if the issue persists.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}