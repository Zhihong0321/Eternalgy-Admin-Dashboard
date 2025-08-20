import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RefreshCw, CheckCircle, DollarSign, Calendar, User } from 'lucide-react'

interface Invoice {
  bubble_id: string
  invoice_id: number
  amount: string
  full_payment_date: string | null
  created_date: string
  customer_name: string | null
  linked_customer: string | null
  invoice_date: string | null
}

interface RescanResult {
  message: string
  updated_invoices: number
  total_checked: number
  errors: Array<{ invoice_id: string; error: string }>
}

export function FullPaymentInvoiceView() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [rescanLoading, setRescanLoading] = useState(false)
  const [totalCount, setTotalCount] = useState(0)
  const [lastRescanResult, setLastRescanResult] = useState<RescanResult | null>(null)

  const fetchFullyPaidInvoices = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/invoices/fully-paid?limit=100')
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

  const formatCurrency = (amount: string | null) => {
    if (!amount) return '$0.00'
    const num = parseFloat(amount)
    return isNaN(num) ? amount : `$${num.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
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
    fetchFullyPaidInvoices()
  }, [])

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

      {/* Rescan Result */}
      {lastRescanResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
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
                  <summary className="cursor-pointer font-medium text-red-600">
                    Errors ({lastRescanResult.errors.length})
                  </summary>
                  <div className="mt-2 space-y-1">
                    {lastRescanResult.errors.map((error, index) => (
                      <div key={index} className="text-sm text-red-600">
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
                    <th className="text-left py-3 px-2">Customer</th>
                    <th className="text-left py-3 px-2">Amount</th>
                    <th className="text-left py-3 px-2">Invoice Date</th>
                    <th className="text-left py-3 px-2">Full Payment Date</th>
                    <th className="text-left py-3 px-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice) => (
                    <tr key={invoice.bubble_id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-2">
                        <div className="font-medium">
                          {invoice.invoice_id || invoice.bubble_id}
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          {invoice.customer_name || invoice.linked_customer || 'N/A'}
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2 font-medium">
                          <DollarSign className="h-4 w-4 text-green-600" />
                          {formatCurrency(invoice.amount)}
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {formatDate(invoice.invoice_date)}
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-green-600" />
                          {formatDate(invoice.full_payment_date)}
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 flex items-center gap-1 w-fit">
                          <CheckCircle className="h-3 w-3" />
                          Fully Paid
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}