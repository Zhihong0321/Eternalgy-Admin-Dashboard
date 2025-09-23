import { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, User, MapPin, Phone, Hash } from 'lucide-react'

interface CustomerResult {
  id: number
  registration_id: string
  customer_name: string
  installation_address: string
  city: string
  state: string
  customer_contact: string
  similarity: number
}

interface SearchResponse {
  customers: CustomerResult[]
  total: number
  query: string
}

export function SearchCustomerView() {
  const [searchQuery, setSearchQuery] = useState('')
  const [results, setResults] = useState<CustomerResult[]>([])
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const searchCustomers = useCallback(async (query: string) => {
    if (!query.trim() || query.trim().length < 2) {
      setResults([])
      setHasSearched(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/customers/search?query=${encodeURIComponent(query.trim())}`)

      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`)
      }

      const data: SearchResponse = await response.json()
      setResults(data.customers)
      setHasSearched(true)
    } catch (err) {
      console.error('Search error:', err)
      setError(err instanceof Error ? err.message : 'Search failed')
      setResults([])
      setHasSearched(true)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleSearch = () => {
    searchCustomers(searchQuery)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

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
          <div className="flex gap-2">
            <Input
              placeholder="Enter installation address to search..."
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
            Search uses fuzzy matching with 80%+ similarity. Case insensitive, ignores punctuation.
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
              <span>Search Results</span>
              <span className="text-sm font-normal text-muted-foreground">
                {results.length} customer{results.length !== 1 ? 's' : ''} found
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {results.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No customers found matching your search.</p>
                <p className="text-sm">Try a different search term or check spelling.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {results.map((customer) => (
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

                          <div className="flex items-center gap-2">
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
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
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