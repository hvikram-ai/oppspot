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
        <div className="absolute top-full mt-2 right-0 bg-background border rounded-lg p-2 shadow-lg text-sm min-w-[200px] z-50">
          {currentTranscript}
        </div>
      )}
    </div>
  )
}
