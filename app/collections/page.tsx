/**
 * Collections Management Page
 * Allows users to manage their collections
 */

'use client';

import { useState } from 'react';
import { Plus, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  CollectionList,
  CollectionShareDialog,
} from '@/components/collections';
import { useCreateCollection, useArchivedCollections } from '@/lib/collections/collection-hooks';

export default function CollectionsPage() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [selectedCollectionName, setSelectedCollectionName] = useState<string>('');
  const [newCollectionName, setNewCollectionName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const { toast } = useToast();
  const createCollection = useCreateCollection();
  const { archived } = useArchivedCollections();

  const handleCreateCollection = async () => {
    if (!newCollectionName.trim()) return;

    setIsCreating(true);
    try {
      await createCollection(newCollectionName);
      toast({
        title: 'Collection created',
        description: `"${newCollectionName}" has been created successfully`,
      });
      setNewCollectionName('');
      setCreateDialogOpen(false);
    } catch (error) {
      toast({
        title: 'Failed to create collection',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleShareCollection = (collectionId: string) => {
    const collection = [...archived].find((c: { id: string }) => c.id === collectionId);
    setSelectedCollectionId(collectionId);
    setSelectedCollectionName(collection?.name || 'Collection');
    setShareDialogOpen(true);
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Collections</h1>
          <p className="text-muted-foreground mt-2">
            Organize your work products into collections for easy access and sharing
          </p>
        </div>
        <Button
          onClick={() => setCreateDialogOpen(true)}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          New Collection
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="active" className="space-y-6">
        <TabsList>
          <TabsTrigger value="active">Active Collections</TabsTrigger>
          <TabsTrigger value="archived" className="gap-2">
            <Archive className="h-4 w-4" />
            Archived ({archived.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          <CollectionList
            showArchived={false}
            onShareCollection={handleShareCollection}
          />
        </TabsContent>

        <TabsContent value="archived" className="space-y-4">
          <CollectionList
            showArchived={true}
            onShareCollection={handleShareCollection}
          />
        </TabsContent>
      </Tabs>

      {/* Create Collection Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Collection</DialogTitle>
            <DialogDescription>
              Give your collection a name to help organize your work
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="collection-name">Collection Name</Label>
            <Input
              id="collection-name"
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
              placeholder="e.g., Q4 Pipeline, Competitor Research"
              className="mt-2"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateCollection();
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateCollection}
              disabled={isCreating || !newCollectionName.trim()}
            >
              {isCreating ? 'Creating...' : 'Create Collection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share Collection Dialog */}
      <CollectionShareDialog
        collectionId={selectedCollectionId}
        collectionName={selectedCollectionName}
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
      />
    </div>
  );
}
