/**
 * Daily Signal Monitor Function
 * Runs all Scout agents daily to monitor for buying signals
 */

import { inngest } from '@/lib/inngest/client'
import { createClient } from '@/lib/supabase/server'

export const dailySignalMonitorFunction = inngest.createFunction(
  {
    id: 'daily-signal-monitor',
    name: 'Daily Buying Signal Monitor',
  },
  // Run daily at 8am UTC
  { cron: '0 8 * * *' },
  async ({ event, step }) => {
    // Step 1: Find all active Scout agents
    const agents = await step.run('fetch-scout-agents', async () => {
      const supabase = await createClient()
      const { data, error } = await supabase
        .from('ai_agents')
        .select('*')
        .eq('agent_type', 'scout_agent')
        .eq('is_active', true)

      if (error) {
        throw new Error(`Failed to fetch scout agents: ${error.message}`)
      }

      return data || []
    })

    console.log(`[Daily Monitor] Found ${agents.length} Scout agents to run`)

    // Step 2: Execute each scout agent
    const results = []

    for (const agent of agents) {
      const result = await step.run(`execute-scout-${agent.id}`, async () => {
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

    // Step 3: Clean up old signals (expired)
    await step.run('cleanup-expired-signals', async () => {
      const supabase = await createClient()

      const { error } = await supabase
        .from('buying_signals')
        // @ts-expect-error - Type inference issue
        .update({ status: 'expired' })
        .eq('status', 'active')
        .lt('expires_at', new Date().toISOString())

      if (error) {
        console.error('[Signal Monitor] Failed to cleanup signals:', error)
      }
    })

    return {
      totalAgents: agents.length,
      results
    }
  }
)
