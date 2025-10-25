'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Mic, MicOff } from 'lucide-react'
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
    'Show me streams',
    'Open search',
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
                  • &quot;{example}&quot;
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
