/**
 * React Hooks for Collections
 * Data fetching and mutations for collection operations
 */

'use client';

import useSWR, { mutate } from 'swr';
import { useCallback, useEffect } from 'react';
import { useCollectionStore } from '@/lib/stores/collection-store';
import type {
  Collection,
  ListCollectionsResponse,
  StreamItemWithDetails,
  StreamAccessWithDetails,
  WorkProductType,
  PermissionLevel,
} from './types';

// ============================================================================
// Fetcher Function
// ============================================================================

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Failed to fetch' }));
    throw new Error(error.error || 'Failed to fetch');
  }
  return res.json();
};

// ============================================================================
// Collections List Hooks
// ============================================================================

/**
 * Fetch user's collections (owned + shared)
 */
export function useCollections(includeArchived = false) {
  const setOwnedCollections = useCollectionStore((state) => state.setOwnedCollections);
  const setSharedCollections = useCollectionStore((state) => state.setSharedCollections);

  const url = `/api/collections${includeArchived ? '?include_archived=true' : ''}`;
  const { data, error, isLoading, mutate: refetch } = useSWR<ListCollectionsResponse>(
    url,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 5000, // 5 seconds
    }
  );

  // Sync with Zustand store
  useEffect(() => {
    if (data) {
      setOwnedCollections(data.owned);
      setSharedCollections(data.shared);
    }
  }, [data, setOwnedCollections, setSharedCollections]);

  return {
    owned: data?.owned || [],
    shared: data?.shared || [],
    isLoading,
    error,
    refetch,
  };
}

/**
 * Fetch archived collections
 */
export function useArchivedCollections() {
  const { data, error, isLoading, mutate: refetch } = useSWR<{ archived: Collection[] }>(
    '/api/collections/archive',
    fetcher,
    {
      revalidateOnFocus: false,
    }
  );

  return {
    archived: data?.archived || [],
    isLoading,
    error,
    refetch,
  };
}

/**
 * Fetch single collection details
 */
export function useCollection(collectionId: string | null) {
  const shouldFetch = !!collectionId;
  const { data, error, isLoading, mutate: refetch } = useSWR<Collection>(
    shouldFetch ? `/api/collections/${collectionId}` : null,
    fetcher
  );

  return {
    collection: data || null,
    isLoading,
    error,
    refetch,
  };
}

// ============================================================================
// Active Collection Hooks
// ============================================================================

/**
 * Get and set active collection
 */
export function useActiveCollection() {
  const activeCollectionId = useCollectionStore((state) => state.activeCollectionId);
  const setActiveCollection = useCollectionStore((state) => state.setActiveCollection);

  const { data, error, isLoading, mutate: refetch } = useSWR<{ collection: Collection }>(
    '/api/collections/active',
    fetcher,
    {
      revalidateOnFocus: false,
      onSuccess: (data) => {
        if (data?.collection?.id && data.collection.id !== activeCollectionId) {
          setActiveCollection(data.collection.id);
        }
      },
    }
  );

  const setActive = useCallback(
    async (collectionId: string) => {
      try {
        const res = await fetch('/api/collections/active', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ collection_id: collectionId }),
        });

        if (!res.ok) {
          throw new Error('Failed to set active collection');
        }

        const data = await res.json();
        setActiveCollection(collectionId);
        refetch();
        return data;
      } catch (error) {
        console.error('Error setting active collection:', error);
        throw error;
      }
    },
    [setActiveCollection, refetch]
  );

  return {
    activeCollection: data?.collection || null,
    activeCollectionId: activeCollectionId || data?.collection?.id || null,
    setActive,
    isLoading,
    error,
    refetch,
  };
}

// ============================================================================
// Collection Items Hooks
// ============================================================================

/**
 * Fetch items in a collection
 */
export function useCollectionItems(
  collectionId: string | null,
  options?: { limit?: number; offset?: number }
) {
  const limit = options?.limit || 50;
  const offset = options?.offset || 0;

  const shouldFetch = !!collectionId;
  const url = shouldFetch
    ? `/api/collections/${collectionId}/items?limit=${limit}&offset=${offset}`
    : null;

  const { data, error, isLoading, mutate: refetch } = useSWR<{
    items: StreamItemWithDetails[];
    total: number;
  }>(url, fetcher);

  return {
    items: data?.items || [],
    total: data?.total || 0,
    isLoading,
    error,
    refetch,
  };
}

// ============================================================================
// Collection Access Hooks
// ============================================================================

/**
 * Fetch access grants for a collection
 */
export function useCollectionAccess(collectionId: string | null) {
  const shouldFetch = !!collectionId;
  const { data, error, isLoading, mutate: refetch } = useSWR<{
    grants: StreamAccessWithDetails[];
  }>(
    shouldFetch ? `/api/collections/${collectionId}/access` : null,
    fetcher
  );

  return {
    grants: data?.grants || [],
    isLoading,
    error,
    refetch,
  };
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Create new collection
 */
export function useCreateCollection() {
  const addCollection = useCollectionStore((state) => state.addCollection);

  return useCallback(
    async (name: string) => {
      try {
        const res = await fetch('/api/collections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        });

        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || 'Failed to create collection');
        }

        const collection = await res.json();
        addCollection(collection);

        // Revalidate collections list
        mutate('/api/collections');

        return collection;
      } catch (error) {
        console.error('Error creating collection:', error);
        throw error;
      }
    },
    [addCollection]
  );
}

/**
 * Rename collection
 */
export function useRenameCollection() {
  const updateCollection = useCollectionStore((state) => state.updateCollection);

  return useCallback(
    async (collectionId: string, newName: string) => {
      try {
        const res = await fetch(`/api/collections/${collectionId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newName }),
        });

        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || 'Failed to rename collection');
        }

        const updated = await res.json();
        updateCollection(collectionId, { name: newName });

        // Revalidate
        mutate('/api/collections');
        mutate(`/api/collections/${collectionId}`);

        return updated;
      } catch (error) {
        console.error('Error renaming collection:', error);
        throw error;
      }
    },
    [updateCollection]
  );
}

/**
 * Archive collection
 */
export function useArchiveCollection() {
  const removeCollection = useCollectionStore((state) => state.removeCollection);

  return useCallback(
    async (collectionId: string) => {
      try {
        const res = await fetch(`/api/collections/${collectionId}`, {
          method: 'DELETE',
        });

        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || 'Failed to archive collection');
        }

        removeCollection(collectionId);

        // Revalidate
        mutate('/api/collections');
        mutate('/api/collections/archive');

        return true;
      } catch (error) {
        console.error('Error archiving collection:', error);
        throw error;
      }
    },
    [removeCollection]
  );
}

/**
 * Restore archived collection
 */
export function useRestoreCollection() {
  const addCollection = useCollectionStore((state) => state.addCollection);

  return useCallback(
    async (collectionId: string) => {
      try {
        const res = await fetch(`/api/collections/${collectionId}/restore`, {
          method: 'POST',
        });

        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || 'Failed to restore collection');
        }

        const collection = await res.json();
        addCollection(collection);

        // Revalidate
        mutate('/api/collections');
        mutate('/api/collections/archive');

        return collection;
      } catch (error) {
        console.error('Error restoring collection:', error);
        throw error;
      }
    },
    [addCollection]
  );
}

/**
 * Add item to collection
 */
export function useSaveToCollection() {
  const activeCollectionId = useCollectionStore((state) => state.activeCollectionId);
  const addSaveOperation = useCollectionStore((state) => state.addSaveOperation);
  const updateSaveOperation = useCollectionStore((state) => state.updateSaveOperation);

  return useCallback(
    async (
      itemType: WorkProductType,
      itemId: string,
      collectionId?: string
    ) => {
      const targetCollectionId = collectionId || activeCollectionId;

      if (!targetCollectionId) {
        throw new Error('No collection selected');
      }

      // Track operation
      addSaveOperation({
        itemId,
        itemType,
        collectionId: targetCollectionId,
        status: 'pending',
      });

      try {
        const res = await fetch(`/api/collections/${targetCollectionId}/items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ item_type: itemType, item_id: itemId }),
        });

        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || 'Failed to save item');
        }

        const item = await res.json();

        updateSaveOperation(itemId, { status: 'success' });

        // Revalidate collection items
        mutate(`/api/collections/${targetCollectionId}/items`);
        mutate(`/api/collections/${targetCollectionId}`);

        return item;
      } catch (error) {
        updateSaveOperation(itemId, {
          status: 'error',
          error: error instanceof Error ? error.message : 'Failed to save',
        });
        console.error('Error saving to collection:', error);
        throw error;
      }
    },
    [activeCollectionId, addSaveOperation, updateSaveOperation]
  );
}

/**
 * Remove item from collection
 */
export function useRemoveFromCollection() {
  return useCallback(
    async (collectionId: string, itemId: string) => {
      try {
        const res = await fetch(`/api/collections/${collectionId}/items/${itemId}`, {
          method: 'DELETE',
        });

        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || 'Failed to remove item');
        }

        // Revalidate
        mutate(`/api/collections/${collectionId}/items`);
        mutate(`/api/collections/${collectionId}`);

        return true;
      } catch (error) {
        console.error('Error removing from collection:', error);
        throw error;
      }
    },
    []
  );
}

/**
 * Move item to different collection
 */
export function useMoveItem() {
  return useCallback(
    async (fromCollectionId: string, itemId: string, toCollectionId: string) => {
      try {
        const res = await fetch(`/api/collections/${fromCollectionId}/items/${itemId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ target_collection_id: toCollectionId }),
        });

        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || 'Failed to move item');
        }

        // Revalidate both collections
        mutate(`/api/collections/${fromCollectionId}/items`);
        mutate(`/api/collections/${fromCollectionId}`);
        mutate(`/api/collections/${toCollectionId}/items`);
        mutate(`/api/collections/${toCollectionId}`);

        return true;
      } catch (error) {
        console.error('Error moving item:', error);
        throw error;
      }
    },
    []
  );
}

/**
 * Grant access to collection
 */
export function useGrantAccess() {
  return useCallback(
    async (
      collectionId: string,
      userId: string,
      permissionLevel: PermissionLevel
    ) => {
      try {
        const res = await fetch(`/api/collections/${collectionId}/access`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: userId, permission_level: permissionLevel }),
        });

        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || 'Failed to grant access');
        }

        const grant = await res.json();

        // Revalidate access list
        mutate(`/api/collections/${collectionId}/access`);

        return grant;
      } catch (error) {
        console.error('Error granting access:', error);
        throw error;
      }
    },
    []
  );
}

/**
 * Revoke access to collection
 */
export function useRevokeAccess() {
  return useCallback(
    async (collectionId: string, accessId: string) => {
      try {
        const res = await fetch(`/api/collections/${collectionId}/access/${accessId}`, {
          method: 'DELETE',
        });

        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || 'Failed to revoke access');
        }

        // Revalidate access list
        mutate(`/api/collections/${collectionId}/access`);

        return true;
      } catch (error) {
        console.error('Error revoking access:', error);
        throw error;
      }
    },
    []
  );
}

/**
 * Update permission level
 */
export function useUpdatePermission() {
  return useCallback(
    async (
      collectionId: string,
      accessId: string,
      permissionLevel: PermissionLevel
    ) => {
      try {
        const res = await fetch(`/api/collections/${collectionId}/access/${accessId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ permission_level: permissionLevel }),
        });

        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || 'Failed to update permission');
        }

        const updated = await res.json();

        // Revalidate access list
        mutate(`/api/collections/${collectionId}/access`);

        return updated;
      } catch (error) {
        console.error('Error updating permission:', error);
        throw error;
      }
    },
    []
  );
}
