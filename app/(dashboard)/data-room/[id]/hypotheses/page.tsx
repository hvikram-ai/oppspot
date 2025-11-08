'use client';

/**
 * Data Room Hypotheses Page
 * List and manage hypotheses for a data room
 */

import React, { useState } from 'react';
import { use } from 'react';
import { HypothesisList } from '@/components/data-room/hypothesis/hypothesis-list';
import { HypothesisEditor } from '@/components/data-room/hypothesis/hypothesis-editor';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

export default function HypothesesPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const dataRoomId = resolvedParams.id;
  const router = useRouter();
  const { toast } = useToast();

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingHypothesisId, setEditingHypothesisId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleCreateNew = () => {
    setEditingHypothesisId(null);
    setEditorOpen(true);
  };

  const handleEdit = (id: string) => {
    setEditingHypothesisId(id);
    setEditorOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this hypothesis? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/data-room/hypotheses/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Success',
          description: 'Hypothesis deleted successfully',
        });
        // Refresh the list
        setRefreshKey((prev) => prev + 1);
      } else {
        throw new Error(data.error || 'Failed to delete hypothesis');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete hypothesis',
        variant: 'destructive',
      });
    }
  };

  const handleAnalyze = (id: string) => {
    // Navigate to detail page with analysis tab
    router.push(`/data-room/${dataRoomId}/hypotheses/${id}?tab=analysis`);
  };

  const handleEditorSuccess = () => {
    // Refresh the list
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="container mx-auto py-8 max-w-7xl">
      <HypothesisList
        key={refreshKey}
        dataRoomId={dataRoomId}
        onCreateNew={handleCreateNew}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onAnalyze={handleAnalyze}
      />

      <HypothesisEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        dataRoomId={dataRoomId}
        hypothesisId={editingHypothesisId}
        onSuccess={handleEditorSuccess}
      />
    </div>
  );
}
