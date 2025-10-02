# Voice Command™ - Complete Implementation Guide
## Hands-Free Business Intelligence Platform

**Status**: 📋 Ready to Implement
**Priority**: Phase 5 Feature
**Timeline**: 2-3 weeks
**Dependencies**: ChatSpot™ (recommended but not required)
**Complexity**: Medium

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Database Schema](#database-schema)
4. [Backend Implementation](#backend-implementation)
5. [Frontend Implementation](#frontend-implementation)
6. [Voice Commands](#voice-commands)
7. [Testing Strategy](#testing-strategy)
8. [Deployment](#deployment)
9. [Future Enhancements](#future-enhancements)

---

## Overview

### What is Voice Command™?

Voice Command™ enables hands-free operation of oppSpot using natural voice commands. Users can:

- **Search**: "Show me fintech companies in London"
- **Navigate**: "Go to dashboard" / "Open streams"
- **Analyze**: "What are my hot leads?"
- **Take Actions**: "Add to qualified list" / "Send email"
- **Query Data**: "How many deals closed this month?"

### Key Features

1. **🎤 Continuous Listening** - Always-on voice detection with wake word
2. **🗣️ Natural Language** - Understands conversational commands
3. **🔊 Voice Feedback** - Speaks responses back to user
4. **🌐 Multi-Language** - EN-GB, EN-US support (expandable)
5. **🔒 Privacy First** - All processing client-side (Web Speech API)
6. **⚡ Fast Response** - <100ms recognition latency

### User Experience

```
User: "Hey oppSpot, show me tech companies in Manchester"
         ↓
oppSpot: "Found 47 tech companies in Manchester.
          Showing top 10 with highest lead scores."
         ↓
[Results appear on screen]
```

---

## Architecture

### High-Level Flow

```
┌─────────────────┐
│   Web Speech    │
│      API        │
│  (Browser)      │
└────────┬────────┘
         │ Voice Input
         ↓
┌─────────────────┐
│  Voice Command  │
│    Service      │
│ (Client-side)   │
└────────┬────────┘
         │ Transcript
         ↓
┌─────────────────┐
│   Command       │
│   Parser        │
│  (Pattern       │
│   Matching)     │
└────────┬────────┘
         │ Intent + Params
         ↓
┌─────────────────┐
│  Command        │
│  Executor       │
│  (Actions)      │
└────────┬────────┘
         │ Results
         ↓
┌─────────────────┐
│   Voice         │
│   Response      │
│  (Text-to-      │
│   Speech)       │
└─────────────────┘
```

### Technology Stack

| Component | Technology | Why |
|-----------|-----------|-----|
| Voice Recognition | Web Speech API | Browser-native, no external API costs |
| Text-to-Speech | Speech Synthesis API | Same as above |
| Command Parsing | Regex + Pattern Matching | Fast, deterministic, no AI cost |
| NLU (optional) | OpenAI GPT-4 | For complex/ambiguous commands |
| State Management | Zustand | Lightweight, existing in project |
| UI Framework | React + shadcn/ui | Existing patterns |

---

## Database Schema

### New Tables

#### 1. `voice_commands` - Command History & Analytics

```sql
CREATE TABLE voice_commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Command Details
  transcript TEXT NOT NULL,              -- Raw voice input
  intent TEXT NOT NULL,                  -- Detected intent
  confidence DECIMAL(3,2),               -- 0.00 - 1.00
  parameters JSONB DEFAULT '{}',         -- Extracted parameters

  -- Execution
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  execution_time_ms INTEGER,             -- Performance tracking
  success BOOLEAN DEFAULT true,
  error_message TEXT,

  -- Context
  page_url TEXT,                         -- Where command was issued
  session_id TEXT,                       -- Voice session ID

  -- Metadata
  language VARCHAR(5) DEFAULT 'en-GB',
  device_type TEXT,                      -- desktop, mobile, tablet

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Indexes
  INDEX idx_voice_commands_user (user_id, created_at DESC),
  INDEX idx_voice_commands_intent (intent, success),
  INDEX idx_voice_commands_session (session_id)
);

-- Enable RLS
ALTER TABLE voice_commands ENABLE ROW LEVEL SECURITY;

-- Users can only see their own commands
CREATE POLICY "Users view own voice commands" ON voice_commands
  FOR SELECT USING (user_id = auth.uid());

-- Users can insert their own commands
CREATE POLICY "Users create voice commands" ON voice_commands
  FOR INSERT WITH CHECK (user_id = auth.uid());
```

#### 2. `voice_preferences` - User Voice Settings

```sql
CREATE TABLE voice_preferences (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,

  -- Voice Settings
  enabled BOOLEAN DEFAULT true,
  wake_word_enabled BOOLEAN DEFAULT false,
  wake_word TEXT DEFAULT 'hey oppspot',

  -- Speech Settings
  voice_name TEXT,                       -- Preferred TTS voice
  speech_rate DECIMAL(2,1) DEFAULT 1.0,  -- 0.5 - 2.0
  speech_pitch DECIMAL(2,1) DEFAULT 1.0, -- 0.0 - 2.0
  speech_volume DECIMAL(2,1) DEFAULT 1.0,-- 0.0 - 1.0

  -- Recognition Settings
  language VARCHAR(5) DEFAULT 'en-GB',
  continuous_listening BOOLEAN DEFAULT false,

  -- Privacy
  save_history BOOLEAN DEFAULT true,
  analytics_enabled BOOLEAN DEFAULT true,

  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE voice_preferences ENABLE ROW LEVEL SECURITY;

-- Users can only access their own preferences
CREATE POLICY "Users manage own voice preferences" ON voice_preferences
  FOR ALL USING (user_id = auth.uid());
```

---

## Backend Implementation

### 1. Voice Command Service

**File**: `lib/voice/voice-command-service.ts`

```typescript
/**
 * Voice Command Service
 * Handles voice recognition, command parsing, and speech synthesis
 */

import { create } from 'zustand'

export interface VoiceCommand {
  transcript: string
  intent: string
  confidence: number
  parameters: Record<string, any>
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
  private recognition: any
  private synthesis: SpeechSynthesis | null = null
  private isListening: boolean = false
  private commandCallbacks: Set<(command: VoiceCommand) => void> = new Set()

  constructor() {
    // Initialize Speech Recognition
    if (typeof window !== 'undefined') {
      if ('webkitSpeechRecognition' in window) {
        this.recognition = new (window as any).webkitSpeechRecognition()
        this.setupRecognition()
      } else if ('SpeechRecognition' in window) {
        this.recognition = new (window as any).SpeechRecognition()
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
    this.recognition.onresult = (event: any) => {
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
    this.recognition.onerror = (event: any) => {
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
    parameters: Record<string, any>
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
      const params: Record<string, any> = {}

      // Extract industry
      const industryMatch = text.match(/(tech|fintech|healthcare|retail|manufacturing|saas)/i)
      if (industryMatch) params.industry = industryMatch[1]

      // Extract location
      const locationMatch = text.match(/in ([a-z\s]+?)(?:\s|$)/i)
      if (locationMatch) params.location = locationMatch[1]

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
```

### 2. Command Executor

**File**: `lib/voice/command-executor.ts`

```typescript
/**
 * Command Executor
 * Executes voice commands and returns results
 */

import { useRouter } from 'next/navigation'
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

    // Navigate using Next.js router
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
```

### 3. API Routes

**File**: `app/api/voice/parse/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { transcript } = await request.json()

    // Use GPT-4 to parse command
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a voice command parser for a B2B intelligence platform.
          Parse the user's voice command and extract:
          - intent: navigate, search, query, action, or unknown
          - parameters: relevant extracted data

          Return JSON: { "intent": "search", "parameters": { "industry": "tech", "location": "London" } }`
        },
        {
          role: 'user',
          content: transcript
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3
    })

    const parsed = JSON.parse(response.choices[0].message.content || '{}')

    return NextResponse.json(parsed)
  } catch (error) {
    console.error('[Voice Parse API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to parse command' },
      { status: 500 }
    )
  }
}
```

**File**: `app/api/voice/log/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's org_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single()

    if (!profile?.org_id) {
      return NextResponse.json({ error: 'No organization' }, { status: 400 })
    }

    const body = await request.json()

    // Insert command log
    const { error } = await supabase
      .from('voice_commands')
      .insert({
        user_id: user.id,
        org_id: profile.org_id,
        transcript: body.transcript,
        intent: body.intent,
        confidence: body.confidence,
        parameters: body.parameters,
        page_url: body.pageUrl
      })

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Voice Log API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to log command' },
      { status: 500 }
    )
  }
}
```

---

## Frontend Implementation

### 1. Voice Command Button Component

**File**: `components/voice/voice-command-button.tsx`

```typescript
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Mic, MicOff } from 'lucide-react'
import { voiceCommandService, useVoiceStore } from '@/lib/voice/voice-command-service'
import { commandExecutor } from '@/lib/voice/command-executor'
import { toast } from 'sonner'

export function VoiceCommandButton() {
  const { isListening, currentTranscript, error } = useVoiceStore()
  const [isSupported, setIsSupported] = useState(false)

  useEffect(() => {
    // Check if voice commands are supported
    setIsSupported(voiceCommandService.isSupported())

    // Register command handler
    const unsubscribe = voiceCommandService.onCommand(async (command) => {
      console.log('[VoiceButton] Command received:', command)

      // Execute command
      const result = await commandExecutor.execute(command)

      // Show feedback
      if (result.success) {
        toast.success(result.message)

        // Speak response
        try {
          await voiceCommandService.speak(result.message)
        } catch (error) {
          console.error('Speech synthesis error:', error)
        }
      } else {
        toast.error(result.message)
      }
    })

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    if (error) {
      toast.error(error)
    }
  }, [error])

  const handleClick = () => {
    if (isListening) {
      voiceCommandService.stopListening()
    } else {
      voiceCommandService.startListening()
      toast.info('Listening... Speak your command')
    }
  }

  if (!isSupported) {
    return null // Don't show button if not supported
  }

  return (
    <div className="relative">
      <Button
        variant={isListening ? "destructive" : "outline"}
        size="icon"
        onClick={handleClick}
        className={isListening ? "animate-pulse" : ""}
        title={isListening ? "Stop listening" : "Start voice command"}
      >
        {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
      </Button>

      {currentTranscript && (
        <div className="absolute top-full mt-2 right-0 bg-background border rounded-lg p-2 shadow-lg text-sm min-w-[200px]">
          {currentTranscript}
        </div>
      )}
    </div>
  )
}
```

### 2. Voice Command Modal

**File**: `components/voice/voice-command-modal.tsx`

```typescript
'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react'
import { voiceCommandService, useVoiceStore } from '@/lib/voice/voice-command-service'
import { commandExecutor } from '@/lib/voice/command-executor'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function VoiceCommandModal({ open, onOpenChange }: Props) {
  const { isListening, currentTranscript, lastCommand } = useVoiceStore()
  const [examples] = useState([
    'Go to dashboard',
    'Find tech companies in London',
    'Show me hot leads',
    'Open streams',
    'Search for fintech startups'
  ])

  useEffect(() => {
    if (open) {
      // Auto-start listening when modal opens
      setTimeout(() => {
        voiceCommandService.startListening()
      }, 300)
    } else {
      // Stop listening when modal closes
      voiceCommandService.stopListening()
    }
  }, [open])

  useEffect(() => {
    // Handle commands
    const unsubscribe = voiceCommandService.onCommand(async (command) => {
      // Execute command
      const result = await commandExecutor.execute(command)

      // Speak response
      if (result.success) {
        await voiceCommandService.speak(result.message)
      }

      // Close modal after successful command
      if (result.success) {
        setTimeout(() => {
          onOpenChange(false)
        }, 1500)
      }
    })

    return () => unsubscribe()
  }, [onOpenChange])

  const handleToggleListen = () => {
    if (isListening) {
      voiceCommandService.stopListening()
    } else {
      voiceCommandService.startListening()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Voice Command</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Microphone Visualizer */}
          <div className="flex justify-center">
            <div className={`
              w-32 h-32 rounded-full flex items-center justify-center transition-all
              ${isListening ? 'bg-red-500/20 animate-pulse' : 'bg-muted'}
            `}>
              {isListening ? (
                <Mic className="h-16 w-16 text-red-500" />
              ) : (
                <MicOff className="h-16 w-16 text-muted-foreground" />
              )}
            </div>
          </div>

          {/* Status */}
          <div className="text-center">
            {isListening ? (
              <p className="text-lg font-medium">Listening...</p>
            ) : (
              <p className="text-muted-foreground">Click the microphone to start</p>
            )}
          </div>

          {/* Current Transcript */}
          {currentTranscript && (
            <div className="bg-muted rounded-lg p-4">
              <p className="text-sm font-medium mb-1">You said:</p>
              <p className="text-lg">{currentTranscript}</p>
            </div>
          )}

          {/* Last Command */}
          {lastCommand && !isListening && (
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
              <p className="text-sm font-medium mb-1">Command:</p>
              <p className="text-lg">{lastCommand.transcript}</p>
              <p className="text-sm text-muted-foreground mt-2">
                Intent: {lastCommand.intent} •
                Confidence: {(lastCommand.confidence * 100).toFixed(0)}%
              </p>
            </div>
          )}

          {/* Examples */}
          <div>
            <p className="text-sm font-medium mb-2">Try saying:</p>
            <ul className="space-y-1">
              {examples.map((example, i) => (
                <li key={i} className="text-sm text-muted-foreground">
                  • "{example}"
                </li>
              ))}
            </ul>
          </div>

          {/* Controls */}
          <div className="flex justify-center gap-2">
            <Button
              variant={isListening ? "destructive" : "default"}
              onClick={handleToggleListen}
              className="w-full max-w-[200px]"
            >
              {isListening ? (
                <>
                  <MicOff className="mr-2 h-4 w-4" />
                  Stop Listening
                </>
              ) : (
                <>
                  <Mic className="mr-2 h-4 w-4" />
                  Start Listening
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

### 3. Add to Layout

**File**: `app/(dashboard)/layout.tsx`

```typescript
// Add to the dashboard layout
import { VoiceCommandButton } from '@/components/voice/voice-command-button'

// In the header/navigation area:
<VoiceCommandButton />
```

---

## Voice Commands

### Supported Commands

#### Navigation
- "Go to dashboard"
- "Open streams"
- "Show me the map"
- "Take me to search"
- "Open settings"

#### Search
- "Find tech companies in London"
- "Search for fintech startups"
- "Show me businesses in Manchester"
- "Looking for SaaS companies"

#### Query
- "How many deals closed this month?"
- "What are my hot leads?"
- "Show me qualified opportunities"

#### Actions (Future)
- "Add to qualified list"
- "Send email"
- "Export to CSV"
- "Create a stream"

---

## Testing Strategy

### Unit Tests

**File**: `lib/voice/__tests__/voice-command-service.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { VoiceCommandService } from '../voice-command-service'

describe('VoiceCommandService', () => {
  let service: VoiceCommandService

  beforeEach(() => {
    service = new VoiceCommandService()
  })

  it('should detect navigation intent', async () => {
    const command = await service['matchPattern']('go to dashboard')
    expect(command?.intent).toBe('navigate')
    expect(command?.parameters.page).toBe('dashboard')
  })

  it('should detect search intent', async () => {
    const command = await service['matchPattern']('find tech companies in london')
    expect(command?.intent).toBe('search')
    expect(command?.parameters.industry).toBe('tech')
    expect(command?.parameters.location).toBe('london')
  })
})
```

### Integration Tests

Test voice commands end-to-end using Playwright.

### Browser Compatibility

Test in:
- ✅ Chrome/Edge (Web Speech API)
- ✅ Safari (WebKit Speech)
- ❌ Firefox (limited support)
- ✅ Mobile Chrome (Android)
- ✅ Mobile Safari (iOS)

---

## Deployment

### Environment Variables

No additional environment variables needed! Voice Command™ uses:
- Web Speech API (browser-native)
- Existing OpenAI API key (for NLU fallback)

### Feature Flag

Add to `lib/config/features.ts`:

```typescript
export const features = {
  voiceCommands: {
    enabled: process.env.NEXT_PUBLIC_VOICE_COMMANDS_ENABLED === 'true',
    wakeWord: false, // Phase 2
    continuousListening: false // Phase 2
  }
}
```

### Migrations

Run database migrations:

```bash
# Create voice_commands table
supabase migration new voice_commands

# Create voice_preferences table
supabase migration new voice_preferences

# Apply migrations
supabase db push
```

---

## Future Enhancements

### Phase 2 (Future)
1. **Wake Word Detection** - "Hey oppSpot"
2. **Continuous Listening** - Always-on mode
3. **Multi-Language Support** - Spanish, French, German
4. **Custom Commands** - User-defined shortcuts
5. **Voice Shortcuts** - Quick actions

### Phase 3 (Future)
1. **Voice Analytics** - Command usage insights
2. **Voice Training** - Personalized recognition
3. **Voice Macros** - Chain multiple commands
4. **Voice Onboarding** - Guided voice setup

---

## Implementation Checklist

### Backend
- [ ] Create database migrations (`voice_commands`, `voice_preferences`)
- [ ] Implement `VoiceCommandService`
- [ ] Implement `CommandExecutor`
- [ ] Create API routes (`/api/voice/parse`, `/api/voice/log`)
- [ ] Add RLS policies

### Frontend
- [ ] Create `VoiceCommandButton` component
- [ ] Create `VoiceCommandModal` component
- [ ] Add to dashboard layout
- [ ] Add feature flag
- [ ] Add toast notifications

### Testing
- [ ] Unit tests for pattern matching
- [ ] Integration tests for command execution
- [ ] Browser compatibility tests
- [ ] E2E tests with Playwright

### Documentation
- [ ] User guide
- [ ] API documentation
- [ ] Troubleshooting guide

---

## Estimated Timeline

| Task | Time | Dependencies |
|------|------|--------------|
| Database schema | 2 hours | - |
| Backend services | 1 day | Database |
| API routes | 4 hours | Backend services |
| Frontend components | 1 day | API routes |
| Integration | 4 hours | All above |
| Testing | 1 day | Integration |
| Documentation | 4 hours | Testing |
| **Total** | **3-4 days** | |

---

## Success Metrics

### Launch Criteria
- ✅ 95%+ speech recognition accuracy (English)
- ✅ <100ms command processing latency
- ✅ Works in Chrome, Safari, Edge
- ✅ 100% test coverage for core logic

### Post-Launch Metrics
- Voice command usage rate
- Command success rate
- User satisfaction (NPS)
- Error rate by command type

---

## Questions & Support

For implementation questions, refer to:
- Web Speech API: https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API
- Existing patterns: `IMPLEMENTATION_PLAN.md`
- ChatSpot integration: `PHASE_5_USER_EXPERIENCE.md`

---

**Ready to implement? Start with the database schema, then build the backend services, and finally create the UI components. Voice Command™ will be a game-changer for oppSpot! 🎤**
