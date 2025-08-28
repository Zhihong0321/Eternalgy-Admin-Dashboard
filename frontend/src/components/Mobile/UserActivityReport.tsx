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

  const formatDateCard = (dateString: string) => {
    const date = new Date(dateString)
    const dayOfWeek = date.getDay() // 0 = Sunday, 6 = Saturday
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
    
    return {
      day: date.toLocaleDateString('en-MY', { day: '2-digit' }),
      month: date.toLocaleDateString('en-MY', { month: 'short' }).toUpperCase(),
      weekday: date.toLocaleDateString('en-MY', { weekday: 'short' }).toUpperCase(),
      isWeekend
    }
  }

  const getActivityIcon = (activityType: string) => {
    // Remove emojis and use text indicators instead
    switch (activityType.toLowerCase()) {
      case 'site visit':
        return 'SV'
      case 'follow up call':
        return 'FC'
      case 'new presentation':
        return 'NP'
      case 'other work':
        return 'OW'
      default:
        return 'AC'
    }
  }

  const getPointsColor = (points: number) => {
    // Dark theme colors - white text on dark backgrounds
    if (points >= 50) return 'text-white bg-green-600'
    if (points >= 30) return 'text-white bg-blue-600'
    if (points > 0) return 'text-white bg-orange-600'
    return 'text-white bg-gray-600'
  }

  const AreaChart = ({ data }: { data: DailyPointsSummary[] }) => {
    // Generate complete last 7 days data, filling missing days with 0 points
    const generateLast7Days = () => {
      const result = []
      const today = new Date()
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today)
        date.setDate(date.getDate() - i)
        const dateStr = date.toISOString().split('T')[0]
        
        // Find existing data for this date
        const existingDay = data?.find(d => d.date.split('T')[0] === dateStr)
        
        result.push({
          date: dateStr,
          total_points: existingDay?.total_points || 0,
          activity_count: existingDay?.activity_count || 0
        })
      }
      
      return result
    }

    const completeData = generateLast7Days()
    const maxPoints = Math.max(...completeData.map(d => d.total_points), 10) // Minimum scale of 10
    const chartHeight = 140 // Increased height for point labels
    const chartWidth = 320 // Use full mobile width
    const padding = 20 // Padding for labels

    // Create points for the area chart
    const points = completeData.map((day, index) => {
      const x = padding + (index * (chartWidth - padding * 2)) / (completeData.length - 1)
      const y = chartHeight - padding - 15 - ((day.total_points / maxPoints) * (chartHeight - padding * 2 - 30))
      return { x, y, points: day.total_points, date: day.date }
    })

    // Create smooth curved path using quadratic bezier curves
    const createSmoothPath = (points: any[], isArea = false) => {
      if (points.length < 2) return ''
      
      let path = `M ${points[0].x} ${points[0].y}`
      
      for (let i = 1; i < points.length; i++) {
        const prevPoint = points[i - 1]
        const currentPoint = points[i]
        
        // Control points for smooth curve
        const controlX1 = prevPoint.x + (currentPoint.x - prevPoint.x) * 0.5
        const controlY1 = prevPoint.y
        const controlX2 = prevPoint.x + (currentPoint.x - prevPoint.x) * 0.5
        const controlY2 = currentPoint.y
        
        path += ` C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${currentPoint.x} ${currentPoint.y}`
      }
      
      if (isArea) {
        const baseY = chartHeight - padding - 15
        path += ` L ${points[points.length - 1].x} ${baseY} L ${points[0].x} ${baseY} Z`
      }
      
      return path
    }

    // Create smooth curved paths
    const areaPath = createSmoothPath(points, true)
    const linePath = createSmoothPath(points, false)

    return (
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-300">Last 7 Days Points</h3>
          <span className="text-xs text-gray-400">Max: {maxPoints} pts</span>
        </div>
        <div className="bg-gray-700 rounded-lg p-4">
          <svg width={chartWidth} height={chartHeight} className="w-full h-auto">
            {/* Grid lines */}
            {[0.25, 0.5, 0.75].map((ratio) => (
              <line
                key={ratio}
                x1={padding}
                y1={chartHeight - padding - 15 - (ratio * (chartHeight - padding * 2 - 30))}
                x2={chartWidth - padding}
                y2={chartHeight - padding - 15 - (ratio * (chartHeight - padding * 2 - 30))}
                stroke="#374151"
                strokeWidth="1"
                strokeDasharray="3,3"
              />
            ))}
            
            {/* Area fill */}
            <path
              d={areaPath}
              fill="url(#areaGradient)"
              opacity="0.6"
            />
            
            {/* Smooth curved line */}
            <path
              d={linePath}
              stroke="#3B82F6"
              strokeWidth="2"
              fill="none"
            />
            
            {/* Data points */}
            {points.map((point, index) => (
              <circle
                key={index}
                cx={point.x}
                cy={point.y}
                r="4"
                fill="#3B82F6"
                stroke="#1F2937"
                strokeWidth="2"
              />
            ))}
            
            {/* Point labels (numbers on dots) */}
            {points.map((point, index) => (
              <text
                key={`label-${index}`}
                x={point.x}
                y={point.y - 10}
                textAnchor="middle"
                className="fill-white text-xs font-medium"
                fontSize="12"
              >
                {point.points}
              </text>
            ))}
            
            {/* X-axis labels */}
            {points.map((point, index) => {
              const date = new Date(point.date)
              const dayLabel = date.toLocaleDateString('en-MY', { weekday: 'short' }).substring(0, 3)
              return (
                <text
                  key={`day-${index}`}
                  x={point.x}
                  y={chartHeight - 5}
                  textAnchor="middle"
                  className="fill-gray-400 text-xs"
                  fontSize="11"
                >
                  {dayLabel}
                </text>
              )
            })}
            
            {/* Gradient definition */}
            <defs>
              <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.1" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="p-4 max-w-md mx-auto bg-gray-900 min-h-screen">
        <div className="flex items-center mb-6">
          <Button variant="outline" onClick={onBack} className="mr-3 bg-gray-800 border-gray-700 text-white hover:bg-gray-700">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-semibold text-white">Activity Report</h1>
        </div>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto"></div>
          <p className="text-gray-300 mt-2">Loading activity report...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 max-w-md mx-auto bg-gray-900 min-h-screen">
        <div className="flex items-center mb-6">
          <Button variant="outline" onClick={onBack} className="mr-3 bg-gray-800 border-gray-700 text-white hover:bg-gray-700">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-semibold text-white">Activity Report</h1>
        </div>
        <Card className="p-6 text-center bg-gray-800 border-gray-700">
          <p className="text-red-400 mb-4">Error: {error}</p>
          <Button onClick={() => fetchActivityReport(currentPage)} className="bg-blue-600 hover:bg-blue-700 text-white">Retry</Button>
        </Card>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="p-4 max-w-md mx-auto bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="flex items-center mb-6">
        <Button variant="outline" onClick={onBack} className="mr-3 bg-gray-800 border-gray-700 text-white hover:bg-gray-700">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold text-white">Activity Report</h1>
          <p className="text-sm text-gray-400">{userName}</p>
        </div>
      </div>

      {/* 7-Day Summary Card */}
      <Card className="p-4 mb-4 bg-gray-800 border-gray-700">
        <div className="flex items-center mb-3">
          <TrendingUp className="h-5 w-5 text-blue-400 mr-2" />
          <h2 className="text-lg font-semibold text-white">Last 7 Days Summary</h2>
        </div>
        
        {/* Area Chart */}
        <AreaChart data={data.summary.seven_day_daily_points} />
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-center bg-blue-900 rounded-lg p-3">
            <div className="text-2xl font-bold text-blue-400">
              {data.summary.seven_day_totals.total_points}
            </div>
            <div className="text-sm text-gray-300">Total Points</div>
          </div>
          <div className="text-center bg-green-900 rounded-lg p-3">
            <div className="text-2xl font-bold text-green-400">
              {data.summary.seven_day_totals.total_activities}
            </div>
            <div className="text-sm text-gray-300">Activities</div>
          </div>
        </div>

        {/* Activity Types */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-300">By Activity Type:</h3>
          {data.summary.seven_day_activity_types.map((activity) => (
            <div key={activity.activity_type} className="flex items-center justify-between py-2 px-3 bg-gray-700 rounded-lg">
              <div className="flex items-center">
                <span className="mr-2 text-xs bg-gray-600 text-white px-2 py-1 rounded">{getActivityIcon(activity.activity_type)}</span>
                <span className="text-sm text-white">{activity.activity_type}</span>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-white">{activity.count}x</div>
                <div className="text-xs text-gray-400">{activity.total_points} pts</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Daily Points Chart */}
      <Card className="p-4 mb-4 bg-gray-800 border-gray-700">
        <div className="flex items-center mb-3">
          <Calendar className="h-5 w-5 text-green-400 mr-2" />
          <h2 className="text-lg font-semibold text-white">Daily Points (Last 7 Days)</h2>
        </div>
        <div className="space-y-2">
          {(() => {
            // Generate complete last 7 days data for daily points section
            const generateLast7DaysPoints = () => {
              const result = []
              const today = new Date()
              
              for (let i = 6; i >= 0; i--) {
                const date = new Date(today)
                date.setDate(date.getDate() - i)
                const dateStr = date.toISOString().split('T')[0]
                
                // Find existing data for this date
                const existingDay = data.summary.seven_day_daily_points?.find(d => d.date.split('T')[0] === dateStr)
                
                result.push({
                  date: dateStr,
                  total_points: existingDay?.total_points || 0,
                  activity_count: existingDay?.activity_count || 0
                })
              }
              
              return result
            }

            const completeDays = generateLast7DaysPoints()
            
            // Sort by date descending (newest first)
            const sortedDays = completeDays.reverse()
            
            return sortedDays.map((day) => {
              const date = new Date(day.date)
              const dayOfWeek = date.getDay() // 0 = Sunday, 6 = Saturday
              const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
              const dayName = date.toLocaleDateString('en-MY', { weekday: 'short' }).toUpperCase()
              const dayNumber = date.toLocaleDateString('en-MY', { day: '2-digit' })
              const monthName = date.toLocaleDateString('en-MY', { month: 'short' }).toUpperCase()
              
              return (
                <div 
                  key={day.date} 
                  className={`flex items-center justify-between py-2 px-3 rounded-lg ${
                    isWeekend ? 'bg-red-900 border border-red-700' : 'bg-gray-700'
                  }`}
                >
                  <div className="text-sm text-white">
                    {dayNumber} {monthName} {dayName}
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-white">{day.total_points} pts</div>
                    <div className="text-xs text-gray-400">{day.activity_count} activities</div>
                  </div>
                </div>
              )
            })
          })()}
        </div>
      </Card>

      {/* Detailed Reports */}
      <Card className="p-4 mb-4 bg-gray-800 border-gray-700">
        <div className="flex items-center mb-4">
          <Activity className="h-5 w-5 text-purple-400 mr-2" />
          <h2 className="text-lg font-semibold text-white">All Reports (Sort by Date)</h2>
        </div>
        
        <div className="space-y-3">
          {(() => {
            // Generate all dates in the current page period (14 days from most recent report)
            const generateDateRange = () => {
              if (!data.detailed_reports.reports.length) return []
              
              // Get the date range from the reports
              const reportDates = data.detailed_reports.reports.map(r => r.report_date.split('T')[0])
              const earliestDate = new Date(Math.min(...reportDates.map(d => new Date(d).getTime())))
              const latestDate = new Date(Math.max(...reportDates.map(d => new Date(d).getTime())))
              
              // Generate all dates in range
              const allDates = []
              const currentDate = new Date(earliestDate)
              
              while (currentDate <= latestDate) {
                allDates.push(currentDate.toISOString().split('T')[0])
                currentDate.setDate(currentDate.getDate() + 1)
              }
              
              return allDates.reverse() // Show newest first
            }

            const allDates = generateDateRange()
            
            return allDates.map((dateStr) => {
              const reportsForDate = data.detailed_reports.reports.filter(r => 
                r.report_date.split('T')[0] === dateStr
              )
              const dateCard = formatDateCard(dateStr)
              const hasReports = reportsForDate.length > 0

              if (hasReports) {
                // Group all reports for this date under one date card
                const totalPoints = reportsForDate.reduce((sum, report) => sum + report.report_point, 0)
                
                return (
                  <div key={dateStr} className="border border-gray-600 rounded-lg p-3 bg-gray-700">
                    {/* Date Header with total points */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        {/* Date Card with weekend styling */}
                        <div className={`flex-shrink-0 rounded-lg p-2 text-center border ${
                          dateCard.isWeekend 
                            ? 'bg-red-900 border-red-700' 
                            : 'bg-gray-900 border-gray-500'
                        }`} style={{minWidth: '50px'}}>
                          <div className="text-xs text-gray-400 font-medium">{dateCard.weekday}</div>
                          <div className="text-lg font-bold text-white leading-none">{dateCard.day}</div>
                          <div className="text-xs text-gray-400 font-medium">{dateCard.month}</div>
                        </div>
                        
                        <div>
                          <div className="text-sm font-medium text-white">{reportsForDate.length} Reports</div>
                          <div className="text-xs text-gray-400">Total: {totalPoints} points</div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Individual Reports */}
                    <div className="space-y-3 ml-2">
                      {reportsForDate.map((report, index) => (
                        <div key={report.id} className="border-l-2 border-blue-500 pl-3 bg-gray-600 rounded-r p-2">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <span className="text-xs bg-gray-700 text-white px-2 py-1 rounded">{getActivityIcon(report.activity_type)}</span>
                              <div>
                                <div className="text-sm font-medium text-white">{report.activity_type}</div>
                                <div className="text-xs text-gray-400">{formatTime(report.created_date)}</div>
                              </div>
                            </div>
                            <div className={`px-2 py-1 rounded-full text-xs font-medium ${getPointsColor(report.report_point)}`}>
                              {report.report_point} pts
                            </div>
                          </div>
                          
                          {report.customer_name && (
                            <div className="flex items-center mb-2">
                              <User className="h-3 w-3 text-gray-400 mr-1" />
                              <span className="text-xs text-gray-300">{report.customer_name}</span>
                            </div>
                          )}
                          
                          {report.remark && (
                            <p className="text-sm text-gray-300 bg-gray-500 rounded p-2 mb-2">
                              {report.remark}
                            </p>
                          )}
                          
                          {report.tag && report.tag.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {report.tag.map((tag, tagIndex) => (
                                <span key={tagIndex} className="px-2 py-1 bg-blue-600 text-blue-200 text-xs rounded-full">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              } else {
                // Show empty date card for days with no reports
                return (
                  <div key={`empty-${dateStr}`} className="border border-gray-600 rounded-lg p-3 bg-gray-750">
                    <div className="flex items-center space-x-3">
                      {/* Empty Date Card with weekend styling */}
                      <div className={`flex-shrink-0 rounded-lg p-2 text-center border ${
                        dateCard.isWeekend 
                          ? 'bg-red-900 border-red-700' 
                          : 'bg-gray-900 border-gray-500'
                      }`} style={{minWidth: '50px'}}>
                        <div className="text-xs text-gray-400 font-medium">{dateCard.weekday}</div>
                        <div className="text-lg font-bold text-white leading-none">{dateCard.day}</div>
                        <div className="text-xs text-gray-400 font-medium">{dateCard.month}</div>
                      </div>
                      
                      <div className="flex-grow">
                        <div className="text-sm text-gray-500 italic">No reports for this day</div>
                      </div>
                    </div>
                  </div>
                )
              }
            })
          })()}
        </div>

        {/* Pagination */}
        {data.detailed_reports.pagination.total_pages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-600">
            <Button 
              variant="outline" 
              onClick={() => setCurrentPage(prev => prev - 1)}
              disabled={!data.detailed_reports.pagination.has_prev}
              className="text-sm bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
            >
              Previous
            </Button>
            <div className="text-sm text-gray-300">
              Page {data.detailed_reports.pagination.current_page} of {data.detailed_reports.pagination.total_pages}
            </div>
            <Button 
              variant="outline" 
              onClick={() => setCurrentPage(prev => prev + 1)}
              disabled={!data.detailed_reports.pagination.has_next}
              className="text-sm bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
            >
              Next
            </Button>
          </div>
        )}
        
        <div className="text-center text-xs text-gray-400 mt-2">
          Showing {data.detailed_reports.reports.length} of {data.detailed_reports.pagination.total_reports} reports
        </div>
      </Card>
    </div>
  )
}