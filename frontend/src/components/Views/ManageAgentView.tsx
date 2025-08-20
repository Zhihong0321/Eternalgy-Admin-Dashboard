import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RefreshCw, Users, Phone, CheckCircle, X, Ban } from 'lucide-react'

interface Agent {
  bubble_id: string
  name: string
  contact: string | null
  agent_type: string | null
}

export function ManageAgentView() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingAgent, setUpdatingAgent] = useState<string | null>(null)

  const fetchAgents = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/agents/list')
      const data = await response.json()
      
      if (response.ok) {
        // Filter out blocked agents from the main list
        const activeAgents = (data.agents || []).filter((agent: Agent) => agent.agent_type !== 'block')
        setAgents(activeAgents)
      } else {
        console.error('Failed to fetch agents:', data.message)
      }
    } catch (error) {
      console.error('Error fetching agents:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateAgentType = async (agentId: string, agentType: 'internal' | 'outsource' | 'block') => {
    try {
      setUpdatingAgent(agentId)
      const response = await fetch(`/api/agents/${agentId}/type`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ agent_type: agentType })
      })
      
      if (response.ok) {
        // Update local state
        setAgents(prev => prev.map(agent => 
          agent.bubble_id === agentId 
            ? { ...agent, agent_type: agentType }
            : agent
        ))
      } else {
        const data = await response.json()
        console.error('Failed to update agent type:', data.message)
      }
    } catch (error) {
      console.error('Error updating agent type:', error)
    } finally {
      setUpdatingAgent(null)
    }
  }

  useEffect(() => {
    fetchAgents()
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Manage Agents</h1>
          <p className="text-muted-foreground">
            Set agent types: Internal or Outsource ({agents.length} total)
          </p>
        </div>
        <Button 
          onClick={fetchAgents}
          disabled={loading}
          variant="outline"
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Agents Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-500" />
            Agent List
          </CardTitle>
          <CardDescription>
            Click Internal or Outsource to set agent type
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin" />
              <span className="ml-3">Loading agents...</span>
            </div>
          ) : agents.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No agents found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2">Agent Name</th>
                    <th className="text-left py-3 px-2">Contact</th>
                    <th className="text-left py-3 px-2">Current Type</th>
                    <th className="text-left py-3 px-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {agents.map((agent) => (
                    <tr key={agent.bubble_id} className="border-b hover:bg-muted/50">
                      {/* Agent Name */}
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-blue-500" />
                          <span className="font-medium">
                            {agent.name || 'N/A'}
                          </span>
                        </div>
                      </td>
                      
                      {/* Contact */}
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-green-500" />
                          {agent.contact || 'N/A'}
                        </div>
                      </td>
                      
                      {/* Current Type */}
                      <td className="py-3 px-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          agent.agent_type === 'internal' 
                            ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                            : agent.agent_type === 'outsource'
                            ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20'
                            : agent.agent_type === 'block'
                            ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                            : 'bg-gray-500/10 text-gray-500 border border-gray-500/20'
                        }`}>
                          {agent.agent_type || 'Unset'}
                        </span>
                      </td>
                      
                      {/* Actions */}
                      <td className="py-3 px-2">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant={agent.agent_type === 'internal' ? 'default' : 'outline'}
                            className={`flex items-center gap-1 text-xs ${
                              agent.agent_type === 'internal' 
                                ? 'bg-blue-500 hover:bg-blue-600 text-white' 
                                : 'hover:bg-blue-50'
                            }`}
                            onClick={() => updateAgentType(agent.bubble_id, 'internal')}
                            disabled={updatingAgent === agent.bubble_id}
                          >
                            {agent.agent_type === 'internal' && <CheckCircle className="h-3 w-3" />}
                            Internal
                          </Button>
                          
                          <Button
                            size="sm"
                            variant={agent.agent_type === 'outsource' ? 'default' : 'outline'}
                            className={`flex items-center gap-1 text-xs ${
                              agent.agent_type === 'outsource' 
                                ? 'bg-orange-500 hover:bg-orange-600 text-white' 
                                : 'hover:bg-orange-50'
                            }`}
                            onClick={() => updateAgentType(agent.bubble_id, 'outsource')}
                            disabled={updatingAgent === agent.bubble_id}
                          >
                            {agent.agent_type === 'outsource' && <CheckCircle className="h-3 w-3" />}
                            Outsource
                          </Button>
                          
                          <Button
                            size="sm"
                            variant={agent.agent_type === 'block' ? 'default' : 'outline'}
                            className={`flex items-center gap-1 text-xs ${
                              agent.agent_type === 'block' 
                                ? 'bg-red-500 hover:bg-red-600 text-white' 
                                : 'hover:bg-red-50'
                            }`}
                            onClick={() => updateAgentType(agent.bubble_id, 'block')}
                            disabled={updatingAgent === agent.bubble_id}
                          >
                            {agent.agent_type === 'block' && <Ban className="h-3 w-3" />}
                            Block
                          </Button>
                        </div>
                        
                        {updatingAgent === agent.bubble_id && (
                          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                            <RefreshCw className="h-3 w-3 animate-spin" />
                            Updating...
                          </div>
                        )}
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