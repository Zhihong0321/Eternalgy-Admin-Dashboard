import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog'
import { RefreshCw, DollarSign, Calendar, User, Eye, X } from 'lucide-react'

interface AgentCommissionSummary {
  agent_bubble_id: string
  agent_name: string
  agent_type: string
  total_eligible_amount: number
  invoice_count: number
}

interface MonthlyCommReport {
  agents: AgentCommissionSummary[]
  selected_month: string
  total_invoices: number
  total_eligible_amount: number
}

interface CommissionInvoice {
  bubble_id: string
  invoice_id: number
  customer_name: string
  full_payment_date: string
  amount: number
  amount_eligible_for_comm: number
  eligible_amount_description: string
  achieved_monthly_anp: number
  basic_commission: number
  bonus_commission: number
  total_commission: number
}

interface DetailedCommissionReport {
  success: boolean
  report_id: string
  agent_name: string
  agent_type: string
  month_period: string
  invoices_count: number
  total_basic_commission: number
  total_bonus_commission: number
  final_total_commission: number
  invoices: CommissionInvoice[]
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

export function GenerateMonthlyCommReportView() {
  const [selectedMonth, setSelectedMonth] = useState<string>('')
  const [reportData, setReportData] = useState<MonthlyCommReport | null>(null)
  const [loading, setLoading] = useState(false)

  // Detailed report modal state
  const [showDetailedReport, setShowDetailedReport] = useState(false)
  const [detailedReportData, setDetailedReportData] = useState<DetailedCommissionReport | null>(null)

  // ANP Modal State (copied from AgentCommissionReportView)
  const [showANPModal, setShowANPModal] = useState(false)
  const [anpModalLoading, setAnpModalLoading] = useState(false)
  const [anpRelatedInvoices, setAnpRelatedInvoices] = useState<ANPRelatedInvoice[]>([])
  const [selectedInvoice, setSelectedInvoice] = useState<CommissionInvoice | null>(null)
  const [invoiceDetails, setInvoiceDetails] = useState<InvoiceDetails | null>(null)
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)
  const [isLoadingInvoice, setIsLoadingInvoice] = useState(false)

  // Eligible Amount Modal state
  const [showEligibleModal, setShowEligibleModal] = useState(false)
  const [selectedEligibleInvoice, setSelectedEligibleInvoice] = useState<CommissionInvoice | null>(null)
  const [isLoadingEligible, setIsLoadingEligible] = useState(false)

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

  // Set current month as default
  useEffect(() => {
    if (monthOptions.length > 0) {
      setSelectedMonth(monthOptions[0].value)
    }
  }, [])

  const generateReport = async () => {
    if (!selectedMonth) {
      alert('Please select a month')
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/commission/monthly-report?month=${selectedMonth}`)

      if (!response.ok) {
        throw new Error('Failed to generate monthly commission report')
      }

      const data = await response.json()
      setReportData(data)
    } catch (error) {
      console.error('Error generating monthly commission report:', error)
      alert('Error generating monthly commission report')
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

  const [generatingReports, setGeneratingReports] = useState<Set<string>>(new Set())

  const handleViewAgent = async (agent: AgentCommissionSummary) => {
    if (!selectedMonth) {
      alert('Please select a month first')
      return
    }


    const agentId = agent.agent_bubble_id
    setGeneratingReports(prev => new Set(prev).add(agentId))

    try {
      const response = await fetch('/api/commission/generate-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          agent_id: agentId,
          month_period: selectedMonth
        })
      })

      const data = await response.json()

      if (response.ok) {
        // Store the detailed report data and show modal
        setDetailedReportData(data)
        setShowDetailedReport(true)

        const action = data.action === 'updated' ? 'Updated' : 'Created'
        console.log(`${action} commission report for ${data.agent_name}`, data)
      } else {
        alert(`Failed to generate commission report: ${data.message}`)
      }
    } catch (error) {
      console.error('Error generating commission report:', error)
      alert('Failed to generate commission report. Please try again.')
    } finally {
      setGeneratingReports(prev => {
        const newSet = new Set(prev)
        newSet.delete(agentId)
        return newSet
      })
    }
  }

  // Helper functions copied from AgentCommissionReportView
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
      setInvoiceDetails(data)
    } catch (error) {
      console.error('Error fetching invoice details:', error)
      alert('Failed to load invoice details. Please try again.')
      setShowInvoiceModal(false)
    } finally {
      setIsLoadingInvoice(false)
    }
  }

  const handleViewEligibleAmount = async (invoice: CommissionInvoice) => {
    setIsLoadingEligible(true)
    setShowEligibleModal(true)
    setSelectedEligibleInvoice(invoice)

    try {
      console.log('Fetching full invoice details for eligible amount:', invoice.bubble_id)

      const response = await fetch(`/api/invoice/by-bubble-id/${invoice.bubble_id}`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log('Invoice by bubble_id response:', data)

      if (data.success && data.invoice) {
        const fullInvoiceData = data.invoice
        console.log('Found invoice eligible_amount_description:', fullInvoiceData.eligible_amount_description)

        setSelectedEligibleInvoice({
          ...invoice,
          eligible_amount_description: fullInvoiceData.eligible_amount_description || 'No detailed breakdown available for this invoice.'
        })
      } else {
        setSelectedEligibleInvoice({
          ...invoice,
          eligible_amount_description: 'Invoice details not found in database.'
        })
      }
    } catch (error) {
      console.error('Error fetching invoice details:', error)
      setSelectedEligibleInvoice({
        ...invoice,
        eligible_amount_description: 'Error loading invoice details. Please try again.'
      })
    } finally {
      setIsLoadingEligible(false)
    }
  }

  const getTotalAmount = () => {
    return anpRelatedInvoices.reduce((sum, invoice) => sum + parseFloat(invoice.amount || '0'), 0)
  }

  const checkANPCalculation = () => {
    if (anpRelatedInvoices.length === 0) return false

    const totalAmount = getTotalAmount()
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
        <h2 className="text-2xl font-bold mb-2">Generate Monthly Commission Report</h2>
        <p className="text-muted-foreground">
          Generate commission reports grouped by agent for a selected month
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Report Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                onClick={generateReport}
                disabled={loading || !selectedMonth}
                className="w-full"
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Generating Report...
                  </>
                ) : (
                  'Generate Report'
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Results */}
      {reportData && (
        <Card>
          <CardHeader>
            <CardTitle>
              Monthly Commission Report - {new Date(reportData.selected_month + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
            </CardTitle>
            <CardDescription>
              Commission summary by agent for invoices with full payment in the selected month
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-blue-600 mb-1">Total Agents</h4>
                <p className="text-2xl font-bold text-blue-700">{reportData.agents.length}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-green-600 mb-1">Total Invoices</h4>
                <p className="text-2xl font-bold text-green-700">{reportData.total_invoices}</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-purple-600 mb-1">Total Eligible Amount</h4>
                <p className="text-2xl font-bold text-purple-700">{formatCurrency(reportData.total_eligible_amount)}</p>
              </div>
            </div>

            {/* Agents Table */}
            {reportData.agents.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Agent Name</TableHead>
                      <TableHead>Agent Type</TableHead>
                      <TableHead className="text-right">Invoice Count</TableHead>
                      <TableHead className="text-right">Total Eligible for Comm Amount</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.agents.map((agent) => (
                      <TableRow key={agent.agent_bubble_id}>
                        {/* Agent Name */}
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-blue-500" />
                            {agent.agent_name}
                          </div>
                        </TableCell>

                        {/* Agent Type */}
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            agent.agent_type === 'internal'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-orange-100 text-orange-800'
                          }`}>
                            {agent.agent_type}
                          </span>
                        </TableCell>

                        {/* Invoice Count */}
                        <TableCell className="text-right font-medium">
                          {agent.invoice_count}
                        </TableCell>

                        {/* Total Eligible Amount */}
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1 font-medium">
                            <DollarSign className="h-4 w-4 text-green-500" />
                            {formatCurrency(agent.total_eligible_amount)}
                          </div>
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-center">
                          <Button
                            size="sm"
                            variant={agent.agent_type === 'unknown' ? 'outline' : 'default'}
                            className={`flex items-center gap-1 text-xs ${
                              agent.agent_type === 'unknown'
                                ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                                : 'bg-green-600 hover:bg-green-700'
                            }`}
                            onClick={() => handleViewAgent(agent)}
                            disabled={generatingReports.has(agent.agent_bubble_id) || agent.agent_type === 'unknown'}
                          >
                            {agent.agent_type === 'unknown' ? (
                              <>
                                <X className="h-3 w-3" />
                                AGENT TYPE UNKNOWN
                              </>
                            ) : generatingReports.has(agent.agent_bubble_id) ? (
                              <>
                                <RefreshCw className="h-3 w-3 animate-spin" />
                                GENERATING
                              </>
                            ) : (
                              <>
                                <Eye className="h-3 w-3" />
                                GENERATE REPORT
                              </>
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No commission data found for the selected month.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Detailed Commission Report Modal */}
      <Dialog open={showDetailedReport} onOpenChange={setShowDetailedReport}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
          <DialogHeader className="border-b border-gray-200 dark:border-gray-700 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-xl text-gray-900 dark:text-white">Commission Report Details</DialogTitle>
                <DialogDescription className="text-gray-600 dark:text-gray-300">
                  {detailedReportData ? `${detailedReportData.agent_name} - ${new Date(detailedReportData.month_period + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}` : 'Commission Report'}
                </DialogDescription>
              </div>
              {detailedReportData && (
                <div className="text-right">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Agent Type</span>
                  <div className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${
                    detailedReportData.agent_type === 'internal'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : detailedReportData.agent_type === 'outsource'
                      ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                  }`}>
                    {detailedReportData.agent_type.toUpperCase()}
                  </div>
                </div>
              )}
            </div>
          </DialogHeader>

          {detailedReportData && (
            <div className="space-y-6 p-6 bg-gray-50 dark:bg-gray-800">
              {/* Summary Section */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                  <h4 className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-1">Total Basic Commission</h4>
                  <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{formatCurrency(detailedReportData.total_basic_commission)}</p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                  <h4 className="text-sm font-medium text-green-600 dark:text-green-400 mb-1">Total Bonus Commission</h4>
                  <p className="text-2xl font-bold text-green-700 dark:text-green-300">{formatCurrency(detailedReportData.total_bonus_commission)}</p>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
                  <h4 className="text-sm font-medium text-purple-600 dark:text-purple-400 mb-1">Final Total Commission</h4>
                  <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">{formatCurrency(detailedReportData.final_total_commission)}</p>
                </div>
              </div>

              {/* Agent Info */}
              <div className="bg-white dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600 mb-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-600 dark:text-gray-300">Invoices Count:</span>
                    <span className="ml-2 text-gray-900 dark:text-white">{detailedReportData.invoices_count}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600 dark:text-gray-300">Report ID:</span>
                    <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">{detailedReportData.report_id}</span>
                  </div>
                </div>
              </div>

              {/* Invoice Details Table */}
              {detailedReportData.invoices.length > 0 ? (
                <div className="overflow-x-auto bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-gray-200 dark:border-gray-600">
                        <TableHead className="w-[180px]">Customer Name</TableHead>
                        <TableHead>Payment Date</TableHead>
                        <TableHead className="text-right">Eligible Amount</TableHead>
                        <TableHead className="text-right">Invoice Amount</TableHead>
                        <TableHead className="text-right">Monthly ANP</TableHead>
                        <TableHead className="text-right">{detailedReportData.agent_type === 'internal' ? 'Basic Commission (3%)' : 'Basic Commission'}</TableHead>
                        <TableHead className="text-right">Bonus Commission</TableHead>
                        <TableHead className="text-right">Total Commission</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detailedReportData.invoices.map((invoice) => (
                        <TableRow key={invoice.bubble_id}>
                          <TableCell className="font-medium">{invoice.customer_name}</TableCell>
                          <TableCell>{formatDate(invoice.full_payment_date)}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewEligibleAmount(invoice)}
                              className="text-orange-600 hover:text-orange-800 hover:bg-orange-50 dark:hover:bg-orange-950 font-medium"
                            >
                              <DollarSign className="h-3 w-3 mr-1" />
                              {formatCurrency(invoice.amount_eligible_for_comm)}
                            </Button>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewInvoice(invoice)}
                              className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950 font-medium"
                            >
                              <DollarSign className="h-3 w-3 mr-1" />
                              {formatCurrency(invoice.amount)}
                            </Button>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs px-2 py-1 text-green-600 hover:text-green-800 hover:bg-green-50 dark:hover:bg-green-950 border-green-200 dark:border-green-800"
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
                  No invoices found for this commission report.
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ANP Modal */}
      {showANPModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">ANP Calculation Details</h2>
                <p className="text-gray-600 dark:text-gray-300 mt-1">
                  Invoice {selectedInvoice.invoice_id} - Customer: {selectedInvoice.customer_name}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowANPModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

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
                            <TableCell className="font-medium">{invoice.invoice_id}</TableCell>
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
                                {formatCurrency(invoice.first_payment_amount || 0)}
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <DollarSign className="h-4 w-4 text-green-500" />
                                {formatCurrency(parseFloat(invoice.amount) || 0)}
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <DollarSign className="h-4 w-4 text-purple-500" />
                                {formatCurrency(parseFloat(invoice.achieved_monthly_anp || '0') || 0)}
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
                            formattedAmount = amount.toFixed(2);
                          }

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

      {/* Eligible Amount Details Modal */}
      <Dialog open={showEligibleModal} onOpenChange={setShowEligibleModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl">Eligible Amount Details</DialogTitle>
            <DialogDescription>
              {selectedEligibleInvoice ? `Invoice #${selectedEligibleInvoice.invoice_id} - ${selectedEligibleInvoice.customer_name}` : 'Eligible amount breakdown'}
            </DialogDescription>
          </DialogHeader>

          {isLoadingEligible ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-6 w-6 animate-spin mr-2" />
              <span>Loading eligible amount details...</span>
            </div>
          ) : selectedEligibleInvoice && (
            <div className="space-y-4 p-4">
              <div className="border border-gray-700 rounded-lg p-4 bg-gray-900">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-white">Amount Summary</h3>
                  <span className="text-orange-400 font-bold text-lg">
                    {formatCurrency(selectedEligibleInvoice.amount_eligible_for_comm)}
                  </span>
                </div>

                <div className="space-y-2 text-gray-300">
                  <div className="flex justify-between">
                    <span>Total Invoice Amount:</span>
                    <span className="text-white">{formatCurrency(selectedEligibleInvoice.amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Eligible for Commission:</span>
                    <span className="text-orange-400 font-medium">{formatCurrency(selectedEligibleInvoice.amount_eligible_for_comm)}</span>
                  </div>
                </div>
              </div>

              <div className="border border-gray-700 rounded-lg p-4 bg-gray-900">
                <h3 className="text-lg font-semibold text-white mb-3">Breakdown Details</h3>
                <div className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                  {selectedEligibleInvoice.eligible_amount_description || 'No detailed breakdown available for this invoice.'}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}