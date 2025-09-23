import { useState } from 'react'
import { Sidebar } from './Sidebar'
import { FinanceView } from '../Views/FinanceView'
import { ProjectView } from '../Views/ProjectView'
import { AdminView } from '../Views/AdminView'
import { FullPaymentInvoiceView } from '../Views/FullPaymentInvoiceView'
import { ANPCalculatorView } from '../Views/ANPCalculatorView'
import { ManageAgentView } from '../Views/ManageAgentView'
import { AgentCommissionReportView } from '../Views/AgentCommissionReportView'
import { CheckEligibleCommView } from '../Views/CheckEligibleCommView'
import { GenerateMonthlyCommReportView } from '../Views/GenerateMonthlyCommReportView'
import { SearchCustomerView } from '../Views/SearchCustomerView'

type ActiveView = 'finance' | 'project' | 'admin' | 'search-customer' | 'finance/invoices' | 'finance/anp-calculator' | 'finance/commissions' | 'finance/monthly-comm-report' | 'finance/eligible-comm' | 'hr/manage-agent'

export function Dashboard() {
  const [activeView, setActiveView] = useState<ActiveView>('finance')

  const handleNavigation = (path: string) => {
    switch (path) {
      case '/finance/invoices':
        setActiveView('finance/invoices')
        break
      case '/finance/anp-calculator':
        setActiveView('finance/anp-calculator')
        break
      case '/finance/commissions':
        setActiveView('finance/commissions')
        break
      case '/finance/monthly-comm-report':
        setActiveView('finance/monthly-comm-report')
        break
      case '/finance/eligible-comm':
        setActiveView('finance/eligible-comm')
        break
      case '/hr/manage-agent':
        setActiveView('hr/manage-agent')
        break
      case '/project':
        setActiveView('project')
        break
      case '/search-customer':
        setActiveView('search-customer')
        break
      case '/admin':
        setActiveView('admin')
        break
      default:
        setActiveView('finance')
    }
  }

  const renderView = () => {
    switch (activeView) {
      case 'finance':
        return <FinanceView />
      case 'finance/invoices':
        return <FullPaymentInvoiceView />
      case 'finance/anp-calculator':
        return <ANPCalculatorView />
      case 'finance/commissions':
        return <AgentCommissionReportView />
      case 'finance/monthly-comm-report':
        return <GenerateMonthlyCommReportView />
      case 'finance/eligible-comm':
        return <CheckEligibleCommView />
      case 'hr/manage-agent':
        return <ManageAgentView />
      case 'project':
        return <ProjectView />
      case 'search-customer':
        return <SearchCustomerView />
      case 'admin':
        return <AdminView />
      default:
        return <FinanceView />
    }
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar onNavigate={handleNavigation} />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <header className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold">Welcome to Eternalgy Admin Dashboard 2.0</h1>
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