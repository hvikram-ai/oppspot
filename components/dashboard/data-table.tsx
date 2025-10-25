'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { ReactNode } from 'react'

export interface Column<T> {
  id: string
  header: string
  accessor: keyof T | ((row: T) => ReactNode)
  className?: string
  sortable?: boolean
}

export interface DataTableProps<T> {
  title?: string
  description?: string
  columns: Column<T>[]
  data: T[]
  pageSize?: number
  currentPage?: number
  totalPages?: number
  onPageChange?: (page: number) => void
  onSort?: (column: string, direction: 'asc' | 'desc') => void
  action?: ReactNode
  emptyMessage?: string
  className?: string
}

export function DataTable<T extends Record<string, unknown>>({
  title,
  description,
  columns,
  data,
  pageSize = 10,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  onSort,
  action,
  emptyMessage = 'No data available',
  className
}: DataTableProps<T>) {
  const getCellValue = (row: T, column: Column<T>) => {
    if (typeof column.accessor === 'function') {
      return column.accessor(row)
    }
    return row[column.accessor as keyof T]
  }

  const renderPagination = () => {
    if (!onPageChange || totalPages <= 1) return null

    return (
      <div className="flex items-center justify-between px-2 py-4">
        <div className="text-sm text-muted-foreground">
          Page {currentPage} of {totalPages}
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    )
  }

  const content = (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead
                key={column.id}
                className={column.className}
                onClick={() => column.sortable && onSort?.(column.id, 'asc')}
                style={{ cursor: column.sortable ? 'pointer' : 'default' }}
              >
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="text-center py-8 text-muted-foreground">
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            data.map((row, index) => (
              <TableRow key={index}>
                {columns.map((column) => (
                  <TableCell key={column.id} className={column.className}>
                    {getCellValue(row, column) as any}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      {renderPagination()}
    </>
  )

  if (title || description) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{title}</CardTitle>
              {description && <CardDescription>{description}</CardDescription>}
            </div>
            {action}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {content}
        </CardContent>
      </Card>
    )
  }

  return <div className={className}>{content}</div>
}