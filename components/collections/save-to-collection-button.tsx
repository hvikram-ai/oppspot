/**
 * SaveToCollectionButton Component
 * Button to save work products to collections
 */

'use client';

import { useState } from 'react';
import { Save, Check, Loader2, FolderPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import {
  useCollections,
  useActiveCollection,
  useSaveToCollection,
} from '@/lib/collections/collection-hooks';
import type { WorkProductType } from '@/lib/collections/types';
import { cn } from '@/lib/utils';

interface SaveToCollectionButtonProps {
  itemType: WorkProductType;
  itemId: string;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  onSave?: (collectionId: string) => void;
  showLabel?: boolean;
}

export function SaveToCollectionButton({
  itemType,
  itemId,
  variant = 'outline',
  size = 'default',
  className,
  onSave,
  showLabel = true,
}: SaveToCollectionButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const { toast } = useToast();

  const { owned, shared } = useCollections();
  const { activeCollectionId, activeCollection } = useActiveCollection();
  const saveToCollection = useSaveToCollection();

  const handleQuickSave = async () => {
    if (!activeCollectionId) {
      toast({
        title: 'No collection selected',
        description: 'Please select a collection first',
        variant: 'destructive',
      });
      return;
    }

    await handleSaveToCollection(activeCollectionId);
  };

  const handleSaveToCollection = async (collectionId: string) => {
    setIsLoading(true);
    try {
      await saveToCollection(itemType, itemId, collectionId);
      setIsSaved(true);

      const collectionName =
        [...owned, ...shared].find((c) => c.id === collectionId)?.name || 'collection';

      toast({
        title: 'Saved successfully',
        description: `Added to ${collectionName}`,
      });

      onSave?.(collectionId);

      // Reset saved state after 2 seconds
      setTimeout(() => setIsSaved(false), 2000);
    } catch (error) {
      toast({
        title: 'Failed to save',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // If there are multiple collections, show dropdown
  const hasMultipleCollections = owned.length + shared.length > 1;

  if (!hasMultipleCollections) {
    // Simple button for single collection
    return (
      <Button
        variant={variant}
        size={size}
        className={cn('gap-2', className)}
        onClick={handleQuickSave}
        disabled={isLoading || isSaved}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isSaved ? (
          <Check className="h-4 w-4" />
        ) : (
          <Save className="h-4 w-4" />
        )}
        {showLabel && size !== 'icon' && (
          <span>{isSaved ? 'Saved' : 'Save'}</span>
        )}
      </Button>
    );
  }

  // Dropdown for multiple collections
  return (
    <DropdownMenu>
      <div className="flex gap-1">
        {/* Quick save to active collection */}
        <Button
          variant={variant}
          size={size}
          className={cn('gap-2', className)}
          onClick={handleQuickSave}
          disabled={isLoading || isSaved || !activeCollectionId}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isSaved ? (
            <Check className="h-4 w-4" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {showLabel && size !== 'icon' && (
            <span className="max-w-[120px] truncate">
              {isSaved
                ? 'Saved'
                : activeCollection
                ? `Save to ${activeCollection.name}`
                : 'Save'}
            </span>
          )}
        </Button>

        {/* Dropdown trigger for collection selection */}
        <DropdownMenuTrigger asChild>
          <Button
            variant={variant}
            size={size}
            className="px-2"
            disabled={isLoading}
          >
            <FolderPlus className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
      </div>

      <DropdownMenuContent align="end" className="w-[250px]">
        <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">
          Save to Collection
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* My Collections */}
        {owned.length > 0 && (
          <>
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              My Collections
            </DropdownMenuLabel>
            {owned.map((collection) => (
              <DropdownMenuItem
                key={collection.id}
                onClick={() => handleSaveToCollection(collection.id)}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                <span className="truncate">{collection.name}</span>
                {activeCollectionId === collection.id && (
                  <Check className="h-4 w-4 ml-auto text-primary" />
                )}
              </DropdownMenuItem>
            ))}
          </>
        )}

        {/* Shared Collections (only if editable) */}
        {shared.filter((c) => c.permission_level !== 'view').length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Shared with Me
            </DropdownMenuLabel>
            {shared
              .filter((c) => c.permission_level !== 'view')
              .map((collection) => (
                <DropdownMenuItem
                  key={collection.id}
                  onClick={() => handleSaveToCollection(collection.id)}
                  className="gap-2"
                >
                  <Save className="h-4 w-4" />
                  <span className="truncate">{collection.name}</span>
                  {activeCollectionId === collection.id && (
                    <Check className="h-4 w-4 ml-auto text-primary" />
                  )}
                </DropdownMenuItem>
              ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
