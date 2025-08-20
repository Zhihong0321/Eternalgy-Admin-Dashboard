import { useState } from 'react'
import { Sidebar } from './Sidebar'
import { FinanceView } from '../Views/FinanceView'
import { ProjectView } from '../Views/ProjectView'
import { AdminView } from '../Views/AdminView'

type ActiveView = 'finance' | 'project' | 'admin'

export function Dashboard() {
  const [activeView, setActiveView] = useState<ActiveView>('finance')

  const renderView = () => {
    switch (activeView) {
      case 'finance':
        return <FinanceView />
      case 'project':
        return <ProjectView />
      case 'admin':
        return <AdminView />
      default:
        return <FinanceView />
    }
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <header className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold capitalize">{activeView} Dashboard</h1>
                <p className="text-muted-foreground">
                  Manage your {activeView} operations and analytics
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveView('finance')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeView === 'finance' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  }`}
                >
                  Finance
                </button>
                <button
                  onClick={() => setActiveView('project')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeView === 'project' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  }`}
                >
                  Project
                </button>
                <button
                  onClick={() => setActiveView('admin')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeView === 'admin' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  }`}
                >
                  Admin
                </button>
              </div>
            </div>
          </header>

          {/* Main Content */}
          {renderView()}
        </div>
      </main>
    </div>
  )
}