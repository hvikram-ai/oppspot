import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface CompanyStatusBadgeProps {
  status: string
  className?: string
}

export function CompanyStatusBadge({ status, className }: CompanyStatusBadgeProps) {
  const getStatusStyles = (status: string) => {
    const normalizedStatus = status?.toLowerCase() || ''
    
    switch (normalizedStatus) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'dissolved':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'liquidation':
      case 'administration':
      case 'receivership':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'dormant':
      case 'inactive':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'voluntary-arrangement':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200'
    }
  }

  const getStatusLabel = (status: string) => {
    const normalizedStatus = status?.toLowerCase() || ''
    
    switch (normalizedStatus) {
      case 'active':
        return 'Active'
      case 'dissolved':
        return 'Dissolved'
      case 'liquidation':
        return 'In Liquidation'
      case 'administration':
        return 'In Administration'
      case 'receivership':
        return 'In Receivership'
      case 'dormant':
        return 'Dormant'
      case 'voluntary-arrangement':
        return 'Voluntary Arrangement'
      default:
        return status || 'Unknown'
    }
  }

  return (
    <Badge 
      variant="outline"
      className={cn(
        getStatusStyles(status),
        'font-medium',
        className
      )}
    >
      {getStatusLabel(status)}
    </Badge>
  )
}