import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FolderKanban, Users, Calendar, CheckCircle } from 'lucide-react'

// Dummy project data
const projectData = [
  { 
    id: 'PRJ-001', 
    name: 'Website Redesign', 
    status: 'In Progress', 
    progress: 65, 
    team: 4, 
    deadline: '2024-02-15',
    budget: 45000
  },
  { 
    id: 'PRJ-002', 
    name: 'Mobile App Development', 
    status: 'Planning', 
    progress: 15, 
    team: 6, 
    deadline: '2024-04-30',
    budget: 120000
  },
  { 
    id: 'PRJ-003', 
    name: 'Database Migration', 
    status: 'Completed', 
    progress: 100, 
    team: 3, 
    deadline: '2024-01-20',
    budget: 25000
  },
  { 
    id: 'PRJ-004', 
    name: 'API Integration', 
    status: 'In Progress', 
    progress: 80, 
    team: 2, 
    deadline: '2024-02-05',
    budget: 18000
  },
  { 
    id: 'PRJ-005', 
    name: 'Security Audit', 
    status: 'On Hold', 
    progress: 25, 
    team: 2, 
    deadline: '2024-03-15',
    budget: 35000
  }
]

const projectSummary = {
  totalProjects: 5,
  activeProjects: 2,
  completedProjects: 1,
  totalBudget: 243000
}

export function ProjectView() {
  return (
    <div className="space-y-6">
      {/* Project Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projectSummary.totalProjects}</div>
            <p className="text-xs text-muted-foreground">Across all departments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projectSummary.activeProjects}</div>
            <p className="text-xs text-muted-foreground">Currently in progress</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projectSummary.completedProjects}</div>
            <p className="text-xs text-muted-foreground">This quarter</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${projectSummary.totalBudget.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Allocated budget</p>
          </CardContent>
        </Card>
      </div>

      {/* Project List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Project Overview</CardTitle>
              <CardDescription>Current projects and their status</CardDescription>
            </div>
            <Button>Add New Project</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {projectData.map((project) => (
              <div key={project.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-semibold">{project.name}</h3>
                    <p className="text-sm text-muted-foreground">{project.id}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    project.status === 'Completed' ? 'bg-green-100 text-green-800' :
                    project.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                    project.status === 'Planning' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {project.status}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Progress</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 bg-secondary rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full" 
                          style={{ width: `${project.progress}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium">{project.progress}%</span>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-muted-foreground">Team Size</p>
                    <p className="font-medium">{project.team} members</p>
                  </div>
                  
                  <div>
                    <p className="text-muted-foreground">Deadline</p>
                    <p className="font-medium">{project.deadline}</p>
                  </div>
                  
                  <div>
                    <p className="text-muted-foreground">Budget</p>
                    <p className="font-medium">${project.budget.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}