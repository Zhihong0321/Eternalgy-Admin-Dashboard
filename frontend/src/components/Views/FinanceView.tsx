import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DollarSign, FileText, TrendingUp, Download } from 'lucide-react'

// Dummy data
const invoiceData = [
  { id: 'INV-001', client: 'Acme Corp', amount: 25000, status: 'Paid', date: '2024-01-15' },
  { id: 'INV-002', client: 'TechStart Inc', amount: 18500, status: 'Pending', date: '2024-01-20' },
  { id: 'INV-003', client: 'Global Solutions', amount: 32000, status: 'Paid', date: '2024-01-22' },
  { id: 'INV-004', client: 'Innovation Labs', amount: 12800, status: 'Overdue', date: '2024-01-10' },
  { id: 'INV-005', client: 'Future Systems', amount: 45000, status: 'Paid', date: '2024-01-25' }
]

const commissionData = [
  { agent: 'John Smith', deals: 8, commission: 15600, period: 'Jan 2024' },
  { agent: 'Sarah Johnson', deals: 12, commission: 23400, period: 'Jan 2024' },
  { agent: 'Mike Chen', deals: 6, commission: 11800, period: 'Jan 2024' },
  { agent: 'Emily Davis', deals: 10, commission: 19200, period: 'Jan 2024' },
  { agent: 'Alex Wilson', deals: 7, commission: 13500, period: 'Jan 2024' }
]

const financialSummary = {
  totalRevenue: 133300,
  pendingPayments: 18500,
  totalCommissions: 83500,
  netProfit: 49800
}

export function FinanceView() {
  return (
    <div className="space-y-6">
      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${financialSummary.totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">+12% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${financialSummary.pendingPayments.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">2 invoices pending</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Commissions</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${financialSummary.totalCommissions.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">5 agents active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${financialSummary.netProfit.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">+8% from last month</p>
          </CardContent>
        </Card>
      </div>

      {/* Full Payment Invoices */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Full Payment Invoices</CardTitle>
              <CardDescription>Recent invoice transactions and payment status</CardDescription>
            </div>
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Invoice ID</th>
                  <th className="text-left py-2">Client</th>
                  <th className="text-left py-2">Amount</th>
                  <th className="text-left py-2">Status</th>
                  <th className="text-left py-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {invoiceData.map((invoice) => (
                  <tr key={invoice.id} className="border-b">
                    <td className="py-3 font-medium">{invoice.id}</td>
                    <td className="py-3">{invoice.client}</td>
                    <td className="py-3">${invoice.amount.toLocaleString()}</td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        invoice.status === 'Paid' ? 'bg-green-100 text-green-800' :
                        invoice.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {invoice.status}
                      </span>
                    </td>
                    <td className="py-3">{invoice.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Agent Commission Report */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Agent Commission Report</CardTitle>
              <CardDescription>Performance and commission breakdown by sales agent</CardDescription>
            </div>
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Agent Name</th>
                  <th className="text-left py-2">Deals Closed</th>
                  <th className="text-left py-2">Commission</th>
                  <th className="text-left py-2">Period</th>
                </tr>
              </thead>
              <tbody>
                {commissionData.map((agent) => (
                  <tr key={agent.agent} className="border-b">
                    <td className="py-3 font-medium">{agent.agent}</td>
                    <td className="py-3">{agent.deals}</td>
                    <td className="py-3 font-medium">${agent.commission.toLocaleString()}</td>
                    <td className="py-3">{agent.period}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}