import { useState } from 'react'
import { MobileHome } from './MobileHome'
import { AgentList } from './AgentList'

export type MobileView = 'home' | 'agents'

export function MobileERP() {
  const [currentView, setCurrentView] = useState<MobileView>('home')

  const renderView = () => {
    switch (currentView) {
      case 'home':
        return <MobileHome onNavigate={setCurrentView} />
      case 'agents':
        return <AgentList onBack={() => setCurrentView('home')} />
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