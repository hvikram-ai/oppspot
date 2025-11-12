'use client'

/**
 * Technologies List Component
 * Display detected technologies with filtering and sorting
 */

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  CheckCircle2,
  AlertTriangle,
  Search,
  Shield,
  Code2,
  Database,
  Cloud,
  Layers,
  Cpu,
  TestTube,
  Activity,
  GitBranch,
  MoreHorizontal,
} from 'lucide-react'
import type { TechStackTechnologyWithSource, TechCategory } from '@/lib/data-room/types'

interface TechnologiesListProps {
  technologies: TechStackTechnologyWithSource[]
}

export function TechnologiesList({ technologies }: TechnologiesListProps) {
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [authenticityFilter, setAuthenticityFilter] = useState<string>('all')

  const getCategoryIcon = (category: TechCategory) => {
    const iconClass = 'h-4 w-4'
    switch (category) {
      case 'frontend':
        return <Code2 className={iconClass} />
      case 'backend':
        return <Layers className={iconClass} />
      case 'database':
        return <Database className={iconClass} />
      case 'infrastructure':
        return <Cloud className={iconClass} />
      case 'ml_ai':
        return <Cpu className={iconClass} />
      case 'security':
        return <Shield className={iconClass} />
      case 'testing':
        return <TestTube className={iconClass} />
      case 'monitoring':
        return <Activity className={iconClass} />
      case 'devops':
        return <GitBranch className={iconClass} />
      default:
        return <MoreHorizontal className={iconClass} />
    }
  }

  const getCategoryColor = (category: TechCategory) => {
    switch (category) {
      case 'frontend':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'backend':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      case 'database':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'infrastructure':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
      case 'ml_ai':
        return 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200'
      case 'security':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      case 'testing':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'monitoring':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200'
      case 'devops':
        return 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
    }
  }

  const getAuthenticityColor = (authenticity: string | null) => {
    switch (authenticity) {
      case 'proprietary':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      case 'wrapper':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      case 'hybrid':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'third_party':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
    }
  }

  const getRiskColor = (riskScore: number | null) => {
    if (riskScore === null) return 'text-gray-400'
    if (riskScore >= 75) return 'text-red-600 font-bold'
    if (riskScore >= 50) return 'text-orange-600'
    if (riskScore >= 25) return 'text-yellow-600'
    return 'text-green-600'
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600'
    if (confidence >= 0.6) return 'text-yellow-600'
    return 'text-orange-600'
  }

  // Filter technologies
  const filteredTechnologies = technologies.filter((tech) => {
    const matchesSearch =
      search === '' ||
      tech.name.toLowerCase().includes(search.toLowerCase()) ||
      tech.version?.toLowerCase().includes(search.toLowerCase())

    const matchesCategory = categoryFilter === 'all' || tech.category === categoryFilter

    const matchesAuthenticity =
      authenticityFilter === 'all' || tech.authenticity === authenticityFilter

    return matchesSearch && matchesCategory && matchesAuthenticity
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Detected Technologies</CardTitle>
        <CardDescription>
          {technologies.length} {technologies.length === 1 ? 'technology' : 'technologies'}{' '}
          detected
          {filteredTechnologies.length !== technologies.length &&
            ` (${filteredTechnologies.length} shown)`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search technologies..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="frontend">Frontend</SelectItem>
              <SelectItem value="backend">Backend</SelectItem>
              <SelectItem value="database">Database</SelectItem>
              <SelectItem value="infrastructure">Infrastructure</SelectItem>
              <SelectItem value="ml_ai">ML/AI</SelectItem>
              <SelectItem value="security">Security</SelectItem>
              <SelectItem value="testing">Testing</SelectItem>
              <SelectItem value="monitoring">Monitoring</SelectItem>
              <SelectItem value="devops">DevOps</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
          <Select value={authenticityFilter} onValueChange={setAuthenticityFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Authenticity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="proprietary">Proprietary</SelectItem>
              <SelectItem value="wrapper">Wrapper</SelectItem>
              <SelectItem value="hybrid">Hybrid</SelectItem>
              <SelectItem value="third_party">Third Party</SelectItem>
              <SelectItem value="unknown">Unknown</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Technologies Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Technology</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Version</TableHead>
                <TableHead className="text-center">Confidence</TableHead>
                <TableHead className="text-center">Risk</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTechnologies.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                    No technologies found
                  </TableCell>
                </TableRow>
              ) : (
                filteredTechnologies.map((tech) => (
                  <TableRow key={tech.id}>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{tech.name}</span>
                          {tech.manually_verified && (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          )}
                        </div>
                        {tech.authenticity && (
                          <Badge variant="outline" className={getAuthenticityColor(tech.authenticity)}>
                            {tech.authenticity}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getCategoryColor(tech.category)}>
                        <span className="mr-1">{getCategoryIcon(tech.category)}</span>
                        {tech.category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {tech.version || '-'}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`font-medium ${getConfidenceColor(tech.confidence_score)}`}>
                        {Math.round(tech.confidence_score * 100)}%
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`font-medium ${getRiskColor(tech.risk_score)}`}>
                        {tech.risk_score !== null ? tech.risk_score : '-'}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        {tech.is_deprecated && (
                          <Badge variant="destructive" className="text-xs">
                            Deprecated
                          </Badge>
                        )}
                        {tech.is_outdated && !tech.is_deprecated && (
                          <Badge variant="outline" className="text-xs bg-yellow-100 text-yellow-800">
                            Outdated
                          </Badge>
                        )}
                        {tech.has_security_issues && (
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
