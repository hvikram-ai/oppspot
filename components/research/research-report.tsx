'use client';

/**
 * Research Report Component
 *
 * Main container for displaying complete research report
 * Shows all 6 sections with tabs/accordion navigation
 */

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, RefreshCw, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ResearchReportProps {
  report: {
    id: string;
    company_name: string;
    status: string;
    confidence_score: number;
    generated_at: string;
    cached_until: string;
    sections: {
      snapshot?: Record<string, unknown>;
      buying_signals?: Record<string, unknown>;
      decision_makers?: Record<string, unknown>;
      revenue_signals?: Record<string, unknown>;
      recommended_approach?: Record<string, unknown>;
      sources?: Record<string, unknown>;
    };
    sources: Array<{
      url: string;
      title: string;
      domain: string;
      reliability_score: number;
      source_type: string;
    }>;
  };
  onRefresh?: () => void;
  onExport?: () => void;
}

export function ResearchReport({ report, onRefresh, onExport }: ResearchReportProps) {
  const [activeTab, setActiveTab] = useState('overview');

  const confidenceColor = report.confidence_score >= 0.7
    ? 'text-green-600'
    : report.confidence_score >= 0.5
    ? 'text-yellow-600'
    : 'text-red-600';

  const cacheAge = report.generated_at
    ? formatDistanceToNow(new Date(report.generated_at), { addSuffix: true })
    : 'Unknown';

  return (
    <div className="space-y-6" data-testid="research-report">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">{report.company_name}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Research Report
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {onRefresh && (
            <Button variant="outline" size="sm" onClick={onRefresh} className="h-9">
              <RefreshCw className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          )}
          {onExport && (
            <Button variant="outline" size="sm" onClick={onExport} className="h-9">
              <Download className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Export PDF</span>
            </Button>
          )}
        </div>
      </div>

      {/* Metadata */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4 overflow-x-auto">
            <div className="flex-shrink-0">
              <p className="text-xs text-muted-foreground">Confidence Score</p>
              <p className={`text-lg font-semibold ${confidenceColor}`} data-testid="confidence-score">
                {(report.confidence_score * 100).toFixed(0)}%
              </p>
            </div>
            <div className="border-l pl-3 sm:pl-4 flex-shrink-0">
              <p className="text-xs text-muted-foreground">Sources</p>
              <p className="text-lg font-semibold">{report.sources.length}</p>
            </div>
            <div className="border-l pl-3 sm:pl-4 flex-shrink-0">
              <p className="text-xs text-muted-foreground">Generated</p>
              <p className="text-sm flex items-center gap-1" data-testid="cache-indicator">
                <Clock className="h-3 w-3" />
                <span className="whitespace-nowrap">{cacheAge}</span>
              </p>
            </div>
          </div>
          <Badge variant="outline" className="text-xs whitespace-nowrap self-start sm:self-auto">
            Valid for {formatDistanceToNow(new Date(report.cached_until))}
          </Badge>
        </div>
      </Card>

      {/* Sections Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="overflow-x-auto pb-2 md:pb-0">
          <TabsList className="inline-flex md:grid w-auto md:w-full grid-cols-6 min-w-max md:min-w-0">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="signals">Signals</TabsTrigger>
            <TabsTrigger value="contacts">Contacts</TabsTrigger>
            <TabsTrigger value="financial">Financial</TabsTrigger>
            <TabsTrigger value="strategy">Strategy</TabsTrigger>
            <TabsTrigger value="sources">Sources</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="space-y-4">
          {report.sections.snapshot && (
            <SnapshotSection data={report.sections.snapshot} />
          )}
        </TabsContent>

        <TabsContent value="signals" className="space-y-4">
          {report.sections.buying_signals && (
            <SignalsSection data={report.sections.buying_signals} />
          )}
        </TabsContent>

        <TabsContent value="contacts" className="space-y-4">
          {report.sections.decision_makers && (
            <DecisionMakersSection data={report.sections.decision_makers} />
          )}
        </TabsContent>

        <TabsContent value="financial" className="space-y-4">
          {report.sections.revenue_signals && (
            <RevenueSection data={report.sections.revenue_signals} />
          )}
        </TabsContent>

        <TabsContent value="strategy" className="space-y-4">
          {report.sections.recommended_approach && (
            <ApproachSection data={report.sections.recommended_approach} />
          )}
        </TabsContent>

        <TabsContent value="sources" className="space-y-4">
          <SourcesSection sources={report.sources} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Section Components (simplified - full implementation would be in separate files)

interface SnapshotData {
  industry?: string
  employee_count?: string | number
  founded_year?: string | number
  company_status?: string
  description?: string
  [key: string]: unknown
}

function SnapshotSection({ data }: { data: SnapshotData }) {
  return (
    <Card className="p-6" data-testid="section-snapshot">
      <h2 className="text-xl font-semibold mb-4">Company Snapshot</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {data.industry && (
          <div>
            <p className="text-sm text-muted-foreground">Industry</p>
            <p className="font-medium">{data.industry}</p>
          </div>
        )}
        {data.employee_count && (
          <div>
            <p className="text-sm text-muted-foreground">Employees</p>
            <p className="font-medium">~{data.employee_count}</p>
          </div>
        )}
        {data.founded_year && (
          <div>
            <p className="text-sm text-muted-foreground">Founded</p>
            <p className="font-medium">{data.founded_year}</p>
          </div>
        )}
        {data.company_status && (
          <div>
            <p className="text-sm text-muted-foreground">Status</p>
            <p className="font-medium capitalize">{data.company_status}</p>
          </div>
        )}
      </div>
      {data.description && (
        <div className="mt-4">
          <p className="text-sm text-muted-foreground mb-2">Description</p>
          <p className="text-sm">{data.description}</p>
        </div>
      )}
    </Card>
  );
}

interface SignalData {
  hiring_signals?: Array<{
    title: string
    description?: string
    urgency?: string
  }>
  expansion_signals?: Array<{
    title: string
    description?: string
    urgency?: string
  }>
  leadership_changes?: Array<{
    title: string
    description?: string
    urgency?: string
  }>
  [key: string]: unknown
}

function SignalsSection({ data }: { data: SignalData }) {
  const allSignals = [
    ...(data.hiring_signals || []),
    ...(data.expansion_signals || []),
    ...(data.leadership_changes || []),
  ].slice(0, 10);

  return (
    <Card className="p-6" data-testid="section-buying-signals">
      <h2 className="text-xl font-semibold mb-4">Buying Signals</h2>
      <div className="space-y-3">
        {allSignals.map((signal, idx: number) => (
          <div key={idx} className="border-l-2 border-blue-500 pl-4 py-2">
            <div className="flex items-center justify-between">
              <p className="font-medium">{signal.title}</p>
              <Badge variant="outline" className="text-xs">
                {signal.urgency || 'medium'}
              </Badge>
            </div>
            {signal.description && (
              <p className="text-sm text-muted-foreground mt-1">
                {signal.description}
              </p>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

interface DecisionMakerData {
  key_people?: Array<{
    name: string
    job_title: string
    department?: string
    business_email?: string
  }>
  [key: string]: unknown
}

function DecisionMakersSection({ data }: { data: DecisionMakerData }) {
  const people = data.key_people || [];

  return (
    <Card className="p-6" data-testid="section-decision-makers">
      <h2 className="text-xl font-semibold mb-4">Decision Makers</h2>
      <div className="space-y-4">
        {people.slice(0, 10).map((person, idx: number) => (
          <div key={idx} className="flex items-start justify-between border-b pb-3">
            <div>
              <p className="font-medium">{person.name}</p>
              <p className="text-sm text-muted-foreground">{person.job_title}</p>
              {person.department && (
                <Badge variant="secondary" className="mt-1 text-xs">
                  {person.department}
                </Badge>
              )}
            </div>
            {person.business_email && (
              <Badge variant="outline" className="text-xs">Contactable</Badge>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

interface RevenueData {
  summary?: {
    health_score?: number
    growth_indicator?: string
    risk_level?: string
    budget_availability?: string
  }
  [key: string]: unknown
}

function RevenueSection({ data }: { data: RevenueData }) {
  const summary = data.summary || {};

  return (
    <Card className="p-6" data-testid="section-revenue-signals">
      <h2 className="text-xl font-semibold mb-4">Financial Health</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <p className="text-sm text-muted-foreground">Health Score</p>
          <p className="text-2xl font-bold">
            {((summary.health_score || 0.5) * 100).toFixed(0)}%
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Growth</p>
          <p className="text-lg font-semibold capitalize">
            {summary.growth_indicator || 'unknown'}
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Risk Level</p>
          <Badge variant={summary.risk_level === 'low' ? 'default' : 'destructive'}>
            {summary.risk_level || 'unknown'}
          </Badge>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Budget Availability</p>
          <p className="text-lg font-semibold capitalize">
            {summary.budget_availability || 'unknown'}
          </p>
        </div>
      </div>
    </Card>
  );
}

interface ApproachData {
  strategy?: string
  talking_points?: string[]
  next_steps?: string[]
  urgency_level?: string
  [key: string]: unknown
}

function ApproachSection({ data }: { data: ApproachData }) {
  return (
    <Card className="p-6" data-testid="section-recommended-approach">
      <h2 className="text-xl font-semibold mb-4">Recommended Approach</h2>

      {data.strategy && (
        <div className="mb-4">
          <h3 className="font-semibold mb-2">Strategy</h3>
          <p className="text-sm">{data.strategy}</p>
        </div>
      )}

      {data.talking_points && data.talking_points.length > 0 && (
        <div className="mb-4">
          <h3 className="font-semibold mb-2">Talking Points</h3>
          <ul className="list-disc list-inside space-y-1">
            {data.talking_points.map((point: string, idx: number) => (
              <li key={idx} className="text-sm">{point}</li>
            ))}
          </ul>
        </div>
      )}

      {data.next_steps && data.next_steps.length > 0 && (
        <div>
          <h3 className="font-semibold mb-2">Next Steps</h3>
          <ol className="list-decimal list-inside space-y-1">
            {data.next_steps.map((step: string, idx: number) => (
              <li key={idx} className="text-sm">{step}</li>
            ))}
          </ol>
        </div>
      )}

      {data.urgency_level && (
        <div className="mt-4 pt-4 border-t">
          <Badge variant={data.urgency_level === 'high' ? 'destructive' : 'default'}>
            {data.urgency_level} urgency
          </Badge>
        </div>
      )}
    </Card>
  );
}

function SourcesSection({ sources }: { sources: Array<{
  url: string;
  title: string;
  domain: string;
  reliability_score: number;
  source_type: string;
}> }) {
  return (
    <Card className="p-6" data-testid="section-sources">
      <h2 className="text-xl font-semibold mb-4">Sources ({sources.length})</h2>
      <div className="space-y-3">
        {sources.map((source, idx) => (
          <div key={idx} className="border-l-2 border-gray-300 pl-4 py-2" data-testid="source-item">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-blue-600 hover:underline"
                >
                  {source.title}
                </a>
                <p className="text-xs text-muted-foreground mt-1">
                  {source.domain} • Reliability: {(source.reliability_score * 100).toFixed(0)}%
                </p>
              </div>
              <Badge variant="outline" className="text-xs">
                {source.source_type.replace('_', ' ')}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
