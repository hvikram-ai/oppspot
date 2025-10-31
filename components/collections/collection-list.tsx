/**
 * CollectionList Component
 * Display and manage user's collections
 */

'use client';

import { useState } from 'react';
import {
  Folder,
  MoreVertical,
  Edit2,
  Archive,
  Share2,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  useCollections,
  useRenameCollection,
  useArchiveCollection,
  useRestoreCollection,
} from '@/lib/collections/collection-hooks';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

interface CollectionListProps {
  showArchived?: boolean;
  onShareCollection?: (collectionId: string) => void;
}

export function CollectionList({
  showArchived = false,
  onShareCollection,
}: CollectionListProps) {
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameCollectionId, setRenameCollectionId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);

  const { toast } = useToast();
  const { owned, shared, isLoading, refetch } = useCollections(showArchived);
  const renameCollection = useRenameCollection();
  const archiveCollection = useArchiveCollection();
  const restoreCollection = useRestoreCollection();

  const handleRename = (collectionId: string, currentName: string) => {
    setRenameCollectionId(collectionId);
    setNewName(currentName);
    setRenameDialogOpen(true);
  };

  const handleRenameSubmit = async () => {
    if (!renameCollectionId || !newName.trim()) return;

    setIsRenaming(true);
    try {
      await renameCollection(renameCollectionId, newName);
      toast({
        title: 'Collection renamed',
        description: `Collection renamed to "${newName}"`,
      });
      setRenameDialogOpen(false);
    } catch (error) {
      toast({
        title: 'Failed to rename',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsRenaming(false);
    }
  };

  const handleArchive = async (collectionId: string, collectionName: string) => {
    if (!confirm(`Archive "${collectionName}"? You can restore it later.`)) return;

    try {
      await archiveCollection(collectionId);
      toast({
        title: 'Collection archived',
        description: `"${collectionName}" has been archived`,
      });
    } catch (error) {
      toast({
        title: 'Failed to archive',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive',
      });
    }
  };

  const handleRestore = async (collectionId: string, collectionName: string) => {
    try {
      await restoreCollection(collectionId);
      toast({
        title: 'Collection restored',
        description: `"${collectionName}" has been restored`,
      });
    } catch (error) {
      toast({
        title: 'Failed to restore',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-5 w-32 bg-muted rounded" />
              <div className="h-4 w-48 bg-muted rounded mt-2" />
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  }

  const collections = owned;
  const noCollections = collections.length === 0 && shared.length === 0;

  if (noCollections) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Collections Yet</CardTitle>
          <CardDescription>
            Create your first collection to start organizing your work
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-8">
        {/* My Collections */}
        {collections.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-4">My Collections</h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {collections.map((collection) => (
                <Card key={collection.id} className="group hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <Folder className="h-5 w-5 mt-0.5 flex-shrink-0 text-primary" />
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base truncate">
                            {collection.name}
                          </CardTitle>
                          {collection.is_system && (
                            <Badge variant="secondary" className="mt-1">
                              Default
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Actions menu */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {!collection.is_system && (
                            <>
                              <DropdownMenuItem
                                onClick={() => handleRename(collection.id, collection.name)}
                                className="gap-2"
                              >
                                <Edit2 className="h-4 w-4" />
                                Rename
                              </DropdownMenuItem>
                              {onShareCollection && (
                                <DropdownMenuItem
                                  onClick={() => onShareCollection(collection.id)}
                                  className="gap-2"
                                >
                                  <Share2 className="h-4 w-4" />
                                  Share
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                            </>
                          )}
                          {collection.archived_at ? (
                            <DropdownMenuItem
                              onClick={() => handleRestore(collection.id, collection.name)}
                              className="gap-2"
                            >
                              <RefreshCw className="h-4 w-4" />
                              Restore
                            </DropdownMenuItem>
                          ) : (
                            !collection.is_system && (
                              <DropdownMenuItem
                                onClick={() => handleArchive(collection.id, collection.name)}
                                className="gap-2 text-destructive"
                              >
                                <Archive className="h-4 w-4" />
                                Archive
                              </DropdownMenuItem>
                            )
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <CardDescription className="flex items-center justify-between mt-2">
                      <span className="flex items-center gap-1">
                        <Badge variant="outline">{collection.item_count} items</Badge>
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(collection.created_at), {
                          addSuffix: true,
                        })}
                      </span>
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Shared Collections */}
        {shared.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-4">Shared with Me</h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {shared.map((collection) => (
                <Card key={collection.id} className="group hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start gap-3">
                      <Folder className="h-5 w-5 mt-0.5 flex-shrink-0 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base truncate flex items-center gap-2">
                          {collection.name}
                          <Badge variant="outline" className="text-xs">
                            {collection.permission_level}
                          </Badge>
                        </CardTitle>
                        {collection.owner_email && (
                          <p className="text-xs text-muted-foreground mt-1">
                            by {collection.owner_email}
                          </p>
                        )}
                      </div>
                    </div>

                    <CardDescription className="flex items-center gap-2 mt-2">
                      <Badge variant="outline">{collection.item_count} items</Badge>
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Rename Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Collection</DialogTitle>
            <DialogDescription>
              Choose a new name for your collection
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="collection-name">Collection Name</Label>
            <Input
              id="collection-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Enter collection name"
              className="mt-2"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRenameSubmit();
              }}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRenameDialogOpen(false)}
              disabled={isRenaming}
            >
              Cancel
            </Button>
            <Button onClick={handleRenameSubmit} disabled={isRenaming || !newName.trim()}>
              {isRenaming ? 'Renaming...' : 'Rename'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
