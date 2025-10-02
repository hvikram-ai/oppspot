/**
 * Daily Opportunity Scan Function
 * Runs all OpportunityBot agents daily at scheduled time
 */

import { inngest } from '@/lib/inngest/client'
import { createClient } from '@/lib/supabase/server'

export const dailyOpportunityScanFunction = inngest.createFunction(
  {
    id: 'daily-opportunity-scan',
    name: 'Daily Opportunity Scan',
  },
  // Run daily at 9am UTC
  { cron: '0 9 * * *' },
  async ({ event, step }) => {
    // Step 1: Find all active OpportunityBot agents
    const agents = await step.run('fetch-agents', async () => {
      const supabase = await createClient()
      const { data, error } = await supabase
        .from('ai_agents')
        .select('*')
        .eq('agent_type', 'opportunity_bot')
        .eq('is_active', true)

      if (error) {
        throw new Error(`Failed to fetch agents: ${error.message}`)
      }

      return data || []
    })

    console.log(`[Daily Scan] Found ${agents.length} OpportunityBot agents to run`)

    // Step 2: Execute each agent
    const results = []

    for (const agent of agents) {
      const result = await step.run(`execute-${agent.id}`, async () => {
        // Send event to execute agent
        await inngest.send({
          name: 'agent.execute',
          data: {
            agentId: agent.id,
            orgId: agent.org_id
          }
        })

        return { agentId: agent.id, name: agent.name, triggered: true }
      })

      results.push(result)
    }

    return {
      totalAgents: agents.length,
      results
    }
  }
)
