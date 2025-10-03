/**
 * Next.js Instrumentation
 * Runs once when the server starts
 * Used to initialize the agent task runner
 */

export async function register() {
  // Only run on server
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('[Instrumentation] Initializing server-side services...')

    try {
      // Import and initialize agent system
      const { initializeAgentSystem } = await import('./lib/agents/init')
      await initializeAgentSystem()

      console.log('[Instrumentation] ✅ Agent system initialized')
    } catch (error) {
      console.error('[Instrumentation] ❌ Failed to initialize agent system:', error)
      // Don't throw - allow app to start even if agent system fails
    }
  }
}
