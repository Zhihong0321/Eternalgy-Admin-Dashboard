import { useState, useEffect } from 'react'
import { Card } from '../ui/card'
import { Button } from '../ui/button'
import { ArrowLeft, User, Users } from 'lucide-react'

interface User {
  bubble_id: string
  name: string
  email?: string
  contact?: string
  access_level?: string
}

interface TeamData {
  jb: User[]
  kluang: User[]
  seremban: User[]
}

interface UserListProps {
  onBack: () => void
}

export function UserList({ onBack }: UserListProps) {
  const [teams, setTeams] = useState<TeamData>({ jb: [], kluang: [], seremban: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalUsers, setTotalUsers] = useState(0)

  useEffect(() => {
    fetchTeamUsers()
  }, [])

  const fetchTeamUsers = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/users/teams')
      if (!response.ok) throw new Error('Failed to fetch team users')
      
      const data = await response.json()
      setTeams(data.teams)
      setTotalUsers(data.total_users)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load team users')
    } finally {
      setLoading(false)
    }
  }

  const handleUserClick = (user: User) => {
    // TODO: Navigate to user activity details when specified
    alert(`User activity details for ${user.name} coming soon!`)
  }

  if (loading) {
    return (
      <div className="p-4 max-w-md mx-auto">
        <div className="flex items-center mb-6">
          <Button variant="outline" onClick={onBack} className="mr-3">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-semibold">Daily Activity Report</h1>
        </div>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-2">Loading team users...</p>
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
          <h1 className="text-xl font-semibold">Daily Activity Report</h1>
        </div>
        <Card className="p-6 text-center">
          <p className="text-red-600 mb-4">Error: {error}</p>
          <Button onClick={fetchTeamUsers}>Retry</Button>
        </Card>
      </div>
    )
  }

  const renderTeamSection = (title: string, users: User[], bgColor: string, textColor: string) => (
    <div className="mb-6">
      <div className={`${bgColor} ${textColor} p-3 rounded-t-lg`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <h2 className="text-lg font-semibold">{title}</h2>
          </div>
          <span className="text-sm opacity-90">
            {users.length} {users.length === 1 ? 'user' : 'users'}
          </span>
        </div>
      </div>
      
      {users.length > 0 ? (
        <div className="bg-white border border-gray-200 rounded-b-lg">
          {users.map((user, index) => (
            <div 
              key={user.bubble_id}
              className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                index < users.length - 1 ? 'border-b border-gray-100' : ''
              }`}
              onClick={() => handleUserClick(user)}
            >
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <User className="h-8 w-8 text-gray-400" />
                </div>
                <div className="flex-grow min-w-0">
                  <h3 className="text-sm font-medium text-gray-900 truncate">
                    {user.name}
                  </h3>
                  {user.email && (
                    <p className="text-xs text-gray-500 truncate">
                      {user.email}
                    </p>
                  )}
                  {user.contact && (
                    <p className="text-xs text-gray-500 truncate">
                      {user.contact}
                    </p>
                  )}
                </div>
                <div className="flex-shrink-0">
                  <div className="h-6 w-6 bg-green-100 rounded-full flex items-center justify-center">
                    <div className="h-2 w-2 bg-green-600 rounded-full"></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-b-lg p-6 text-center">
          <User className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No users in this team</p>
        </div>
      )}
    </div>
  )

  return (
    <div className="p-4 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center mb-6">
        <Button variant="outline" onClick={onBack} className="mr-3">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl font-semibold">Daily Activity Report</h1>
      </div>

      {/* Total Count */}
      <div className="mb-6 text-center">
        <p className="text-gray-600">
          Total: {totalUsers} {totalUsers === 1 ? 'user' : 'users'} across all teams
        </p>
      </div>

      {/* Team Sections */}
      {renderTeamSection(
        'Team JB', 
        teams.jb, 
        'bg-blue-500', 
        'text-white'
      )}
      
      {renderTeamSection(
        'Team Kluang', 
        teams.kluang, 
        'bg-green-500', 
        'text-white'
      )}
      
      {renderTeamSection(
        'Team Seremban', 
        teams.seremban, 
        'bg-purple-500', 
        'text-white'
      )}

      {/* Empty State for all teams */}
      {totalUsers === 0 && (
        <Card className="p-8 text-center">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Team Users Found</h3>
          <p className="text-gray-600">
            No users found in any of the teams (JB, Kluang, Seremban).
          </p>
        </Card>
      )}
    </div>
  )
}