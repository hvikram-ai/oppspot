/**
 * CollectionSelector Component
 * Dropdown to select and switch active collection
 */

'use client';

import { useState } from 'react';
import { Check, ChevronDown, Folder, FolderOpen, Plus, Settings } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCollections, useActiveCollection } from '@/lib/collections/collection-hooks';
import { cn } from '@/lib/utils';

interface CollectionSelectorProps {
  onCreateCollection?: () => void;
  onManageCollections?: () => void;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  className?: string;
}

export function CollectionSelector({
  onCreateCollection,
  onManageCollections,
  variant = 'outline',
  size = 'default',
  className,
}: CollectionSelectorProps) {
  const [open, setOpen] = useState(false);
  const { owned, shared, isLoading } = useCollections();
  const { activeCollection, activeCollectionId, setActive } = useActiveCollection();

  const handleSelectCollection = async (collectionId: string) => {
    try {
      await setActive(collectionId);
      setOpen(false);
    } catch (error) {
      console.error('Failed to set active collection:', error);
    }
  };

  const activeCollectionName =
    activeCollection?.name || owned.find((c) => c.is_system)?.name || 'General';

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={cn('gap-2', className)}
          disabled={isLoading}
        >
          <FolderOpen className="h-4 w-4" />
          <span className="max-w-[150px] truncate">{activeCollectionName}</span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-[280px]">
        {/* My Collections */}
        <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">
          My Collections
        </DropdownMenuLabel>
        {owned.length === 0 ? (
          <DropdownMenuItem disabled>
            <span className="text-sm text-muted-foreground">No collections yet</span>
          </DropdownMenuItem>
        ) : (
          owned.map((collection) => (
            <DropdownMenuItem
              key={collection.id}
              onClick={() => handleSelectCollection(collection.id)}
              className="flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Folder className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{collection.name}</span>
                {collection.is_system && (
                  <Badge variant="secondary" className="text-xs">
                    Default
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {collection.item_count > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {collection.item_count}
                  </Badge>
                )}
                {activeCollectionId === collection.id && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </div>
            </DropdownMenuItem>
          ))
        )}

        {/* Shared Collections */}
        {shared.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">
              Shared with Me
            </DropdownMenuLabel>
            {shared.map((collection) => (
              <DropdownMenuItem
                key={collection.id}
                onClick={() => handleSelectCollection(collection.id)}
                className="flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Folder className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  <span className="truncate">{collection.name}</span>
                  <Badge variant="outline" className="text-xs">
                    {collection.permission_level}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {collection.item_count > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {collection.item_count}
                    </Badge>
                  )}
                  {activeCollectionId === collection.id && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </div>
              </DropdownMenuItem>
            ))}
          </>
        )}

        {/* Actions */}
        <DropdownMenuSeparator />
        {onCreateCollection && (
          <DropdownMenuItem
            onClick={() => {
              setOpen(false);
              onCreateCollection();
            }}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            <span>Create Collection</span>
          </DropdownMenuItem>
        )}
        {onManageCollections && (
          <DropdownMenuItem
            onClick={() => {
              setOpen(false);
              onManageCollections();
            }}
            className="gap-2"
          >
            <Settings className="h-4 w-4" />
            <span>Manage Collections</span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
