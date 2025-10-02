/**
 * Execute Agent Function
 * Runs an AI agent in the background
 */

import { inngest } from '@/lib/inngest/client'
import { createClient } from '@/lib/supabase/server'
import { createScoutAgent } from '@/lib/ai/agents/scout-agent'
import { createOpportunityBot } from '@/lib/ai/agents/opportunity-bot'

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
        .single()

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
      } else {
        throw new Error(`Unknown agent type: ${agent.agent_type}`)
      }
    })

    // Step 3: Send notifications if configured
    if (result.success && result.output.signals?.length > 0) {
      await step.run('send-notifications', async () => {
        // TODO: Send email/Slack notifications
        console.log(`[Inngest] Agent ${agent.name} found ${result.output.signals.length} signals`)
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
