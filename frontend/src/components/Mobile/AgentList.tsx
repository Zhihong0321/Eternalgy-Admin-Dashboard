import { useState, useEffect } from 'react'
import { Card } from '../ui/card'
import { Button } from '../ui/button'
import { ArrowLeft, User } from 'lucide-react'

interface Agent {
  bubble_id: string
  name: string
  contact?: string
  agent_type: string
}

interface AgentListProps {
  onBack: () => void
}

export function AgentList({ onBack }: AgentListProps) {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchInternalAgents()
  }, [])

  const fetchInternalAgents = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/agents/list')
      if (!response.ok) throw new Error('Failed to fetch agents')
      
      const data = await response.json()
      
      // Filter for internal agents only
      const internalAgents = data.agents.filter((agent: Agent) => 
        agent.agent_type === 'internal'
      )
      
      setAgents(internalAgents)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load agents')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-4 max-w-md mx-auto">
        <div className="flex items-center mb-6">
          <Button variant="outline" onClick={onBack} className="mr-3">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-semibold">Internal Agents</h1>
        </div>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-2">Loading agents...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 max-w-md mx-auto">
        <div className="flex items-center mb-6">
          <Button variant="outline" onClick={onBack} className="mr-3">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-semibold">Internal Agents</h1>
        </div>
        <Card className="p-6 text-center">
          <p className="text-red-600 mb-4">Error: {error}</p>
          <Button onClick={fetchInternalAgents}>Retry</Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-4 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center mb-6">
        <Button variant="outline" onClick={onBack} className="mr-3">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl font-semibold">Internal Sales Agents</h1>
      </div>

      {/* Agent Count */}
      <div className="mb-4">
        <p className="text-gray-600">
          {agents.length} {agents.length === 1 ? 'agent' : 'agents'} found
        </p>
      </div>

      {/* Agent List */}
      <div className="space-y-3">
        {agents.map((agent) => (
          <Card key={agent.bubble_id} className="p-4 hover:shadow-md transition-shadow">
            <div 
              className="flex items-center space-x-3 cursor-pointer"
              onClick={() => {
                // TODO: Navigate to agent details when user tells us what to show
                alert(`Agent details for ${agent.name} coming soon!`)
              }}
            >
              <div className="flex-shrink-0">
                <User className="h-8 w-8 text-gray-400" />
              </div>
              <div className="flex-grow min-w-0">
                <h3 className="text-sm font-medium text-gray-900 truncate">
                  {agent.name}
                </h3>
                {agent.contact && (
                  <p className="text-sm text-gray-500 truncate">
                    {agent.contact}
                  </p>
                )}
                <p className="text-xs text-blue-600 capitalize">
                  {agent.agent_type}
                </p>
              </div>
              <div className="flex-shrink-0">
                <div className="h-6 w-6 bg-green-100 rounded-full flex items-center justify-center">
                  <div className="h-2 w-2 bg-green-600 rounded-full"></div>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {agents.length === 0 && (
        <Card className="p-8 text-center">
          <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Internal Agents</h3>
          <p className="text-gray-600">
            No internal sales agents found in the system.
          </p>
        </Card>
      )}
    </div>
  )
}