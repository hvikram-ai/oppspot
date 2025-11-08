'use client';

/**
 * Hypothesis Detail Page
 * Full detail view of a single hypothesis
 */

import React, { useState } from 'react';
import { use } from 'react';
import { HypothesisDetail } from '@/components/data-room/hypothesis/hypothesis-detail';
import { HypothesisEditor } from '@/components/data-room/hypothesis/hypothesis-editor';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

export default function HypothesisDetailPage({
  params,
}: {
  params: Promise<{ id: string; hypothesisId: string }>;
}) {
  const resolvedParams = use(params);
  const dataRoomId = resolvedParams.id;
  const hypothesisId = resolvedParams.hypothesisId;
  const router = useRouter();
  const { toast } = useToast();

  const [editorOpen, setEditorOpen] = useState(false);
  const [detailKey, setDetailKey] = useState(0);

  const handleEdit = () => {
    setEditorOpen(true);
  };

  const handleDelete = async () => {
    if (
      !confirm(
        'Are you sure you want to delete this hypothesis? This action cannot be undone.'
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/data-room/hypotheses/${hypothesisId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Success',
          description: 'Hypothesis deleted successfully',
        });
        // Navigate back to list
        router.push(`/data-room/${dataRoomId}/hypotheses`);
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

  const handleAnalyze = async () => {
    toast({
      title: 'Analysis Started',
      description: 'AI is analyzing documents. This may take a few minutes.',
    });

    try {
      const response = await fetch(`/api/data-room/hypotheses/${hypothesisId}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Analysis Complete',
          description: `Found ${data.data.evidence_found || 0} pieces of evidence`,
        });
        // Refresh the detail view
        setDetailKey((prev) => prev + 1);
      } else {
        throw new Error(data.error || 'Analysis failed');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Analysis failed',
        variant: 'destructive',
      });
    }
  };

  const handleEditorSuccess = () => {
    // Refresh the detail view
    setDetailKey((prev) => prev + 1);
  };

  return (
    <div className="container mx-auto py-8 max-w-7xl">
      <HypothesisDetail
        key={detailKey}
        hypothesisId={hypothesisId}
        dataRoomId={dataRoomId}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onAnalyze={handleAnalyze}
      />

      <HypothesisEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        dataRoomId={dataRoomId}
        hypothesisId={hypothesisId}
        onSuccess={handleEditorSuccess}
      />
    </div>
  );
}
