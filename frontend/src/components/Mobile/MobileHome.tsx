import { Card } from '../ui/card'
import { Button } from '../ui/button'
import { ClipboardList } from 'lucide-react'
import type { MobileView } from './MobileERP'

interface MobileHomeProps {
  onNavigate: (view: MobileView) => void
}

export function MobileHome({ onNavigate }: MobileHomeProps) {
  return (
    <div className="p-4 max-w-md mx-auto">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Sales Manager ERP</h1>
        <p className="text-gray-600 mt-2">Mobile Dashboard</p>
      </div>

      {/* Daily Activity Report Card */}
      <Card className="p-6 mb-4 shadow-lg">
        <div className="text-center">
          <div className="mb-4">
            <ClipboardList className="h-16 w-16 text-blue-600 mx-auto" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Daily Activity Report
          </h2>
          <p className="text-gray-600 mb-4">
            View sales agent performance and activities
          </p>
          <Button 
            onClick={() => onNavigate('agents')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 text-lg"
          >
            View Agent Reports
          </Button>
        </div>
      </Card>

      {/* Footer */}
      <div className="text-center text-sm text-gray-500 mt-8">
        Eternalgy Sales Management System
      </div>
    </div>
  )
}