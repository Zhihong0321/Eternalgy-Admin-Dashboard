import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Users, Shield, Settings, Activity } from 'lucide-react'

// Dummy admin data
const userData = [
  { id: 'USR-001', name: 'John Smith', role: 'Admin', email: 'john@example.com', status: 'Active', lastLogin: '2024-01-25 14:30' },
  { id: 'USR-002', name: 'Sarah Johnson', role: 'Manager', email: 'sarah@example.com', status: 'Active', lastLogin: '2024-01-25 09:15' },
  { id: 'USR-003', name: 'Mike Chen', role: 'Employee', email: 'mike@example.com', status: 'Active', lastLogin: '2024-01-24 16:45' },
  { id: 'USR-004', name: 'Emily Davis', role: 'Employee', email: 'emily@example.com', status: 'Inactive', lastLogin: '2024-01-20 11:20' },
  { id: 'USR-005', name: 'Alex Wilson', role: 'Manager', email: 'alex@example.com', status: 'Active', lastLogin: '2024-01-25 13:10' }
]

const systemStats = {
  totalUsers: 5,
  activeUsers: 4,
  adminUsers: 1,
  systemUptime: '99.9%'
}

const recentActivity = [
  { user: 'John Smith', action: 'Created new invoice INV-006', time: '2 hours ago' },
  { user: 'Sarah Johnson', action: 'Updated project milestone', time: '4 hours ago' },
  { user: 'Mike Chen', action: 'Generated commission report', time: '6 hours ago' },
  { user: 'Alex Wilson', action: 'Added new client record', time: '1 day ago' },
  { user: 'Emily Davis', action: 'Modified user permissions', time: '2 days ago' }
]

export function AdminView() {
  return (
    <div className="space-y-6">
      {/* System Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemStats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">Registered users</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemStats.activeUsers}</div>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admin Users</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemStats.adminUsers}</div>
            <p className="text-xs text-muted-foreground">With admin privileges</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Uptime</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemStats.systemUptime}</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>
      </div>

      {/* User Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>User Management</CardTitle>
              <CardDescription>Manage system users and their permissions</CardDescription>
            </div>
            <Button>Add New User</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">User ID</th>
                  <th className="text-left py-2">Name</th>
                  <th className="text-left py-2">Role</th>
                  <th className="text-left py-2">Email</th>
                  <th className="text-left py-2">Status</th>
                  <th className="text-left py-2">Last Login</th>
                  <th className="text-left py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {userData.map((user) => (
                  <tr key={user.id} className="border-b">
                    <td className="py-3 font-medium">{user.id}</td>
                    <td className="py-3">{user.name}</td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        user.role === 'Admin' ? 'bg-red-100 text-red-800' :
                        user.role === 'Manager' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="py-3">{user.email}</td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        user.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="py-3 text-sm">{user.lastLogin}</td>
                    <td className="py-3">
                      <Button variant="outline" size="sm">Edit</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent System Activity</CardTitle>
          <CardDescription>Latest user actions and system events</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivity.map((activity, index) => (
              <div key={index} className="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                  <p className="font-medium">{activity.user}</p>
                  <p className="text-sm text-muted-foreground">{activity.action}</p>
                </div>
                <span className="text-xs text-muted-foreground">{activity.time}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}