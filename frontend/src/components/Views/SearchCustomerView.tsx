import { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, User, MapPin, Phone, Hash, FileText, DollarSign } from 'lucide-react'

interface CustomerResult {
  id: number
  registration_id: string
  customer_name: string
  installation_address: string
  city: string
  state: string
  customer_contact: string
  similarity: number
  source_table: string
}

interface SearchResponse {
  customers: CustomerResult[]
  total: number
  query: string
}

interface InvoiceResult {
  id: number
  invoice_id: string
  customer_name: string
  customer_contact: string
  package_description: string
  amount: number
  created_date: string
  similarity: number
}

interface InvoiceSearchResponse {
  invoices: InvoiceResult[]
  total: number
  query: string
}

export function SearchCustomerView() {
  const [activeTab, setActiveTab] = useState<'address' | 'name'>('address')
  const [searchQuery, setSearchQuery] = useState('')
  const [addressResults, setAddressResults] = useState<CustomerResult[]>([])
  const [invoiceResults, setInvoiceResults] = useState<InvoiceResult[]>([])
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const searchByAddress = useCallback(async (query: string) => {
    try {
      const response = await fetch(`/api/customers/search?query=${encodeURIComponent(query.trim())}`)
      if (!response.ok) throw new Error(`Search failed: ${response.status}`)
      const data: SearchResponse = await response.json()
      setAddressResults(data.customers)
    } catch (err) {
      console.error('Address search error:', err)
      throw err
    }
  }, [])

  const searchByName = useCallback(async (query: string) => {
    try {
      const response = await fetch(`/api/customers/search-by-name?query=${encodeURIComponent(query.trim())}`)
      if (!response.ok) throw new Error(`Search failed: ${response.status}`)
      const data: InvoiceSearchResponse = await response.json()
      setInvoiceResults(data.invoices)
    } catch (err) {
      console.error('Name search error:', err)
      throw err
    }
  }, [])

  const performSearch = useCallback(async (query: string) => {
    if (!query.trim() || query.trim().length < 2) {
      setAddressResults([])
      setInvoiceResults([])
      setHasSearched(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      if (activeTab === 'address') {
        await searchByAddress(query)
      } else {
        await searchByName(query)
      }
      setHasSearched(true)
    } catch (err) {
      console.error('Search error:', err)
      setError(err instanceof Error ? err.message : 'Search failed')
      setHasSearched(true)
    } finally {
      setLoading(false)
    }
  }, [activeTab, searchByAddress, searchByName])

  const handleSearch = () => {
    performSearch(searchQuery)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const handleTabChange = (tab: 'address' | 'name') => {
    setActiveTab(tab)
    setSearchQuery('')
    setAddressResults([])
    setInvoiceResults([])
    setHasSearched(false)
    setError(null)
  }

  const currentResults = activeTab === 'address' ? addressResults : invoiceResults

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search Customer
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Tab Navigation */}
          <div className="flex gap-2 mb-4">
            <Button
              variant={activeTab === 'address' ? 'default' : 'outline'}
              onClick={() => handleTabChange('address')}
              className="flex items-center gap-2"
            >
              <MapPin className="h-4 w-4" />
              Search by Address
            </Button>
            <Button
              variant={activeTab === 'name' ? 'default' : 'outline'}
              onClick={() => handleTabChange('name')}
              className="flex items-center gap-2"
            >
              <User className="h-4 w-4" />
              Search by Name
            </Button>
          </div>

          {/* Search Input */}
          <div className="flex gap-2">
            <Input
              placeholder={activeTab === 'address'
                ? "Enter installation address to search..."
                : "Enter customer name to search invoices..."
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1"
              disabled={loading}
            />
            <Button
              onClick={handleSearch}
              disabled={loading || !searchQuery.trim()}
            >
              {loading ? 'Searching...' : 'Search'}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            {activeTab === 'address'
              ? "Search uses fuzzy matching with 80%+ similarity. Searches both SEDA registration and customer profile addresses."
              : "Search customer names in invoices with fuzzy matching. Shows invoice details and package descriptions."
            }
          </p>
        </CardContent>
      </Card>

      {/* Error Message */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600">Error: {error}</p>
          </CardContent>
        </Card>
      )}

      {/* Search Results */}
      {hasSearched && !loading && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{activeTab === 'address' ? 'Address Search Results' : 'Invoice Search Results'}</span>
              <span className="text-sm font-normal text-muted-foreground">
                {currentResults.length} {activeTab === 'address' ? 'customer' : 'invoice'}{currentResults.length !== 1 ? 's' : ''} found
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {currentResults.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No {activeTab === 'address' ? 'customers' : 'invoices'} found matching your search.</p>
                <p className="text-sm">Try a different search term or check spelling.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {activeTab === 'address' ? (
                  // Address Search Results
                  addressResults.map((customer) => (
                    <Card key={customer.id} className="border-l-4 border-l-blue-500">
                      <CardContent className="pt-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Customer Info */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-blue-600" />
                              <span className="font-medium">{customer.customer_name}</span>
                            </div>

                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Hash className="h-4 w-4" />
                              <span>ID: {customer.registration_id}</span>
                            </div>

                            {customer.customer_contact && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Phone className="h-4 w-4" />
                                <span>{customer.customer_contact}</span>
                              </div>
                            )}
                          </div>

                          {/* Address Info */}
                          <div className="space-y-2">
                            <div className="flex items-start gap-2">
                              <MapPin className="h-4 w-4 text-green-600 mt-0.5" />
                              <div>
                                <p className="text-sm font-medium">{customer.installation_address}</p>
                                <p className="text-xs text-muted-foreground">
                                  {customer.city}{customer.state && `, ${customer.state}`}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-4">
                              <div className="text-xs">
                                <span className="text-muted-foreground">Match: </span>
                                <span className={`font-medium ${
                                  customer.similarity >= 95 ? 'text-green-600' :
                                  customer.similarity >= 90 ? 'text-blue-600' :
                                  'text-orange-600'
                                }`}>
                                  {customer.similarity}%
                                </span>
                              </div>

                              <div className="text-xs">
                                <span className="text-muted-foreground">Source: </span>
                                <span className={`font-medium px-2 py-1 rounded-full text-white text-xs ${
                                  customer.source_table === 'seda_registration' ? 'bg-blue-500' : 'bg-purple-500'
                                }`}>
                                  {customer.source_table === 'seda_registration' ? 'SEDA Reg' : 'Customer'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  // Invoice Search Results
                  invoiceResults.map((invoice) => (
                    <Card key={invoice.id} className="border-l-4 border-l-green-500">
                      <CardContent className="pt-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Customer Info */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-green-600" />
                              <span className="font-medium">{invoice.customer_name}</span>
                            </div>

                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <FileText className="h-4 w-4" />
                              <span>Invoice: {invoice.invoice_id}</span>
                            </div>

                            {invoice.customer_contact && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Phone className="h-4 w-4" />
                                <span>{invoice.customer_contact}</span>
                              </div>
                            )}
                          </div>

                          {/* Invoice Info */}
                          <div className="space-y-2">
                            <div className="flex items-start gap-2">
                              <FileText className="h-4 w-4 text-blue-600 mt-0.5" />
                              <div>
                                <p className="text-sm font-medium">{invoice.package_description}</p>
                                <p className="text-xs text-muted-foreground">
                                  Package Description
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-4">
                              <div className="text-xs">
                                <span className="text-muted-foreground">Amount: </span>
                                <span className="font-medium text-green-600">
                                  ${invoice.amount}
                                </span>
                              </div>

                              <div className="text-xs">
                                <span className="text-muted-foreground">Match: </span>
                                <span className={`font-medium ${
                                  invoice.similarity >= 95 ? 'text-green-600' :
                                  invoice.similarity >= 90 ? 'text-blue-600' :
                                  'text-orange-600'
                                }`}>
                                  {invoice.similarity}%
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {loading && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-muted-foreground">Searching customers...</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}