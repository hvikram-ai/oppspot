/**
 * Voice Command Service
 * Handles voice recognition, command parsing, and speech synthesis
 */

import { create } from 'zustand'

// Speech Recognition types for browser APIs
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
  resultIndex: number
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
  message: string
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  lang: string
  start(): void
  stop(): void
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
  onstart: (() => void) | null
}

declare global {
  interface Window {
    webkitSpeechRecognition: new () => SpeechRecognition
    SpeechRecognition: new () => SpeechRecognition
  }
}

export interface VoiceCommand {
  transcript: string
  intent: string
  confidence: number
  parameters: Record<string, unknown>
  timestamp: Date
}

export interface VoiceState {
  isListening: boolean
  isProcessing: boolean
  currentTranscript: string
  lastCommand: VoiceCommand | null
  error: string | null
}

// Zustand store for voice state
export const useVoiceStore = create<VoiceState>()((set) => ({
  isListening: false,
  isProcessing: false,
  currentTranscript: '',
  lastCommand: null,
  error: null
}))

export class VoiceCommandService {
  private recognition: SpeechRecognition | null = null
  private synthesis: SpeechSynthesis | null = null
  private isListening: boolean = false
  private commandCallbacks: Set<(command: VoiceCommand) => void> = new Set()

  constructor() {
    // Initialize Speech Recognition
    if (typeof window !== 'undefined') {
      if ('webkitSpeechRecognition' in window) {
        this.recognition = new window.webkitSpeechRecognition()
        this.setupRecognition()
      } else if ('SpeechRecognition' in window) {
        this.recognition = new window.SpeechRecognition()
        this.setupRecognition()
      }

      // Initialize Speech Synthesis
      if ('speechSynthesis' in window) {
        this.synthesis = window.speechSynthesis
      }
    }
  }

  /**
   * Setup speech recognition configuration
   */
  private setupRecognition(): void {
    if (!this.recognition) return

    this.recognition.continuous = false       // Stop after each result
    this.recognition.interimResults = true    // Show partial results
    this.recognition.maxAlternatives = 3      // Get multiple interpretations
    this.recognition.lang = 'en-GB'           // Default language

    // Handle results
    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      const results = event.results
      const last = results.length - 1
      const transcript = results[last][0].transcript
      const confidence = results[last][0].confidence
      const isFinal = results[last].isFinal

      // Update interim transcript
      useVoiceStore.setState({ currentTranscript: transcript })

      // Process final result
      if (isFinal) {
        this.processCommand(transcript, confidence)
      }
    }

    // Handle errors
    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('[VoiceCommand] Recognition error:', event.error)
      useVoiceStore.setState({
        error: this.getErrorMessage(event.error),
        isListening: false
      })
      this.isListening = false
    }

    // Handle end
    this.recognition.onend = () => {
      useVoiceStore.setState({ isListening: false })
      this.isListening = false
    }

    // Handle start
    this.recognition.onstart = () => {
      useVoiceStore.setState({
        isListening: true,
        error: null,
        currentTranscript: ''
      })
      this.isListening = true
    }
  }

  /**
   * Start listening for voice commands
   */
  startListening(): void {
    if (!this.recognition) {
      console.error('[VoiceCommand] Speech recognition not supported')
      useVoiceStore.setState({
        error: 'Voice commands are not supported in this browser'
      })
      return
    }

    if (this.isListening) {
      console.warn('[VoiceCommand] Already listening')
      return
    }

    try {
      this.recognition.start()
      console.log('[VoiceCommand] Started listening')
    } catch (error) {
      console.error('[VoiceCommand] Failed to start:', error)
      useVoiceStore.setState({ error: 'Failed to start voice recognition' })
    }
  }

  /**
   * Stop listening
   */
  stopListening(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop()
      console.log('[VoiceCommand] Stopped listening')
    }
  }

  /**
   * Process voice command
   */
  private async processCommand(transcript: string, confidence: number): Promise<void> {
    useVoiceStore.setState({ isProcessing: true })

    try {
      // Parse command
      const command = await this.parseCommand(transcript, confidence)

      // Update store
      useVoiceStore.setState({
        lastCommand: command,
        isProcessing: false,
        currentTranscript: ''
      })

      // Execute callbacks
      this.commandCallbacks.forEach(callback => callback(command))

      // Log command
      await this.logCommand(command)

    } catch (error) {
      console.error('[VoiceCommand] Processing error:', error)
      useVoiceStore.setState({
        error: 'Failed to process command',
        isProcessing: false
      })
    }
  }

  /**
   * Parse voice command into intent and parameters
   */
  private async parseCommand(
    transcript: string,
    confidence: number
  ): Promise<VoiceCommand> {
    const normalized = transcript.toLowerCase().trim()

    // Try pattern matching first (fast path)
    const patternMatch = this.matchPattern(normalized)

    if (patternMatch) {
      return {
        transcript,
        intent: patternMatch.intent,
        confidence,
        parameters: patternMatch.parameters,
        timestamp: new Date()
      }
    }

    // Fall back to NLU (slow path, uses API)
    return await this.parseWithNLU(transcript, confidence)
  }

  /**
   * Match command against predefined patterns
   */
  private matchPattern(text: string): {
    intent: string;
    parameters: Record<string, unknown>
  } | null {
    // Navigation patterns
    if (/go to|open|show me (the )?(dashboard|streams|search|map|settings)/.test(text)) {
      const match = text.match(/(dashboard|streams|search|map|settings)/)
      return {
        intent: 'navigate',
        parameters: { page: match?.[1] || 'dashboard' }
      }
    }

    // Search patterns
    if (/find|search|show me|looking for/.test(text)) {
      const params: Record<string, unknown> = {}

      // Extract industry
      const industryMatch = text.match(/(tech|fintech|healthcare|retail|manufacturing|saas)/i)
      if (industryMatch) params.industry = industryMatch[1]

      // Extract location
      const locationMatch = text.match(/in ([a-z\s]+?)(?:\s|$)/i)
      if (locationMatch) params.location = locationMatch[1].trim()

      // Extract company type
      const companyMatch = text.match(/(companies|businesses|firms|startups)/i)
      if (companyMatch) params.type = companyMatch[1]

      return {
        intent: 'search',
        parameters: params
      }
    }

    // Query patterns
    if (/how many|what (are|is)|show me/.test(text)) {
      return {
        intent: 'query',
        parameters: { query: text }
      }
    }

    // Action patterns
    if (/add to|remove from|send|export/.test(text)) {
      return {
        intent: 'action',
        parameters: { action: text }
      }
    }

    return null
  }

  /**
   * Parse command using NLU (GPT-4)
   */
  private async parseWithNLU(
    transcript: string,
    confidence: number
  ): Promise<VoiceCommand> {
    try {
      const response = await fetch('/api/voice/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ transcript })
      })

      const data = await response.json()

      return {
        transcript,
        intent: data.intent,
        confidence,
        parameters: data.parameters,
        timestamp: new Date()
      }
    } catch (error) {
      console.error('[VoiceCommand] NLU parsing failed:', error)

      // Fall back to generic command
      return {
        transcript,
        intent: 'unknown',
        confidence,
        parameters: {},
        timestamp: new Date()
      }
    }
  }

  /**
   * Speak text using TTS
   */
  speak(text: string, options?: {
    rate?: number
    pitch?: number
    volume?: number
    voice?: string
  }): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.synthesis) {
        console.error('[VoiceCommand] Speech synthesis not supported')
        reject(new Error('Speech synthesis not supported'))
        return
      }

      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'en-GB'
      utterance.rate = options?.rate || 1.0
      utterance.pitch = options?.pitch || 1.0
      utterance.volume = options?.volume || 1.0

      // Select voice
      if (options?.voice) {
        const voices = this.synthesis.getVoices()
        const selectedVoice = voices.find(v => v.name === options.voice)
        if (selectedVoice) utterance.voice = selectedVoice
      }

      utterance.onend = () => resolve()
      utterance.onerror = (error) => reject(error)

      this.synthesis.speak(utterance)
    })
  }

  /**
   * Register command callback
   */
  onCommand(callback: (command: VoiceCommand) => void): () => void {
    this.commandCallbacks.add(callback)
    return () => this.commandCallbacks.delete(callback)
  }

  /**
   * Log command to database
   */
  private async logCommand(command: VoiceCommand): Promise<void> {
    try {
      await fetch('/api/voice/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          transcript: command.transcript,
          intent: command.intent,
          confidence: command.confidence,
          parameters: command.parameters,
          pageUrl: window.location.href
        })
      })
    } catch (error) {
      // Logging errors should not break the experience
      console.error('[VoiceCommand] Failed to log command:', error)
    }
  }

  /**
   * Get user-friendly error message
   */
  private getErrorMessage(error: string): string {
    const messages: Record<string, string> = {
      'no-speech': 'No speech detected. Please try again.',
      'audio-capture': 'Microphone not available.',
      'not-allowed': 'Microphone permission denied.',
      'network': 'Network error. Please check your connection.',
      'aborted': 'Voice command cancelled.'
    }
    return messages[error] || 'Voice recognition error'
  }

  /**
   * Get available voices
   */
  getVoices(): SpeechSynthesisVoice[] {
    if (!this.synthesis) return []
    return this.synthesis.getVoices()
  }

  /**
   * Check if voice commands are supported
   */
  isSupported(): boolean {
    return !!this.recognition && !!this.synthesis
  }
}

// Export singleton
export const voiceCommandService = new VoiceCommandService()
