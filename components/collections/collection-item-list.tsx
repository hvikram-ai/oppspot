/**
 * CollectionItemList Component
 * Display items within a collection
 */

'use client';

import { useState } from 'react';
import {
  FileText,
  Building2,
  User,
  List,
  Lightbulb,
  Search,
  Trash2,
  Move,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  useCollectionItems,
  useCollections,
  useRemoveFromCollection,
  useMoveItem,
} from '@/lib/collections/collection-hooks';
import type { StreamItemWithDetails, WorkProductType } from '@/lib/collections/types';
import { formatDistanceToNow } from 'date-fns';

interface CollectionItemListProps {
  collectionId: string;
  canEdit?: boolean;
}

// Icon mapping for work product types
const getItemIcon = (itemType: WorkProductType) => {
  switch (itemType) {
    case 'business':
      return Building2;
    case 'report':
      return FileText;
    case 'contact':
      return User;
    case 'list':
      return List;
    case 'insight':
      return Lightbulb;
    case 'query':
      return Search;
    default:
      return FileText;
  }
};

// Get label for work product type
const getItemTypeLabel = (itemType: WorkProductType) => {
  const labels: Record<WorkProductType, string> = {
    business: 'Business',
    report: 'Report',
    contact: 'Contact',
    list: 'List',
    insight: 'Insight',
    query: 'Search Query',
  };
  return labels[itemType];
};

export function CollectionItemList({
  collectionId,
  canEdit = true,
}: CollectionItemListProps) {
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const { toast } = useToast();

  const { items, isLoading, refetch } = useCollectionItems(collectionId);
  const { owned } = useCollections();
  const removeFromCollection = useRemoveFromCollection();
  const moveItem = useMoveItem();

  const handleRemove = async (itemId: string, itemTitle?: string) => {
    if (!confirm(`Remove "${itemTitle || 'this item'}" from collection?`)) return;

    try {
      await removeFromCollection(collectionId, itemId);
      toast({
        title: 'Item removed',
        description: 'Item has been removed from the collection',
      });
    } catch (error) {
      toast({
        title: 'Failed to remove',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive',
      });
    }
  };

  const handleMove = async (itemId: string, targetCollectionId: string) => {
    const targetCollection = owned.find((c) => c.id === targetCollectionId);

    try {
      await moveItem(collectionId, itemId, targetCollectionId);
      toast({
        title: 'Item moved',
        description: `Moved to ${targetCollection?.name || 'collection'}`,
      });
    } catch (error) {
      toast({
        title: 'Failed to move',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-5 w-48 bg-muted rounded" />
              <div className="h-4 w-32 bg-muted rounded mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">
            No items in this collection yet
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Use the Save button to add items from across the app
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const Icon = getItemIcon(item.item_type);
        const typeLabel = getItemTypeLabel(item.item_type);

        return (
          <Card
            key={item.id}
            className="group hover:shadow-md transition-shadow"
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                {/* Item info */}
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="mt-1">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium truncate">
                        {item.item_title || `${typeLabel} #${item.item_id.slice(0, 8)}`}
                      </h4>
                      <Badge variant="secondary" className="text-xs">
                        {typeLabel}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>
                        Added {formatDistanceToNow(new Date(item.added_at), { addSuffix: true })}
                      </span>
                      {item.added_by_name && (
                        <>
                          <span>•</span>
                          <span>by {item.added_by_name}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                {canEdit && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Move className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel className="text-xs">
                        Move to Collection
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {owned
                        .filter((c) => c.id !== collectionId)
                        .map((collection) => (
                          <DropdownMenuItem
                            key={collection.id}
                            onClick={() => handleMove(item.id, collection.id)}
                            className="gap-2"
                          >
                            {collection.name}
                          </DropdownMenuItem>
                        ))}
                      {owned.filter((c) => c.id !== collectionId).length === 0 && (
                        <DropdownMenuItem disabled>
                          No other collections
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleRemove(item.id, item.item_title)}
                        className="gap-2 text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                        Remove
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
