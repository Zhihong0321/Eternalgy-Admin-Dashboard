import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RefreshCw, CheckCircle, DollarSign, Calendar, User, Filter, Eye, X } from 'lucide-react'

interface Invoice {
  bubble_id: string
  invoice_id: number
  amount: string
  full_payment_date: string | null
  created_date: string
  customer_name: string | null
  agent_name: string | null
  linked_customer: string | null
  invoice_date: string | null
  payment_count: number | null
  payment_sum: number | null
}

interface RescanResult {
  message: string
  updated_invoices: number
  total_checked: number
  errors: Array<{ invoice_id: string; error: string }>
}


interface Agent {
  bubble_id: string
  name: string
}

interface ANPInvoice {
  bubble_id: string
  invoice_id: number
  agent_name: string
  first_payment_date: string
  amount: string
  achieved_monthly_anp: string | null
  first_payment_amount: number | null
}

interface PaymentDetail {
  bubble_id: string
  amount: string
  payment_method: string | null
  payment_date: string | null
  verified_by_name: string | null
}

export function FullPaymentInvoiceView() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [rescanLoading, setRescanLoading] = useState(false)
  const [totalCount, setTotalCount] = useState(0)
  const [lastRescanResult, setLastRescanResult] = useState<RescanResult | null>(null)
  const [agents, setAgents] = useState<Agent[]>([])
  const [selectedMonth, setSelectedMonth] = useState<string>('all')
  const [selectedAgent, setSelectedAgent] = useState<string>('all')
  
  // ANP Modal State
  const [showANPModal, setShowANPModal] = useState(false)
  const [anpLoading, setAnpLoading] = useState(false)
  const [anpInvoices, setAnpInvoices] = useState<ANPInvoice[]>([])
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  
  // Payment Details Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetail[]>([])
  const [selectedPaymentInvoice, setSelectedPaymentInvoice] = useState<Invoice | null>(null)

  const fetchFullyPaidInvoices = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        limit: '100'
      })
      
      if (selectedMonth !== 'all') {
        params.append('month', selectedMonth)
      }
      
      if (selectedAgent !== 'all') {
        params.append('agent', selectedAgent)
      }
      
      const response = await fetch(`/api/invoices/fully-paid?${params.toString()}`)
      const data = await response.json()
      
      if (response.ok) {
        setInvoices(data.invoices || [])
        setTotalCount(data.total || 0)
      } else {
        console.error('Failed to fetch invoices:', data.message)
      }
    } catch (error) {
      console.error('Error fetching invoices:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAgents = async () => {
    try {
      const response = await fetch('/api/agents/list')
      const data = await response.json()
      
      if (response.ok) {
        setAgents(data.agents || [])
      } else {
        console.error('Failed to fetch agents:', data.message)
      }
    } catch (error) {
      console.error('Error fetching agents:', error)
    }
  }

  const generateMonthOptions = () => {
    const options = [{ value: 'all', label: 'All Months' }]
    const now = new Date()
    
    // Current month
    const currentMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0')
    const currentMonthLabel = now.toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
    options.push({ value: currentMonth, label: currentMonthLabel })
    
    // Last 12 months
    for (let i = 1; i <= 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const value = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0')
      const label = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
      options.push({ value, label })
    }
    
    return options
  }

  const handleRescanPayments = async () => {
    try {
      setRescanLoading(true)
      const response = await fetch('/api/invoices/rescan-payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      const data = await response.json()
      
      if (response.ok) {
        setLastRescanResult(data)
        // Refresh the invoice list after rescan
        await fetchFullyPaidInvoices()
      } else {
        console.error('Rescan failed:', data.message)
        setLastRescanResult({
          message: `Error: ${data.message}`,
          updated_invoices: 0,
          total_checked: 0,
          errors: []
        })
      }
    } catch (error) {
      console.error('Error during rescan:', error)
      setLastRescanResult({
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        updated_invoices: 0,
        total_checked: 0,
        errors: []
      })
    } finally {
      setRescanLoading(false)
    }
  }

  const fetchANPRelatedInvoices = async (invoice: Invoice) => {
    try {
      setAnpLoading(true)
      const response = await fetch(`/api/invoices/anp-related?invoice_id=${invoice.bubble_id}`)
      const data = await response.json()
      
      if (response.ok) {
        setAnpInvoices(data.invoices || [])
      } else {
        console.error('Failed to fetch ANP related invoices:', data.message)
        setAnpInvoices([])
      }
    } catch (error) {
      console.error('Error fetching ANP related invoices:', error)
      setAnpInvoices([])
    } finally {
      setAnpLoading(false)
    }
  }

  const handleViewANP = async (invoice: Invoice) => {
    setSelectedInvoice(invoice)
    setShowANPModal(true)
    await fetchANPRelatedInvoices(invoice)
  }

  const fetchPaymentDetails = async (invoice: Invoice) => {
    try {
      setPaymentLoading(true)
      console.log('[DEBUG] Fetching payment details for invoice:', invoice.bubble_id)
      const response = await fetch(`/api/payments/invoice/${invoice.bubble_id}`)
      const data = await response.json()
      
      console.log('[DEBUG] Payment details API response:', data)
      
      if (response.ok) {
        setPaymentDetails(data.payments || [])
        console.log('[DEBUG] Set payment details:', data.payments || [])
      } else {
        console.error('Failed to fetch payment details:', data.message)
        setPaymentDetails([])
      }
    } catch (error) {
      console.error('Error fetching payment details:', error)
      setPaymentDetails([])
    } finally {
      setPaymentLoading(false)
    }
  }


  const handleViewPayments = async (invoice: Invoice) => {
    setSelectedPaymentInvoice(invoice)
    setShowPaymentModal(true)
    await fetchPaymentDetails(invoice)
  }

  const getTotalAmount = () => {
    return anpInvoices.reduce((sum, invoice) => sum + parseFloat(invoice.amount || '0'), 0)
  }

  const checkANPCalculation = () => {
    if (anpInvoices.length === 0) return false
    
    const totalAmount = getTotalAmount()
    
    // Check if all invoices have the same achieved_monthly_anp and it equals the total
    const firstANP = parseFloat(anpInvoices[0]?.achieved_monthly_anp || '0')
    const allSameANP = anpInvoices.every(invoice => 
      Math.abs(parseFloat(invoice.achieved_monthly_anp || '0') - firstANP) < 0.01
    )
    
    const anpMatchesTotal = Math.abs(totalAmount - firstANP) < 0.01
    
    return allSameANP && anpMatchesTotal && firstANP > 0
  }

  const formatCurrency = (amount: string | null) => {
    if (!amount) return 'RM 0.00'
    const num = parseFloat(amount)
    return isNaN(num) ? amount : `RM ${num.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
  }

  const formatDate = (dateString: string | null) => {
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

  useEffect(() => {
    fetchAgents()
  }, [])

  useEffect(() => {
    fetchFullyPaidInvoices()
  }, [selectedMonth, selectedAgent])

  return (
    <div className="space-y-6">
      {/* Header with Rescan Button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Full Payment Invoices</h1>
          <p className="text-muted-foreground">
            List of invoices where payment has been completed ({totalCount} total)
          </p>
        </div>
        <Button 
          onClick={handleRescanPayments} 
          disabled={rescanLoading}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${rescanLoading ? 'animate-spin' : ''}`} />
          {rescanLoading ? 'Rescanning...' : 'Rescan Full Payments'}
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Month Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Filter by Month</label>
              <select 
                value={selectedMonth} 
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {generateMonthOptions().map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Agent Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Filter by Agent</label>
              <select 
                value={selectedAgent} 
                onChange={(e) => setSelectedAgent(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Agents</option>
                {agents
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((agent) => (
                    <option key={agent.bubble_id} value={agent.bubble_id}>
                      {agent.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rescan Result */}
      {lastRescanResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Rescan Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p><strong>Status:</strong> {lastRescanResult.message}</p>
              <p><strong>Invoices Updated:</strong> {lastRescanResult.updated_invoices}</p>
              <p><strong>Total Checked:</strong> {lastRescanResult.total_checked}</p>
              {lastRescanResult.errors.length > 0 && (
                <details className="mt-2">
                  <summary className="cursor-pointer font-medium text-red-500">
                    Errors ({lastRescanResult.errors.length})
                  </summary>
                  <div className="mt-2 space-y-1">
                    {lastRescanResult.errors.map((error, index) => (
                      <div key={index} className="text-sm text-red-500">
                        Invoice {error.invoice_id}: {error.error}
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          </CardContent>
        </Card>
      )}


      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <CardTitle>Fully Paid Invoices</CardTitle>
          <CardDescription>
            Invoices where linked payments total equals or exceeds the invoice amount
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading invoices...</span>
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No fully paid invoices found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2">Invoice ID</th>
                    <th className="text-left py-3 px-2">Agent</th>
                    <th className="text-left py-3 px-2">Customer</th>
                    <th className="text-left py-3 px-2">Payment Count</th>
                    <th className="text-left py-3 px-2">Invoice Amount</th>
                    <th className="text-left py-3 px-2">Payments Sum</th>
                    <th className="text-left py-3 px-2">Full Payment Date</th>
                    <th className="text-left py-3 px-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice) => (
                    <tr key={invoice.bubble_id} className="border-b hover:bg-muted/50">
                      {/* Invoice ID */}
                      <td className="py-3 px-2">
                        <div className="font-medium">
                          {invoice.invoice_id || 'N/A'}
                        </div>
                      </td>
                      
                      {/* Agent Name */}
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-blue-500" />
                          {invoice.agent_name || 'N/A'}
                        </div>
                      </td>
                      
                      {/* Customer Name */}
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          {invoice.customer_name || 'N/A'}
                        </div>
                      </td>
                      
                      {/* Payment Count */}
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="px-2 py-1 text-xs font-medium bg-blue-500/10 text-blue-500 border border-blue-500/20 hover:bg-blue-500/20"
                            onClick={() => handleViewPayments(invoice)}
                            disabled={!invoice.payment_count || invoice.payment_count === 0}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            {invoice.payment_count || 0} payments
                          </Button>
                        </div>
                      </td>
                      
                      {/* Invoice Amount */}
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2 font-medium">
                          <DollarSign className="h-4 w-4 text-green-500" />
                          {formatCurrency(invoice.amount)}
                        </div>
                      </td>
                      
                      {/* Payment Sum */}
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2 font-medium">
                          <DollarSign className="h-4 w-4 text-purple-500" />
                          {formatCurrency(invoice.payment_sum?.toString() || null)}
                        </div>
                      </td>
                      
                      {/* Full Payment Date */}
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-green-500" />
                          {formatDate(invoice.full_payment_date)}
                        </div>
                      </td>
                      
                      {/* Actions */}
                      <td className="py-3 px-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="flex items-center gap-1 text-xs"
                          onClick={() => handleViewANP(invoice)}
                        >
                          <Eye className="h-3 w-3" />
                          VIEW ANP
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Details Modal */}
      {showPaymentModal && selectedPaymentInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Payment Details</h2>
                <p className="text-gray-600 dark:text-gray-300 mt-1">
                  Invoice {selectedPaymentInvoice.invoice_id} - {selectedPaymentInvoice.customer_name}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPaymentModal(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              {paymentLoading ? (
                <div className="flex justify-center items-center py-12">
                  <RefreshCw className="h-8 w-8 animate-spin" />
                  <span className="ml-3 text-gray-900 dark:text-white">Loading payment details...</span>
                </div>
              ) : paymentDetails.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  No payment details found for this invoice
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                    All payments that contribute to completing this invoice total amount.
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-2 font-medium text-gray-900 dark:text-white">Payment Amount</th>
                          <th className="text-left py-3 px-2 font-medium text-gray-900 dark:text-white">Payment Method</th>
                          <th className="text-left py-3 px-2 font-medium text-gray-900 dark:text-white">Payment Date</th>
                          <th className="text-left py-3 px-2 font-medium text-gray-900 dark:text-white">Verified By</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800">
                        {paymentDetails.map((payment) => (
                          <tr key={payment.bubble_id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-700">
                            <td className="py-3 px-2 font-medium text-gray-900 dark:text-white">
                              <div className="flex items-center gap-2">
                                <DollarSign className="h-4 w-4 text-green-500" />
                                {formatCurrency(payment.amount)}
                              </div>
                            </td>
                            <td className="py-3 px-2 text-gray-900 dark:text-white">
                              {payment.payment_method || 'N/A'}
                            </td>
                            <td className="py-3 px-2 text-gray-900 dark:text-white">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-blue-500" />
                                {formatDate(payment.payment_date)}
                              </div>
                            </td>
                            <td className="py-3 px-2 text-gray-900 dark:text-white">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-purple-500" />
                                {payment.verified_by_name || 'N/A'}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-gray-300 bg-gray-50 dark:bg-gray-700">
                          <td className="py-3 px-2 font-bold text-gray-900 dark:text-white">
                            <div className="flex items-center gap-2 text-lg">
                              <DollarSign className="h-5 w-5 text-green-600" />
                              {formatCurrency(paymentDetails.reduce((sum, payment) => sum + parseFloat(payment.amount || '0'), 0).toString())}
                            </div>
                          </td>
                          <td colSpan={2} className="py-3 px-2 font-bold text-right text-gray-900 dark:text-white">
                            Total Payments:
                          </td>
                          <td className="py-3 px-2 text-gray-900 dark:text-white">
                            <span className="text-sm text-gray-500">
                              {paymentDetails.length} payment(s)
                            </span>
                          </td>
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

      {/* ANP Modal */}
      {showANPModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h2 className="text-xl font-bold">ANP Calculation Details</h2>
                <p className="text-muted-foreground mt-1">
                  Invoice {selectedInvoice.invoice_id} - Agent: {selectedInvoice.agent_name}
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
              {anpLoading ? (
                <div className="flex justify-center items-center py-12">
                  <RefreshCw className="h-8 w-8 animate-spin" />
                  <span className="ml-3">Loading ANP details...</span>
                </div>
              ) : anpInvoices.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No related ANP invoices found
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-sm text-muted-foreground mb-4">
                    All invoices from <strong>{selectedInvoice.agent_name}</strong> that received 1st payment in the same month.
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
                          <th className="text-left py-3 px-2 font-medium">Invoice ID</th>
                          <th className="text-left py-3 px-2 font-medium">Agent Name</th>
                          <th className="text-left py-3 px-2 font-medium">1st Payment Date</th>
                          <th className="text-left py-3 px-2 font-medium">1st Payment Amount</th>
                          <th className="text-left py-3 px-2 font-medium">Invoice Amount</th>
                          <th className="text-left py-3 px-2 font-medium">Achieved Monthly ANP</th>
                        </tr>
                      </thead>
                      <tbody>
                        {anpInvoices.map((invoice) => (
                          <tr key={invoice.bubble_id} className="border-b hover:bg-muted/50">
                            <td className="py-3 px-2 font-medium">
                              {invoice.invoice_id}
                            </td>
                            <td className="py-3 px-2">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-blue-500" />
                                {invoice.agent_name}
                              </div>
                            </td>
                            <td className="py-3 px-2">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-green-500" />
                                {formatDate(invoice.first_payment_date)}
                              </div>
                            </td>
                            <td className="py-3 px-2 font-medium">
                              <div className="flex items-center gap-2">
                                <DollarSign className="h-4 w-4 text-orange-500" />
                                {formatCurrency(invoice.first_payment_amount?.toString() || '0')}
                              </div>
                            </td>
                            <td className="py-3 px-2 font-medium">
                              <div className="flex items-center gap-2">
                                <DollarSign className="h-4 w-4 text-green-500" />
                                {formatCurrency(invoice.amount)}
                              </div>
                            </td>
                            <td className="py-3 px-2 font-medium">
                              <div className="flex items-center gap-2">
                                <DollarSign className="h-4 w-4 text-purple-500" />
                                {formatCurrency(invoice.achieved_monthly_anp)}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-gray-300 bg-muted/30">
                          <td colSpan={4} className="py-3 px-2 font-bold text-right">
                            Total Invoice Amount:
                          </td>
                          <td className="py-3 px-2 font-bold">
                            <div className="flex items-center gap-2 text-lg">
                              <DollarSign className="h-5 w-5 text-green-600" />
                              {formatCurrency(getTotalAmount().toString())}
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