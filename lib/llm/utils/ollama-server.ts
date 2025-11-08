/**
 * Ollama Server Utilities
 *
 * Functions to manage the Ollama server lifecycle:
 * - Check if Ollama is installed
 * - Check if Ollama server is running
 * - Start Ollama server
 * - Stop Ollama server
 */

import { exec, spawn } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface OllamaServerStatus {
  installed: boolean;
  running: boolean;
  version?: string;
  endpoint: string;
  models: string[];
  error?: string;
}

/**
 * Check if Ollama is installed on the system
 */
export async function isOllamaInstalled(): Promise<{ installed: boolean; version?: string; path?: string }> {
  try {
    const { stdout } = await execAsync('which ollama');
    const ollamaPath = stdout.trim();

    if (ollamaPath) {
      try {
        const { stdout: versionOutput } = await execAsync('ollama --version');
        const version = versionOutput.trim();
        return { installed: true, version, path: ollamaPath };
      } catch {
        return { installed: true, path: ollamaPath };
      }
    }

    return { installed: false };
  } catch {
    // Try Windows path
    try {
      const { stdout } = await execAsync('where ollama', { shell: 'powershell.exe' });
      const ollamaPath = stdout.trim();
      if (ollamaPath) {
        return { installed: true, path: ollamaPath };
      }
    } catch {
      // Not found on Windows either
    }

    return { installed: false };
  }
}

/**
 * Check if Ollama server is running
 */
export async function isOllamaRunning(endpoint = 'http://localhost:11434'): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(`${endpoint}/api/tags`, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeout);
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Get list of installed Ollama models
 */
export async function getOllamaModels(endpoint = 'http://localhost:11434'): Promise<string[]> {
  try {
    const response = await fetch(`${endpoint}/api/tags`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return (data.models || []).map((m: { name: string }) => m.name);
  } catch {
    return [];
  }
}

/**
 * Start Ollama server
 */
export async function startOllamaServer(): Promise<{ success: boolean; message: string; pid?: number }> {
  try {
    // Check if already running
    const running = await isOllamaRunning();
    if (running) {
      return {
        success: true,
        message: 'Ollama server is already running',
      };
    }

    // Check if installed
    const { installed, path } = await isOllamaInstalled();
    if (!installed) {
      return {
        success: false,
        message: 'Ollama is not installed. Please install it from https://ollama.ai',
      };
    }

    // Start the server in the background
    const child = spawn('ollama', ['serve'], {
      detached: true,
      stdio: 'ignore',
    });

    child.unref();

    // Wait a bit for the server to start
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verify it's running
    const nowRunning = await isOllamaRunning();
    if (nowRunning) {
      return {
        success: true,
        message: 'Ollama server started successfully',
        pid: child.pid,
      };
    } else {
      return {
        success: false,
        message: 'Ollama server failed to start. Please start it manually with: ollama serve',
      };
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to start Ollama server',
    };
  }
}

/**
 * Stop Ollama server (if running)
 */
export async function stopOllamaServer(): Promise<{ success: boolean; message: string }> {
  try {
    // Check if running
    const running = await isOllamaRunning();
    if (!running) {
      return {
        success: true,
        message: 'Ollama server is not running',
      };
    }

    // Find and kill the ollama serve process
    try {
      // Unix/Linux/Mac
      await execAsync('pkill -f "ollama serve"');
    } catch {
      try {
        // Windows
        await execAsync('taskkill /IM ollama.exe /F', { shell: 'powershell.exe' });
      } catch {
        return {
          success: false,
          message: 'Failed to stop Ollama server. Please stop it manually.',
        };
      }
    }

    // Wait a bit for the server to stop
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verify it's stopped
    const stillRunning = await isOllamaRunning();
    if (!stillRunning) {
      return {
        success: true,
        message: 'Ollama server stopped successfully',
      };
    } else {
      return {
        success: false,
        message: 'Ollama server may still be running. Please stop it manually.',
      };
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to stop Ollama server',
    };
  }
}

/**
 * Get comprehensive Ollama server status
 */
export async function getOllamaStatus(endpoint = 'http://localhost:11434'): Promise<OllamaServerStatus> {
  const installed = await isOllamaInstalled();
  const running = await isOllamaRunning(endpoint);

  if (!installed.installed) {
    return {
      installed: false,
      running: false,
      endpoint,
      models: [],
      error: 'Ollama is not installed',
    };
  }

  if (!running) {
    return {
      installed: true,
      running: false,
      version: installed.version,
      endpoint,
      models: [],
    };
  }

  const models = await getOllamaModels(endpoint);

  return {
    installed: true,
    running: true,
    version: installed.version,
    endpoint,
    models,
  };
}
