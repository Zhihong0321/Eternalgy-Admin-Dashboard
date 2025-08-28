import { useState } from 'react'
import { MobileHome } from './MobileHome'
import { UserList } from './UserList'
import { UserActivityReport } from './UserActivityReport'

export type MobileView = 'home' | 'users' | 'user-activity'

interface SelectedUser {
  userId: string
  userName: string
}

export function MobileERP() {
  const [currentView, setCurrentView] = useState<MobileView>('home')
  const [selectedUser, setSelectedUser] = useState<SelectedUser | null>(null)

  const handleUserSelect = (user: SelectedUser) => {
    setSelectedUser(user)
    setCurrentView('user-activity')
  }

  const handleBackToUsers = () => {
    setSelectedUser(null)
    setCurrentView('users')
  }

  const handleBackToHome = () => {
    setSelectedUser(null)
    setCurrentView('home')
  }

  const renderView = () => {
    switch (currentView) {
      case 'home':
        return <MobileHome onNavigate={setCurrentView} />
      case 'users':
        return <UserList onBack={handleBackToHome} onUserSelect={handleUserSelect} />
      case 'user-activity':
        return selectedUser ? (
          <UserActivityReport 
            userId={selectedUser.userId}
            userName={selectedUser.userName}
            onBack={handleBackToUsers}
          />
        ) : <MobileHome onNavigate={setCurrentView} />
      default:
        return <MobileHome onNavigate={setCurrentView} />
    }
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {renderView()}
    </div>
  )
}