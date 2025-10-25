/**
 * Execute Agent Function
 * Runs an AI agent in the background
 */

import { inngest } from '@/lib/inngest/client'
import { createClient } from '@/lib/supabase/server'
import { createScoutAgent } from '@/lib/ai/agents/scout-agent'
import { createOpportunityBot } from '@/lib/ai/agents/opportunity-bot'
import { createLinkedInScraperAgent } from '@/lib/ai/agents/linkedin-scraper-agent'
import { createWebsiteAnalyzerAgent } from '@/lib/ai/agents/website-analyzer-agent'
import type { Row } from '@/lib/supabase/helpers'

export const executeAgentFunction = inngest.createFunction(
  {
    id: 'execute-agent',
    name: 'Execute AI Agent',
    retries: 2,
  },
  { event: 'agent.execute' },
  async ({ event, step }) => {
    const { agentId, orgId, input = {} } = event.data

    // Step 1: Fetch agent configuration
    const agent = await step.run('fetch-agent', async () => {
      const supabase = await createClient()
      const { data, error } = await supabase
        .from('ai_agents')
        .select('*')
        .eq('id', agentId)
        .single() as { data: Row<'ai_agents'> | null; error: any }

      if (error || !data) {
        throw new Error(`Agent not found: ${agentId}`)
      }

      if (!data.is_active) {
        throw new Error(`Agent is inactive: ${agentId}`)
      }

      return data
    })

    // Step 2: Execute agent based on type
    const result = await step.run('execute-agent', async () => {
      console.log(`[Inngest] Executing ${agent.agent_type} agent: ${agent.name}`)

      if (agent.agent_type === 'scout_agent') {
        const scoutAgent = await createScoutAgent(agentId)
        return await scoutAgent.run(input)
      } else if (agent.agent_type === 'opportunity_bot') {
        const opportunityBot = await createOpportunityBot(agentId)
        return await opportunityBot.run(input)
      } else if (agent.agent_type === 'linkedin_scraper_agent') {
        const linkedInAgent = await createLinkedInScraperAgent(agentId)
        return await linkedInAgent.run(input)
      } else if (agent.agent_type === 'website_analyzer_agent') {
        const websiteAgent = await createWebsiteAnalyzerAgent(agentId)
        return await websiteAgent.run(input)
      } else if (agent.agent_type === 'research_gpt') {
        // ResearchGPT runs on-demand per company, not as background agent
        console.log('[Inngest] ResearchGPT is an on-demand agent, not suitable for scheduled runs')
        return {
          success: true,
          output: { message: 'ResearchGPT is an on-demand agent. Use it from the research page.' },
          metrics: { durationMs: 0, itemsProcessed: 0, apiCalls: 0, tokensUsed: 0, cost: 0 }
        }
      } else if (agent.agent_type === 'scoring_agent') {
        // Scoring agent would re-score all companies
        console.log('[Inngest] Scoring agent execution not yet fully implemented')
        return {
          success: true,
          output: { message: 'Scoring agent execution coming soon!' },
          metrics: { durationMs: 0, itemsProcessed: 0, apiCalls: 0, tokensUsed: 0, cost: 0 }
        }
      } else {
        throw new Error(`Unknown agent type: ${agent.agent_type}`)
      }
    })

    // Step 3: Send notifications if configured
    if (result.success && result.output.signals?.length > 0) {
      await step.run('send-notifications', async () => {
        // TODO: Send email/Slack notifications
        console.log(`[Inngest] Agent ${agent.name} found ${(result.output.signals as any).length} signals`)
      })
    }

    // Step 4: Schedule next run if recurring
    if (agent.schedule_cron) {
      await step.run('schedule-next-run', async () => {
        const supabase = await createClient()

        // Calculate next run time (simplified)
        const nextRun = new Date()
        nextRun.setDate(nextRun.getDate() + 1) // Daily for now

        await supabase
          .from('ai_agents')
          .update({ next_run_at: nextRun.toISOString() })
          .eq('id', agentId)
      })
    }

    return {
      agentId,
      agentType: agent.agent_type,
      success: result.success,
      metrics: result.metrics,
      output: result.output
    }
  }
)
