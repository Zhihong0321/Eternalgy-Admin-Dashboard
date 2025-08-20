import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RefreshCw, CheckCircle, DollarSign, Calendar, User, Eye, X } from 'lucide-react'

interface ANPInvoice {
  bubble_id: string
  invoice_id: number
  first_payment_date: string | null
  achieved_monthly_anp: string | null
  agent_name: string | null
  customer_name: string | null
  payment_sum: number | null
}

interface ANPResult {
  message: string
  updated_invoices: number
  total_checked: number
  processed_agents: number
  agent_month_combinations: number
  errors: Array<{ invoice_id?: string; agent_month?: string; error: string }>
}

interface ANPRelatedInvoice {
  bubble_id: string
  invoice_id: number
  agent_name: string
  first_payment_date: string
  amount: string
  achieved_monthly_anp: string | null
}

export function ANPCalculatorView() {
  const [invoices, setInvoices] = useState<ANPInvoice[]>([])
  const [loading, setLoading] = useState(true)
  const [anpLoading, setAnpLoading] = useState(false)
  const [totalCount, setTotalCount] = useState(0)
  const [lastAnpResult, setLastAnpResult] = useState<ANPResult | null>(null)
  
  // ANP Modal State
  const [showANPModal, setShowANPModal] = useState(false)
  const [anpModalLoading, setAnpModalLoading] = useState(false)
  const [anpRelatedInvoices, setAnpRelatedInvoices] = useState<ANPRelatedInvoice[]>([])
  const [selectedInvoice, setSelectedInvoice] = useState<ANPInvoice | null>(null)

  const fetchANPInvoices = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/invoices/anp-calculator?limit=100')
      const data = await response.json()
      
      if (response.ok) {
        setInvoices(data.invoices || [])
        setTotalCount(data.total || 0)
      } else {
        console.error('Failed to fetch ANP invoices:', data.message)
      }
    } catch (error) {
      console.error('Error fetching ANP invoices:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateANP = async () => {
    try {
      setAnpLoading(true)
      const response = await fetch('/api/invoices/update-anp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      const data = await response.json()
      
      if (response.ok) {
        setLastAnpResult(data)
        // Refresh the invoice list after ANP update
        await fetchANPInvoices()
      } else {
        console.error('ANP Update failed:', data.message)
        setLastAnpResult({
          message: `Error: ${data.message}`,
          updated_invoices: 0,
          total_checked: 0,
          processed_agents: 0,
          agent_month_combinations: 0,
          errors: []
        })
      }
    } catch (error) {
      console.error('Error during ANP update:', error)
      setLastAnpResult({
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        updated_invoices: 0,
        total_checked: 0,
        processed_agents: 0,
        agent_month_combinations: 0,
        errors: []
      })
    } finally {
      setAnpLoading(false)
    }
  }

  const fetchANPRelatedInvoices = async (invoice: ANPInvoice) => {
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

  const handleViewANP = async (invoice: ANPInvoice) => {
    setSelectedInvoice(invoice)
    setShowANPModal(true)
    await fetchANPRelatedInvoices(invoice)
  }

  const getTotalAmount = () => {
    return anpRelatedInvoices.reduce((sum, invoice) => sum + parseFloat(invoice.amount || '0'), 0)
  }

  const formatCurrency = (amount: string | number | null) => {
    if (!amount) return 'RM 0.00'
    const num = typeof amount === 'string' ? parseFloat(amount) : amount
    return isNaN(num) ? 'RM 0.00' : `RM ${num.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
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
    fetchANPInvoices()
  }, [])

  return (
    <div className="space-y-6">
      {/* Header with Update ANP Button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">ANP Calculator</h1>
          <p className="text-muted-foreground">
            Invoices with payments received and ANP calculations ({totalCount} total)
          </p>
        </div>
        <Button 
          onClick={handleUpdateANP}
          disabled={anpLoading}
          className="flex items-center gap-2"
        >
          <CheckCircle className={`h-4 w-4 ${anpLoading ? 'animate-spin' : ''}`} />
          {anpLoading ? 'Updating ANP...' : 'Update ANP'}
        </Button>
      </div>

      {/* ANP Update Result */}
      {lastAnpResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-blue-500" />
              ANP Update Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p><strong>Status:</strong> {lastAnpResult.message}</p>
              <p><strong>Invoices Updated:</strong> {lastAnpResult.updated_invoices}</p>
              <p><strong>Total Checked:</strong> {lastAnpResult.total_checked}</p>
              <p><strong>Agents Processed:</strong> {lastAnpResult.processed_agents}</p>
              <p><strong>Agent-Month Combinations:</strong> {lastAnpResult.agent_month_combinations}</p>
              {lastAnpResult.errors.length > 0 && (
                <details className="mt-2">
                  <summary className="cursor-pointer font-medium text-red-500">
                    Errors ({lastAnpResult.errors.length})
                  </summary>
                  <div className="mt-2 space-y-1">
                    {lastAnpResult.errors.map((error, index) => (
                      <div key={index} className="text-sm text-red-500">
                        {error.invoice_id && `Invoice ${error.invoice_id}: `}
                        {error.agent_month && `Agent-Month ${error.agent_month}: `}
                        {error.error}
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ANP Invoices Table */}
      <Card>
        <CardHeader>
          <CardTitle>ANP Calculator Invoices</CardTitle>
          <CardDescription>
            Invoices where payments have been received (payment sum &gt; 0)
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
              No invoices with payments found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2">Invoice ID</th>
                    <th className="text-left py-3 px-2">Agent Name</th>
                    <th className="text-left py-3 px-2">Customer Name</th>
                    <th className="text-left py-3 px-2">1st Payment Date</th>
                    <th className="text-left py-3 px-2">Achieved Monthly ANP</th>
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
                      
                      {/* 1st Payment Date */}
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-green-500" />
                          {formatDate(invoice.first_payment_date)}
                        </div>
                      </td>
                      
                      {/* Achieved Monthly ANP */}
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2 font-medium">
                          <DollarSign className="h-4 w-4 text-purple-500" />
                          {formatCurrency(invoice.achieved_monthly_anp)}
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
              {anpModalLoading ? (
                <div className="flex justify-center items-center py-12">
                  <RefreshCw className="h-8 w-8 animate-spin" />
                  <span className="ml-3">Loading ANP details...</span>
                </div>
              ) : anpRelatedInvoices.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No related ANP invoices found
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-sm text-muted-foreground mb-4">
                    All invoices from <strong>{selectedInvoice.agent_name}</strong> that received 1st payment in the same month.
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-2 font-medium">Invoice ID</th>
                          <th className="text-left py-3 px-2 font-medium">Agent Name</th>
                          <th className="text-left py-3 px-2 font-medium">1st Payment Date</th>
                          <th className="text-left py-3 px-2 font-medium">Amount</th>
                          <th className="text-left py-3 px-2 font-medium">Achieved Monthly ANP</th>
                        </tr>
                      </thead>
                      <tbody>
                        {anpRelatedInvoices.map((invoice) => (
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
                          <td colSpan={3} className="py-3 px-2 font-bold text-right">
                            Total Amount:
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