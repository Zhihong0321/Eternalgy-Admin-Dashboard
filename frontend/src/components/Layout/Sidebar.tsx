import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { 
  DollarSign, 
  FolderKanban, 
  Settings, 
  FileText, 
  TrendingUp,
  ChevronDown,
  ChevronRight
} from 'lucide-react'

interface SidebarProps {
  className?: string
}

interface NavItem {
  title: string
  icon: React.ComponentType<{ className?: string }>
  children?: NavItem[]
  path?: string
}

const navigation: NavItem[] = [
  {
    title: 'Finance',
    icon: DollarSign,
    children: [
      { title: 'Full Payment Invoice', icon: FileText, path: '/finance/invoices' },
      { title: 'Agent Commission Report', icon: TrendingUp, path: '/finance/commissions' }
    ]
  },
  {
    title: 'Project',
    icon: FolderKanban,
    path: '/project'
  },
  {
    title: 'Admin',
    icon: Settings,
    path: '/admin'
  }
]

export function Sidebar({ className }: SidebarProps) {
  const [expandedItems, setExpandedItems] = useState<string[]>(['Finance'])

  const toggleExpanded = (title: string) => {
    setExpandedItems(prev => 
      prev.includes(title) 
        ? prev.filter(item => item !== title)
        : [...prev, title]
    )
  }

  const NavItemComponent = ({ item, level = 0 }: { item: NavItem; level?: number }) => {
    const hasChildren = item.children && item.children.length > 0
    const isExpanded = expandedItems.includes(item.title)
    const Icon = item.icon
    
    return (
      <div className="w-full">
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start text-left h-auto py-2 px-3",
            level > 0 && "ml-4 text-sm"
          )}
          onClick={() => hasChildren && toggleExpanded(item.title)}
        >
          <Icon className="mr-2 h-4 w-4" />
          <span className="flex-1">{item.title}</span>
          {hasChildren && (
            isExpanded ? 
              <ChevronDown className="h-4 w-4" /> : 
              <ChevronRight className="h-4 w-4" />
          )}
        </Button>
        
        {hasChildren && isExpanded && (
          <div className="mt-1 space-y-1">
            {item.children!.map((child) => (
              <NavItemComponent key={child.title} item={child} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col h-full w-64 border-r bg-background", className)}>
      {/* Logo/Header */}
      <div className="flex items-center justify-center h-16 border-b">
        <h1 className="text-xl font-bold">Eternalgy ERP</h1>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4">
        <div className="space-y-2">
          {navigation.map((item) => (
            <NavItemComponent key={item.title} item={item} />
          ))}
        </div>
      </nav>
      
      {/* Footer */}
      <div className="p-4 border-t">
        <p className="text-xs text-muted-foreground">Admin Dashboard v2.0</p>
      </div>
    </div>
  )
}