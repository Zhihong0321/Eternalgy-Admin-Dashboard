import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog'
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

export function CheckEligibleCommView() {
  const [invoices, setInvoices] = useState<EligibleCommInvoice[]>([])
  const [loading, setLoading] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [agents, setAgents] = useState<Agent[]>([])
  const [selectedAgent, setSelectedAgent] = useState<string>('all')
  const [detailModal, setDetailModal] = useState<InvoiceDetailModal>({ invoice: null, show: false })
  
  // Invoice Details Modal State
  const [invoiceDetails, setInvoiceDetails] = useState<InvoiceDetails | null>(null)
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)
  const [isLoadingInvoice, setIsLoadingInvoice] = useState(false)

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

  const handleViewInvoice = async (invoice: EligibleCommInvoice) => {
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
                        <Button 
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewInvoice(invoice)}
                          className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950 font-medium"
                        >
                          <DollarSign className="h-3 w-3 mr-1" />
                          {formatCurrency(invoice.amount)}
                        </Button>
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
              {/* Invoice Header - Dark theme styled */}
              <div className="border border-gray-700 rounded-lg p-6 bg-gray-900">
                <div className="mb-4 border-b border-gray-700 pb-4">
                  <h2 className="text-2xl font-bold text-white">INVOICE</h2>
                  <p className="text-lg text-gray-300">#{invoiceDetails.invoice.invoice_id}</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">Bill To:</h3>
                    <p className="text-gray-300 font-medium">{invoiceDetails.invoice.customer_name || 'Unknown Customer'}</p>
                  </div>
                  
                  <div className="text-left md:text-right">
                    <div className="space-y-2">
                      <div>
                        <span className="text-sm text-gray-400">Invoice Date: </span>
                        <span className="font-medium text-gray-200">
                          {invoiceDetails.invoice.invoice_date 
                            ? new Date(invoiceDetails.invoice.invoice_date).toLocaleDateString()
                            : 'N/A'
                          }
                        </span>
                      </div>
                      <div>
                        <span className="text-sm text-gray-400">Amount: </span>
                        <span className="font-bold text-lg text-green-400">
                          RM {Number(invoiceDetails.invoice.amount || 0).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Invoice Items Table */}
              <div className="border border-gray-700 rounded-lg p-6 bg-gray-900">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-white">Items & Services</h3>
                  <span className="bg-blue-900 text-blue-200 text-sm font-medium px-3 py-1 rounded-full">
                    {invoiceDetails.invoice_items ? invoiceDetails.invoice_items.length : 0} items
                  </span>
                </div>
                
                <Table>
                  <TableHeader>
                    <TableRow className="border-b-2 border-gray-600">
                      <TableHead className="text-left font-bold text-white py-3">Description</TableHead>
                      <TableHead className="text-right font-bold text-white py-3 w-32">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoiceDetails.invoice_items && invoiceDetails.invoice_items.length > 0 ? (
                      <>
                        {invoiceDetails.invoice_items.map((item, index) => {
                          console.log(`[DEBUG] Invoice item ${index}:`, item);
                          
                          // Handle amount conversion more robustly
                          let amount = 0;
                          if (item.amount !== null && item.amount !== undefined) {
                            amount = parseFloat(String(item.amount).replace(/,/g, '')) || 0;
                          }
                          
                          let formattedAmount = '0.00';
                          try {
                            formattedAmount = amount.toLocaleString('en-MY', { 
                              minimumFractionDigits: 2, 
                              maximumFractionDigits: 2 
                            });
                          } catch (error) {
                            console.error(`[ERROR] Amount formatting failed:`, error);
                            formattedAmount = amount.toFixed(2);
                          }
                          
                          console.log(`[DEBUG] Item amount: ${item.amount} -> ${amount} -> ${formattedAmount}`);
                          
                          return (
                            <TableRow key={item.bubble_id || index} className="border-b border-gray-700">
                              <TableCell className="py-2 text-gray-300 text-sm">
                                <div className="text-sm leading-tight">
                                  {item.description || 'No Description'}
                                </div>
                                {item.item_type && (
                                  <span className="ml-2 text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded mt-1 inline-block">
                                    {item.item_type}
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="py-2 text-right font-medium text-sm text-white">
                                RM {formattedAmount}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        <TableRow className="border-t-2 border-gray-600 bg-gray-800">
                          <TableCell className="py-4 font-bold text-white text-lg">
                            TOTAL AMOUNT
                          </TableCell>
                          <TableCell className="py-4 text-right font-bold text-lg text-green-400">
                            RM {(() => {
                              const totalAmount = parseFloat(String(invoiceDetails.total_items_amount || invoiceDetails.invoice.amount || 0).replace(/,/g, '')) || 0;
                              try {
                                return totalAmount.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                              } catch (error) {
                                return totalAmount.toFixed(2);
                              }
                            })()}
                          </TableCell>
                        </TableRow>
                      </>
                    ) : (
                      <>
                        <TableRow>
                          <TableCell className="py-3 text-gray-300">
                            Insurance Premium (Total Invoice Amount)
                          </TableCell>
                          <TableCell className="py-3 text-right font-medium text-white">
                            RM {(() => {
                              const amount = parseFloat(String(invoiceDetails.invoice.amount || 0).replace(/,/g, '')) || 0;
                              try {
                                return amount.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                              } catch (error) {
                                return amount.toFixed(2);
                              }
                            })()}
                          </TableCell>
                        </TableRow>
                        <TableRow className="border-t-2 border-gray-600 bg-gray-800">
                          <TableCell className="py-4 font-bold text-white text-lg">
                            TOTAL AMOUNT
                          </TableCell>
                          <TableCell className="py-4 text-right font-bold text-lg text-green-400">
                            RM {(() => {
                              const amount = parseFloat(String(invoiceDetails.invoice.amount || 0).replace(/,/g, '')) || 0;
                              try {
                                return amount.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                              } catch (error) {
                                return amount.toFixed(2);
                              }
                            })()}
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