'use client';

/**
 * Integration Playbook Page
 * View and manage integration playbooks for a data room
 */

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  FileText,
  Sparkles,
  Calendar,
  TrendingUp,
  CheckCircle2,
  Clock,
  Loader2,
} from 'lucide-react';
import { PlaybookGeneratorDialog, PlaybookOverview } from '@/components/data-room/integration-playbook';
import { ProtectedLayout } from '@/components/layout/protected-layout';
import type { IntegrationPlaybook, PlaybookStatus } from '@/lib/data-room/types';

export default function IntegrationPlaybookPage() {
  const params = useParams();
  const router = useRouter();
  const [playbooks, setPlaybooks] = useState<IntegrationPlaybook[]>([]);
  const [selectedPlaybookId, setSelectedPlaybookId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlaybooks();
  }, [params.id]);

  const fetchPlaybooks = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/data-room/${params.id}/integration-playbook`);
      const result = await response.json();

      if (result.success) {
        setPlaybooks(result.data);
        // Auto-select first active playbook
        if (result.data.length > 0 && !selectedPlaybookId) {
          const activePlaybook = result.data.find((p: IntegrationPlaybook) => p.status === 'active');
          setSelectedPlaybookId(activePlaybook?.id || result.data[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch playbooks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlaybookCreated = (playbookId: string) => {
    fetchPlaybooks();
    setSelectedPlaybookId(playbookId);
  };

  const statusColors: Record<PlaybookStatus, string> = {
    draft: 'bg-gray-100 text-gray-800',
    active: 'bg-green-100 text-green-800',
    completed: 'bg-blue-100 text-blue-800',
    archived: 'bg-gray-100 text-gray-600',
  };

  return (
    <ProtectedLayout>
      <div className="container mx-auto p-6 max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <Link href={`/data-rooms/${params.id}`}>
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Data Room
            </Button>
          </Link>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center">
                <FileText className="h-8 w-8 mr-3 text-blue-600" />
                Integration Playbook
              </h1>
              <p className="text-muted-foreground mt-1">
                AI-powered 100-day M&A integration planning
              </p>
            </div>
            <PlaybookGeneratorDialog
              dataRoomId={params.id as string}
              onSuccess={handlePlaybookCreated}
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-sm text-gray-500">Loading playbooks...</p>
            </div>
          </div>
        ) : playbooks.length === 0 ? (
          // Empty State
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="p-4 bg-blue-50 rounded-full mb-4">
                <Sparkles className="h-12 w-12 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No Integration Playbooks Yet</h3>
              <p className="text-sm text-gray-500 text-center max-w-md mb-6">
                Generate your first AI-powered 100-day M&A integration plan. Claude will analyze
                your documents, tech stack, and deal hypotheses to create a customized playbook.
              </p>
              <PlaybookGeneratorDialog
                dataRoomId={params.id as string}
                onSuccess={handlePlaybookCreated}
              />

              {/* Features */}
              <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl">
                <div className="text-center">
                  <div className="p-3 bg-green-50 rounded-lg inline-block mb-3">
                    <CheckCircle2 className="h-6 w-6 text-green-600" />
                  </div>
                  <h4 className="font-medium mb-1">40-50 Activities</h4>
                  <p className="text-xs text-gray-500">
                    Structured across 4 phases and 5 workstreams
                  </p>
                </div>
                <div className="text-center">
                  <div className="p-3 bg-blue-50 rounded-lg inline-block mb-3">
                    <TrendingUp className="h-6 w-6 text-blue-600" />
                  </div>
                  <h4 className="font-medium mb-1">Synergy Tracking</h4>
                  <p className="text-xs text-gray-500">
                    Cost and revenue synergies with 3-year targets
                  </p>
                </div>
                <div className="text-center">
                  <div className="p-3 bg-yellow-50 rounded-lg inline-block mb-3">
                    <Calendar className="h-6 w-6 text-yellow-600" />
                  </div>
                  <h4 className="font-medium mb-1">Day 1 Checklist</h4>
                  <p className="text-xs text-gray-500">
                    15 critical tasks for closing day
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Playbook Selector */}
            {playbooks.length > 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Your Playbooks</CardTitle>
                  <CardDescription>Select a playbook to view details</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {playbooks.map((playbook) => (
                      <button
                        key={playbook.id}
                        onClick={() => setSelectedPlaybookId(playbook.id)}
                        className={`p-4 border rounded-lg text-left hover:border-blue-500 transition-colors ${
                          selectedPlaybookId === playbook.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold truncate">{playbook.playbook_name}</h3>
                          <Badge className={statusColors[playbook.status]}>
                            {playbook.status}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span className="flex items-center">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            {playbook.completed_activities}/{playbook.total_activities}
                          </span>
                          <span className="flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            {new Date(playbook.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Selected Playbook Details */}
            {selectedPlaybookId && <PlaybookOverview playbookId={selectedPlaybookId} />}
          </div>
        )}
      </div>
    </ProtectedLayout>
  );
}
