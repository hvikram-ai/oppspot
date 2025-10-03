/**
 * Agent System Initialization
 * Initialize and start the agent task runner
 */

import { startTaskRunner } from './agent-task-runner'

let isInitialized = false

/**
 * Initialize the agent system
 * Should be called once when the application starts
 */
export async function initializeAgentSystem() {
  if (isInitialized) {
    console.log('[Agent System] Already initialized')
    return
  }

  console.log('[Agent System] Initializing...')

  try {
    // Start the task runner
    await startTaskRunner()

    isInitialized = true
    console.log('[Agent System] ✅ Initialization complete')
  } catch (error) {
    console.error('[Agent System] ❌ Initialization failed:', error)
    throw error
  }
}

/**
 * Check if agent system is initialized
 */
export function isAgentSystemInitialized(): boolean {
  return isInitialized
}
