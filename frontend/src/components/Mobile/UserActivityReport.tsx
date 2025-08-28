import { useState, useEffect } from 'react'
import { Card } from '../ui/card'
import { Button } from '../ui/button'
import { ArrowLeft, TrendingUp, Calendar, User, Activity } from 'lucide-react'

interface ActivityTypeSummary {
  activity_type: string
  count: number
  total_points: number
}

interface DailyPointsSummary {
  date: string
  total_points: number
  activity_count: number
}

interface DetailedReport {
  id: string
  bubble_id: string
  activity_type: string
  report_point: number
  report_date: string
  created_date: string
  remark: string
  tag: string[]
  linked_customer: string | null
  customer_name: string | null
}

interface Pagination {
  current_page: number
  total_pages: number
  total_reports: number
  limit: number
  has_next: boolean
  has_prev: boolean
}

interface ActivityReportData {
  success: boolean
  user_id: string
  summary: {
    seven_day_activity_types: ActivityTypeSummary[]
    seven_day_daily_points: DailyPointsSummary[]
    seven_day_totals: {
      total_points: number
      total_activities: number
    }
  }
  detailed_reports: {
    reports: DetailedReport[]
    pagination: Pagination
  }
}

interface UserActivityReportProps {
  userId: string
  userName: string
  onBack: () => void
}

export function UserActivityReport({ userId, userName, onBack }: UserActivityReportProps) {
  const [data, setData] = useState<ActivityReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    fetchActivityReport(currentPage)
  }, [userId, currentPage])

  const fetchActivityReport = async (page: number) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/user/${userId}/activity-report?page=${page}&limit=14`)
      if (!response.ok) throw new Error('Failed to fetch activity report')
      
      const reportData = await response.json()
      setData(reportData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load activity report')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-MY', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-MY', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getActivityIcon = (activityType: string) => {
    switch (activityType.toLowerCase()) {
      case 'site visit':
        return '🏠'
      case 'follow up call':
        return '📞'
      case 'new presentation':
        return '🎯'
      case 'other work':
        return '📋'
      default:
        return '💼'
    }
  }

  const getPointsColor = (points: number) => {
    if (points >= 50) return 'text-green-600 bg-green-100'
    if (points >= 30) return 'text-blue-600 bg-blue-100'
    if (points > 0) return 'text-orange-600 bg-orange-100'
    return 'text-gray-600 bg-gray-100'
  }

  if (loading) {
    return (
      <div className="p-4 max-w-md mx-auto">
        <div className="flex items-center mb-6">
          <Button variant="outline" onClick={onBack} className="mr-3">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-semibold">Activity Report</h1>
        </div>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-2">Loading activity report...</p>
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
          <h1 className="text-xl font-semibold">Activity Report</h1>
        </div>
        <Card className="p-6 text-center">
          <p className="text-red-600 mb-4">Error: {error}</p>
          <Button onClick={() => fetchActivityReport(currentPage)}>Retry</Button>
        </Card>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="p-4 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center mb-6">
        <Button variant="outline" onClick={onBack} className="mr-3">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold">Activity Report</h1>
          <p className="text-sm text-gray-600">{userName}</p>
        </div>
      </div>

      {/* 7-Day Summary Card */}
      <Card className="p-4 mb-4">
        <div className="flex items-center mb-3">
          <TrendingUp className="h-5 w-5 text-blue-600 mr-2" />
          <h2 className="text-lg font-semibold">Last 7 Days Summary</h2>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-center bg-blue-50 rounded-lg p-3">
            <div className="text-2xl font-bold text-blue-600">
              {data.summary.seven_day_totals.total_points}
            </div>
            <div className="text-sm text-gray-600">Total Points</div>
          </div>
          <div className="text-center bg-green-50 rounded-lg p-3">
            <div className="text-2xl font-bold text-green-600">
              {data.summary.seven_day_totals.total_activities}
            </div>
            <div className="text-sm text-gray-600">Activities</div>
          </div>
        </div>

        {/* Activity Types */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-700">By Activity Type:</h3>
          {data.summary.seven_day_activity_types.map((activity) => (
            <div key={activity.activity_type} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <span className="mr-2">{getActivityIcon(activity.activity_type)}</span>
                <span className="text-sm">{activity.activity_type}</span>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium">{activity.count}x</div>
                <div className="text-xs text-gray-500">{activity.total_points} pts</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Daily Points Chart */}
      <Card className="p-4 mb-4">
        <div className="flex items-center mb-3">
          <Calendar className="h-5 w-5 text-green-600 mr-2" />
          <h2 className="text-lg font-semibold">Daily Points (Last 7 Days)</h2>
        </div>
        <div className="space-y-2">
          {data.summary.seven_day_daily_points.map((day) => (
            <div key={day.date} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
              <div className="text-sm">{formatDate(day.date)}</div>
              <div className="text-right">
                <div className="text-sm font-medium">{day.total_points} pts</div>
                <div className="text-xs text-gray-500">{day.activity_count} activities</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Detailed Reports */}
      <Card className="p-4 mb-4">
        <div className="flex items-center mb-4">
          <Activity className="h-5 w-5 text-purple-600 mr-2" />
          <h2 className="text-lg font-semibold">Recent Activities (Last 14 Days)</h2>
        </div>
        
        <div className="space-y-3">
          {data.detailed_reports.reports.map((report) => (
            <div key={report.id} className="border border-gray-200 rounded-lg p-3">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center">
                  <span className="mr-2">{getActivityIcon(report.activity_type)}</span>
                  <div>
                    <div className="text-sm font-medium">{report.activity_type}</div>
                    <div className="text-xs text-gray-500">
                      {formatDate(report.report_date)} • {formatTime(report.created_date)}
                    </div>
                  </div>
                </div>
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${getPointsColor(report.report_point)}`}>
                  {report.report_point} pts
                </div>
              </div>
              
              {report.customer_name && (
                <div className="flex items-center mb-2">
                  <User className="h-3 w-3 text-gray-400 mr-1" />
                  <span className="text-xs text-gray-600">{report.customer_name}</span>
                </div>
              )}
              
              {report.remark && (
                <p className="text-sm text-gray-700 bg-gray-50 rounded p-2">
                  {report.remark}
                </p>
              )}
              
              {report.tag && report.tag.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {report.tag.map((tag, index) => (
                    <span key={index} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Pagination */}
        {data.detailed_reports.pagination.total_pages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={() => setCurrentPage(prev => prev - 1)}
              disabled={!data.detailed_reports.pagination.has_prev}
              className="text-sm"
            >
              Previous
            </Button>
            <div className="text-sm text-gray-600">
              Page {data.detailed_reports.pagination.current_page} of {data.detailed_reports.pagination.total_pages}
            </div>
            <Button 
              variant="outline" 
              onClick={() => setCurrentPage(prev => prev + 1)}
              disabled={!data.detailed_reports.pagination.has_next}
              className="text-sm"
            >
              Next
            </Button>
          </div>
        )}
        
        <div className="text-center text-xs text-gray-500 mt-2">
          Showing {data.detailed_reports.reports.length} of {data.detailed_reports.pagination.total_reports} reports
        </div>
      </Card>
    </div>
  )
}