import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { RefreshCw, DollarSign, Calendar, User, Eye } from 'lucide-react'

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

export function GenerateMonthlyCommReportView() {
  const [selectedMonth, setSelectedMonth] = useState<string>('')
  const [reportData, setReportData] = useState<MonthlyCommReport | null>(null)
  const [loading, setLoading] = useState(false)

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

  const handleViewAgent = (agent: AgentCommissionSummary) => {
    // TODO: Implement view functionality later
    console.log('View agent details:', agent)
    alert(`View functionality for ${agent.agent_name} will be implemented later`)
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
                            variant="outline"
                            className="flex items-center gap-1 text-xs"
                            onClick={() => handleViewAgent(agent)}
                          >
                            <Eye className="h-3 w-3" />
                            VIEW
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
    </div>
  )
}