import { useState } from 'react'
import { MobileHome } from './MobileHome'
import { UserList } from './UserList'

export type MobileView = 'home' | 'users'

export function MobileERP() {
  const [currentView, setCurrentView] = useState<MobileView>('home')

  const renderView = () => {
    switch (currentView) {
      case 'home':
        return <MobileHome onNavigate={setCurrentView} />
      case 'users':
        return <UserList onBack={() => setCurrentView('home')} />
      default:
        return <MobileHome onNavigate={setCurrentView} />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {renderView()}
    </div>
  )
}