import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { RefreshCw, DollarSign, Calendar, User, Filter, Eye, X } from 'lucide-react'

interface EligibleCommInvoice {
  bubble_id: string
  invoice_id: number
  amount: string
  amount_eligible_for_comm: string
  eligible_amount_description: string | null
  customer_name: string | null
  agent_name: string | null
  invoice_date: string | null
  created_date: string
}

interface Agent {
  bubble_id: string
  name: string
}

interface InvoiceDetailModal {
  invoice: EligibleCommInvoice | null
  show: boolean
}

export function CheckEligibleCommView() {
  const [invoices, setInvoices] = useState<EligibleCommInvoice[]>([])
  const [loading, setLoading] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [agents, setAgents] = useState<Agent[]>([])
  const [selectedAgent, setSelectedAgent] = useState<string>('all')
  const [detailModal, setDetailModal] = useState<InvoiceDetailModal>({ invoice: null, show: false })

  const fetchEligibleCommInvoices = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        limit: '100'
      })
      
      if (selectedAgent !== 'all') {
        params.append('agent', selectedAgent)
      }
      
      const response = await fetch(`/api/invoices/eligible-comm?${params.toString()}`)
      const data = await response.json()
      
      if (response.ok) {
        setInvoices(data.invoices || [])
        setTotalCount(data.total || 0)
      } else {
        console.error('Failed to fetch eligible commission invoices:', data.message)
      }
    } catch (error) {
      console.error('Error fetching eligible commission invoices:', error)
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

  const handleViewDetails = (invoice: EligibleCommInvoice) => {
    setDetailModal({ invoice, show: true })
  }

  const closeDetailModal = () => {
    setDetailModal({ invoice: null, show: false })
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

  const getAmountDifference = (invoice: EligibleCommInvoice) => {
    const amount = parseFloat(invoice.amount || '0')
    const eligibleAmount = parseFloat(invoice.amount_eligible_for_comm || '0')
    return eligibleAmount - amount
  }

  useEffect(() => {
    fetchAgents()
  }, [])

  useEffect(() => {
    fetchEligibleCommInvoices()
  }, [selectedAgent])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Check Eligible Amount for Comm</h1>
          <p className="text-muted-foreground">
            Invoices where eligible commission amount is higher than invoice amount ({totalCount} total)
          </p>
        </div>
        <Button 
          onClick={fetchEligibleCommInvoices} 
          disabled={loading}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Loading...' : 'Refresh'}
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
            {/* Agent Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Filter by Agent</label>
              <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select agent" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Agents</SelectItem>
                  {agents
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((agent) => (
                      <SelectItem key={agent.bubble_id} value={agent.bubble_id}>
                        {agent.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <CardTitle>Eligible Commission Higher than Invoice Amount</CardTitle>
          <CardDescription>
            Invoices where amount_eligible_for_comm is greater than the invoice amount
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
              No invoices found where eligible commission amount exceeds invoice amount
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2">Invoice ID</th>
                    <th className="text-left py-3 px-2">Agent</th>
                    <th className="text-left py-3 px-2">Customer</th>
                    <th className="text-left py-3 px-2">Invoice Amount</th>
                    <th className="text-left py-3 px-2">Eligible Comm Amount</th>
                    <th className="text-left py-3 px-2">Difference</th>
                    <th className="text-left py-3 px-2">Invoice Date</th>
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
                      
                      {/* Invoice Amount */}
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2 font-medium">
                          <DollarSign className="h-4 w-4 text-green-500" />
                          {formatCurrency(invoice.amount)}
                        </div>
                      </td>
                      
                      {/* Eligible Commission Amount */}
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2 font-medium">
                          <DollarSign className="h-4 w-4 text-purple-500" />
                          {formatCurrency(invoice.amount_eligible_for_comm)}
                        </div>
                      </td>
                      
                      {/* Difference */}
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2 font-medium">
                          <DollarSign className="h-4 w-4 text-orange-500" />
                          <span className="text-orange-600">
                            +{formatCurrency(getAmountDifference(invoice).toString())}
                          </span>
                        </div>
                      </td>
                      
                      {/* Invoice Date */}
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-blue-500" />
                          {formatDate(invoice.invoice_date)}
                        </div>
                      </td>
                      
                      {/* Actions */}
                      <td className="py-3 px-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="flex items-center gap-1 text-xs"
                          onClick={() => handleViewDetails(invoice)}
                        >
                          <Eye className="h-3 w-3" />
                          VIEW
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

      {/* Invoice Detail Modal */}
      {detailModal.show && detailModal.invoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Invoice Details</h2>
                <p className="text-gray-600 dark:text-gray-300 mt-1">
                  Invoice {detailModal.invoice.invoice_id} - {detailModal.invoice.customer_name}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={closeDetailModal}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              <div className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Invoice Amount</h3>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(detailModal.invoice.amount)}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Eligible Commission Amount</h3>
                    <p className="text-lg font-semibold text-purple-600">
                      {formatCurrency(detailModal.invoice.amount_eligible_for_comm)}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Difference</h3>
                    <p className="text-lg font-semibold text-orange-600">
                      +{formatCurrency(getAmountDifference(detailModal.invoice).toString())}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Agent</h3>
                    <p className="text-lg text-gray-900 dark:text-white">
                      {detailModal.invoice.agent_name || 'N/A'}
                    </p>
                  </div>
                </div>

                {/* Eligible Amount Description */}
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Eligible Amount Description
                  </h3>
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
                      {detailModal.invoice.eligible_amount_description || 'No description available'}
                    </p>
                  </div>
                </div>

                {/* Additional Info */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Invoice Date</h3>
                    <p className="text-gray-900 dark:text-white">
                      {formatDate(detailModal.invoice.invoice_date)}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Created Date</h3>
                    <p className="text-gray-900 dark:text-white">
                      {formatDate(detailModal.invoice.created_date)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}