/**
 * Bulk Selection Hook
 *
 * Manages multi-select state for alert checkboxes.
 * Provides utilities for select all, clear, and toggle selection.
 */

import { useState, useCallback, useMemo } from 'react'

export interface UseBulkSelectionOptions {
  onSelectionChange?: (selectedIds: string[]) => void
}

export function useBulkSelection<T extends { id: string }>(
  items: T[],
  options?: UseBulkSelectionOptions
) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Toggle individual item selection
  const toggleSelection = useCallback(
    (id: string) => {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        if (next.has(id)) {
          next.delete(id)
        } else {
          next.add(id)
        }
        options?.onSelectionChange?.(Array.from(next))
        return next
      })
    },
    [options]
  )

  // Select all visible items
  const selectAll = useCallback(() => {
    const allIds = new Set(items.map((item) => item.id))
    setSelectedIds(allIds)
    options?.onSelectionChange?.(Array.from(allIds))
  }, [items, options])

  // Clear all selections
  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
    options?.onSelectionChange?.([])
  }, [options])

  // Check if an item is selected
  const isSelected = useCallback(
    (id: string) => {
      return selectedIds.has(id)
    },
    [selectedIds]
  )

  // Check if all visible items are selected
  const isAllSelected = useMemo(() => {
    if (items.length === 0) return false
    return items.every((item) => selectedIds.has(item.id))
  }, [items, selectedIds])

  // Check if some (but not all) items are selected
  const isIndeterminate = useMemo(() => {
    if (items.length === 0 || selectedIds.size === 0) return false
    const selectedCount = items.filter((item) => selectedIds.has(item.id)).length
    return selectedCount > 0 && selectedCount < items.length
  }, [items, selectedIds])

  // Toggle all items
  const toggleAll = useCallback(() => {
    if (isAllSelected) {
      clearSelection()
    } else {
      selectAll()
    }
  }, [isAllSelected, clearSelection, selectAll])

  // Get selected items
  const selectedItems = useMemo(() => {
    return items.filter((item) => selectedIds.has(item.id))
  }, [items, selectedIds])

  // Get selected IDs as array
  const selectedIdsArray = useMemo(() => {
    return Array.from(selectedIds)
  }, [selectedIds])

  return {
    // State
    selectedIds: selectedIdsArray,
    selectedItems,
    selectedCount: selectedIds.size,
    isAllSelected,
    isIndeterminate,

    // Actions
    toggleSelection,
    selectAll,
    clearSelection,
    toggleAll,
    isSelected,
  }
}
