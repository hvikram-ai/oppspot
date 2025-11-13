'use client';

/**
 * Data Room Valuations Page
 *
 * Lists all valuation models for a data room
 * Allows creating new valuations and viewing existing ones
 */

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, Loader2, DollarSign } from 'lucide-react';
import { ValuationCard } from '@/components/data-room/valuation/valuation-card';
import { ValuationBuilder } from '@/components/data-room/valuation/valuation-builder';
import { toast } from 'sonner';
import type { ValuationModelWithStats } from '@/lib/data-room/valuation/types';

export default function ValuationsPage() {
  const params = useParams();
  const router = useRouter();
  const dataRoomId = params.id as string;

  const [valuations, setValuations] = useState<ValuationModelWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBuilder, setShowBuilder] = useState(false);
  const [availableDocuments, setAvailableDocuments] = useState<Array<{ id: string; filename: string }>>([]);

  // Fetch valuations
  useEffect(() => {
    fetchValuations();
    fetchDocuments();
  }, [dataRoomId]);

  const fetchValuations = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/data-room/valuations?data_room_id=${dataRoomId}`);

      if (!response.ok) {
        throw new Error('Failed to fetch valuations');
      }

      const data = await response.json();
      setValuations(data.valuations || []);
    } catch (error) {
      console.error('Fetch valuations error:', error);
      toast.error('Failed to load valuations');
    } finally {
      setLoading(false);
    }
  };

  const fetchDocuments = async () => {
    try {
      const response = await fetch(`/api/data-room/${dataRoomId}/documents`);

      if (response.ok) {
        const data = await response.json();
        setAvailableDocuments(
          (data.documents || []).map((doc: any) => ({
            id: doc.id,
            filename: doc.filename,
          }))
        );
      }
    } catch (error) {
      console.error('Fetch documents error:', error);
    }
  };

  const handleView = (valuationId: string) => {
    router.push(`/data-room/${dataRoomId}/valuations/${valuationId}`);
  };

  const handleRecalculate = async (valuationId: string) => {
    try {
      const response = await fetch(`/api/data-room/valuations/${valuationId}/calculate`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to recalculate');
      }

      toast.success('Valuation recalculated');
      fetchValuations();
    } catch (error) {
      toast.error('Failed to recalculate valuation');
    }
  };

  const handleExport = (valuationId: string) => {
    // TODO: Implement PDF export
    toast.info('PDF export coming soon');
  };

  const handleDelete = async (valuationId: string) => {
    if (!confirm('Are you sure you want to delete this valuation?')) {
      return;
    }

    try {
      const response = await fetch(`/api/data-room/valuations/${valuationId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete');
      }

      toast.success('Valuation deleted');
      fetchValuations();
    } catch (error) {
      toast.error('Failed to delete valuation');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Valuations</h1>
          <p className="text-muted-foreground mt-1">
            AI-powered SaaS company valuations using revenue multiples and comparables
          </p>
        </div>
        <Button onClick={() => setShowBuilder(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Valuation
        </Button>
      </div>

      {/* Valuations Grid */}
      {valuations.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
              <DollarSign className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">No valuations yet</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Create your first valuation to get started
              </p>
            </div>
            <Button onClick={() => setShowBuilder(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Valuation
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {valuations.map((valuation) => (
            <ValuationCard
              key={valuation.id}
              valuation={valuation}
              onView={() => handleView(valuation.id)}
              onRecalculate={() => handleRecalculate(valuation.id)}
              onExport={() => handleExport(valuation.id)}
              onDelete={() => handleDelete(valuation.id)}
            />
          ))}
        </div>
      )}

      {/* Valuation Builder Modal */}
      <ValuationBuilder
        dataRoomId={dataRoomId}
        open={showBuilder}
        onClose={() => setShowBuilder(false)}
        onSuccess={(valuationId) => {
          fetchValuations();
          handleView(valuationId);
        }}
        availableDocuments={availableDocuments}
      />
    </div>
  );
}
