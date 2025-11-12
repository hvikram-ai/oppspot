/**
 * Tech Stack Analysis Trigger API Route
 * POST - Trigger AI analysis of technologies
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { TechStackRepository } from '@/lib/data-room/repository/tech-stack-repository';
import { TechnologyDetector } from '@/lib/data-room/tech-stack/technology-detector';
import { EvidenceExtractor } from '@/lib/data-room/tech-stack/evidence-extractor';
import { RiskAssessor } from '@/lib/data-room/tech-stack/risk-assessor';
import { FindingsGenerator } from '@/lib/data-room/tech-stack/findings-generator';
import { TechStackEmailTemplates } from '@/lib/data-room/tech-stack/email-templates';
import { NotificationService } from '@/lib/notifications/notification-service';
import { TechStackTechnology } from '@/lib/data-room/types';

// Validation schema
const TriggerAnalysisSchema = z.object({
  document_ids: z.array(z.string().uuid()).optional(),
  force_reanalysis: z.boolean().optional(),
});

/**
 * POST /api/tech-stack/analyses/[id]/analyze
 * Trigger AI technology detection and analysis
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now();

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request
    const body = await req.json();
    const validated = TriggerAnalysisSchema.parse(body);

    const repository = new TechStackRepository(supabase);

    // Get existing analysis
    const analysis = await repository.getAnalysis(params.id);

    // Verify user has access to data room (editor or owner)
    const { data: dataRoom } = await supabase
      .from('data_rooms')
      .select('id, user_id')
      .eq('id', analysis.data_room_id)
      .single();

    if (!dataRoom) {
      return NextResponse.json({ error: 'Data room not found' }, { status: 404 });
    }

    const isOwner = dataRoom.user_id === user.id;

    if (!isOwner) {
      const { data: access } = await supabase
        .from('data_room_access')
        .select('permission_level')
        .eq('data_room_id', analysis.data_room_id)
        .eq('user_id', user.id)
        .is('revoked_at', null)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (!access || !['owner', 'editor'].includes(access.permission_level)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Check if already analyzing
    if (analysis.status === 'analyzing' && !validated.force_reanalysis) {
      return NextResponse.json(
        { error: 'Analysis already in progress' },
        { status: 409 }
      );
    }

    // Update status to analyzing
    await repository.updateAnalysisStatus(params.id, 'analyzing');

    // Get documents from data room
    let documentsQuery = supabase
      .from('documents')
      .select('id, filename, data_room_id')
      .eq('data_room_id', analysis.data_room_id)
      .eq('processing_status', 'complete');

    if (validated.document_ids && validated.document_ids.length > 0) {
      documentsQuery = documentsQuery.in('id', validated.document_ids);
    }

    const { data: documents } = await documentsQuery;

    if (!documents || documents.length === 0) {
      await repository.updateAnalysisStatus(
        params.id,
        'failed',
        'No processed documents found in data room'
      );
      return NextResponse.json(
        { error: 'No processed documents found. Please upload and process documents first.' },
        { status: 400 }
      );
    }

    // Get document chunks (text content)
    const documentTexts = await Promise.all(
      documents.map(async (doc) => {
        const { data: chunks } = await supabase
          .from('document_chunks')
          .select('content, chunk_index')
          .eq('document_id', doc.id)
          .order('chunk_index', { ascending: true })
          .limit(20); // Limit to first 20 chunks per document

        const text = chunks?.map((c) => c.content).join('\n\n') || '';

        return {
          id: doc.id,
          filename: doc.filename,
          text,
        };
      })
    );

    // Initialize services
    const detector = new TechnologyDetector();
    const evidenceExtractor = new EvidenceExtractor(supabase);
    const riskAssessor = new RiskAssessor();
    const findingsGenerator = new FindingsGenerator();

    // Analyze documents for technologies
    const documentAnalyses = await detector.analyzeDocuments(documentTexts);

    // Aggregate all detected technologies
    const allTechnologies = new Map<string, any>();

    for (const docAnalysis of documentAnalyses) {
      for (const tech of docAnalysis.technologies) {
        const key = `${tech.name.toLowerCase()}_${tech.category}`;

        if (!allTechnologies.has(key)) {
          // New technology
          allTechnologies.set(key, {
            ...tech,
            source_document_id: docAnalysis.document_id,
            documents_found: [docAnalysis.document_filename],
          });
        } else {
          // Already detected, update confidence if higher
          const existing = allTechnologies.get(key);
          if (tech.confidence_score > existing.confidence_score) {
            allTechnologies.set(key, {
              ...existing,
              confidence_score: tech.confidence_score,
              ai_reasoning: tech.ai_reasoning,
              excerpt_text: tech.excerpt_text,
            });
          }
          existing.documents_found.push(docAnalysis.document_filename);
        }
      }
    }

    // Save technologies to database
    const savedTechnologies: TechStackTechnology[] = [];

    for (const tech of allTechnologies.values()) {
      const saved = await repository.addTechnology({
        analysis_id: params.id,
        name: tech.name,
        category: tech.category,
        version: tech.version,
        authenticity: tech.authenticity,
        confidence_score: tech.confidence_score,
        risk_score: tech.risk_score,
        license_type: tech.license_type,
        manual_note: `Detected in: ${tech.documents_found.join(', ')}`,
      });

      savedTechnologies.push(saved);
    }

    // Calculate overall AI authenticity
    const allDocumentAnalyses = documentAnalyses.map((da) => ({
      wrapper_indicators: da.wrapper_indicators,
      proprietary_indicators: da.proprietary_indicators,
    }));

    const overallAuthenticity = detector.classifyAIAuthenticity(
      Array.from(allTechnologies.values()),
      allDocumentAnalyses[0]?.wrapper_indicators || {
        is_likely_wrapper: false,
        confidence: 0,
      },
      allDocumentAnalyses[0]?.proprietary_indicators || {
        is_likely_proprietary: false,
        confidence: 0,
      }
    );

    const aiAuthenticityScore = detector.calculateAIAuthenticityScore(
      Array.from(allTechnologies.values()),
      overallAuthenticity,
      allDocumentAnalyses[0]?.proprietary_indicators || { confidence: 0 }
    );

    // Assess risks
    const riskAssessment = riskAssessor.assessTechnologies(savedTechnologies);
    const modernizationScore = riskAssessor.calculateModernizationScore(savedTechnologies);
    const technicalDebtScore = riskAssessor.calculateTechnicalDebtScore(
      savedTechnologies,
      riskAssessment
    );

    // Generate findings
    const generatedFindings = findingsGenerator.generateFindings(
      savedTechnologies,
      riskAssessment
    );

    // Save findings
    for (const finding of generatedFindings) {
      await repository.createFinding(
        findingsGenerator.toCreateRequest(finding, params.id)
      );
    }

    // Update analysis with final results
    const analysisTime = Date.now() - startTime;

    await supabase
      .from('tech_stack_analyses')
      .update({
        status: 'completed',
        ai_model: 'anthropic/claude-3.5-sonnet',
        analysis_time_ms: analysisTime,
        documents_analyzed: documents.length,
        last_analyzed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id);

    // Note: Database triggers will automatically calculate and update:
    // - technologies_identified count
    // - risk_level
    // - category counts (frontend_count, backend_count, etc.)
    // These are handled by the calculate_tech_stack_scores() function

    // Log activity
    await supabase.from('activity_logs').insert({
      data_room_id: analysis.data_room_id,
      actor_id: user.id,
      actor_name: user.user_metadata?.name || 'Unknown',
      actor_email: user.email || '',
      action: 'analyze_tech_stack',
      details: {
        analysis_id: params.id,
        technologies_found: savedTechnologies.length,
        findings_generated: generatedFindings.length,
        documents_analyzed: documents.length,
        analysis_time_ms: analysisTime,
      },
      ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
      user_agent: req.headers.get('user-agent'),
    });

    // Get updated analysis with all details
    const finalAnalysis = await repository.getAnalysisWithDetails(params.id);

    // Send completion email notification (async, don't block response)
    try {
      const notificationService = new NotificationService();
      const { data: dataRoom } = await supabase
        .from('data_rooms')
        .select('name')
        .eq('id', analysis.data_room_id)
        .single();

      const emailTemplate = TechStackEmailTemplates.analysisCompleted({
        userName: user.user_metadata?.name || user.email || 'User',
        analysisTitle: analysis.title,
        dataRoomName: dataRoom?.name || 'Data Room',
        technologiesFound: savedTechnologies.length,
        riskLevel: finalAnalysis.risk_level,
        modernizationScore: finalAnalysis.modernization_score,
        aiAuthenticityScore: finalAnalysis.ai_authenticity_score,
        criticalFindings: finalAnalysis.critical_findings_count || 0,
        actionUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://oppspot-one.vercel.app'}/data-room/${analysis.data_room_id}/tech-stack/${params.id}`,
      });

      // Send notification (in-app + email)
      await notificationService.sendNotification({
        userId: user.id,
        type: 'tech_stack.analysis_complete',
        title: 'Tech Stack Analysis Complete',
        body: `${analysis.title} analysis completed with ${savedTechnologies.length} technologies found`,
        priority: finalAnalysis.critical_findings_count > 0 ? 'high' : 'medium',
        actionUrl: `/data-room/${analysis.data_room_id}/tech-stack/${params.id}`,
        data: {
          analysis_id: params.id,
          technologies_found: savedTechnologies.length,
          risk_level: finalAnalysis.risk_level,
        },
      });
    } catch (notificationError) {
      console.error('[Tech Stack API] Failed to send notification:', notificationError);
      // Don't fail the request if notification fails
    }

    return NextResponse.json({
      success: true,
      data: finalAnalysis,
      summary: {
        technologies_found: savedTechnologies.length,
        findings_generated: generatedFindings.length,
        documents_analyzed: documents.length,
        analysis_time_ms: analysisTime,
        risk_assessment: {
          overall_risk_level: riskAssessment.overall_risk_level,
          risk_score: riskAssessment.risk_score,
          critical_risks: riskAssessment.critical_risks,
          high_risks: riskAssessment.high_risks,
        },
      },
    });
  } catch (error) {
    console.error('[Tech Stack API] Analyze error:', error);

    // Update status to failed
    try {
      const supabase = await createClient();
      const repository = new TechStackRepository(supabase);
      await repository.updateAnalysisStatus(
        params.id,
        'failed',
        (error as Error).message
      );

      // Send failure email notification (async, don't block response)
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const analysis = await repository.getAnalysis(params.id);
          const { data: dataRoom } = await supabase
            .from('data_rooms')
            .select('name')
            .eq('id', analysis.data_room_id)
            .single();

          const notificationService = new NotificationService();

          // Send notification (in-app + email)
          await notificationService.sendNotification({
            userId: user.id,
            type: 'tech_stack.analysis_failed',
            title: 'Tech Stack Analysis Failed',
            body: `${analysis.title} analysis failed: ${(error as Error).message}`,
            priority: 'high',
            actionUrl: `/data-room/${analysis.data_room_id}/tech-stack/${params.id}`,
            data: {
              analysis_id: params.id,
              error_message: (error as Error).message,
            },
          });
        }
      } catch (notificationError) {
        console.error('[Tech Stack API] Failed to send failure notification:', notificationError);
      }
    } catch (updateError) {
      console.error('[Tech Stack API] Failed to update status:', updateError);
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    if ((error as Error).message.includes('not found')) {
      return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
    }

    return NextResponse.json(
      { error: 'Internal server error', message: (error as Error).message },
      { status: 500 }
    );
  }
}
