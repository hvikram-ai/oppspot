/**
 * Command Executor
 * Executes voice commands and returns results
 */

import type { VoiceCommand } from './voice-command-service'

export interface ExecutionResult {
  success: boolean
  message: string
  data?: any
  error?: string
}

export class CommandExecutor {
  /**
   * Execute a parsed voice command
   */
  async execute(command: VoiceCommand): Promise<ExecutionResult> {
    console.log('[CommandExecutor] Executing:', command.intent, command.parameters)

    try {
      switch (command.intent) {
        case 'navigate':
          return await this.handleNavigation(command.parameters)

        case 'search':
          return await this.handleSearch(command.parameters)

        case 'query':
          return await this.handleQuery(command.parameters)

        case 'action':
          return await this.handleAction(command.parameters)

        default:
          return {
            success: false,
            message: `I'm not sure how to handle that command. Try: "Go to dashboard" or "Search for tech companies"`,
            error: 'unknown_intent'
          }
      }
    } catch (error) {
      console.error('[CommandExecutor] Execution error:', error)
      return {
        success: false,
        message: 'Sorry, I encountered an error executing that command.',
        error: error instanceof Error ? error.message : 'unknown_error'
      }
    }
  }

  /**
   * Handle navigation commands
   */
  private async handleNavigation(params: Record<string, any>): Promise<ExecutionResult> {
    const page = params.page as string

    const routes: Record<string, string> = {
      'dashboard': '/dashboard',
      'streams': '/streams',
      'search': '/search',
      'map': '/map',
      'settings': '/settings'
    }

    const route = routes[page]
    if (!route) {
      return {
        success: false,
        message: `I don't know how to navigate to "${page}"`
      }
    }

    // Navigate using window.location
    if (typeof window !== 'undefined') {
      window.location.href = route
    }

    return {
      success: true,
      message: `Opening ${page}`,
      data: { route }
    }
  }

  /**
   * Handle search commands
   */
  private async handleSearch(params: Record<string, any>): Promise<ExecutionResult> {
    // Build search query
    const queryParts: string[] = []

    if (params.industry) queryParts.push(params.industry)
    if (params.type) queryParts.push(params.type)
    if (params.location) queryParts.push(`in ${params.location}`)

    const query = queryParts.join(' ')

    if (!query) {
      return {
        success: false,
        message: "I didn't catch what you wanted to search for. Try: 'Find tech companies in London'"
      }
    }

    // Navigate to search with query
    if (typeof window !== 'undefined') {
      const searchUrl = `/search?q=${encodeURIComponent(query)}`
      window.location.href = searchUrl
    }

    return {
      success: true,
      message: `Searching for ${query}`,
      data: { query, params }
    }
  }

  /**
   * Handle query commands
   */
  private async handleQuery(params: Record<string, any>): Promise<ExecutionResult> {
    // TODO: Integrate with ChatSpot or analytics API
    return {
      success: true,
      message: 'Let me check that for you...',
      data: params
    }
  }

  /**
   * Handle action commands
   */
  private async handleAction(params: Record<string, any>): Promise<ExecutionResult> {
    // TODO: Implement actions (add to list, send email, etc.)
    return {
      success: true,
      message: 'Action not yet implemented',
      data: params
    }
  }
}

export const commandExecutor = new CommandExecutor()
