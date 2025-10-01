import { useState, useCallback, useEffect } from 'react'

export interface WizardState<T> {
  currentStep: string
  data: T
  isDirty: boolean
}

interface UseWizardStateOptions<T> {
  steps: readonly { id: string }[]
  initialData: T
  storageKey?: string
  onStepChange?: (step: string) => void
}

export function useWizardState<T extends Record<string, unknown>>({
  steps,
  initialData,
  storageKey,
  onStepChange,
}: UseWizardStateOptions<T>) {
  // Load saved draft from localStorage
  const loadDraft = useCallback((): WizardState<T> => {
    if (typeof window === 'undefined' || !storageKey) {
      return {
        currentStep: steps[0]!.id,
        data: initialData,
        isDirty: false,
      }
    }

    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const parsed = JSON.parse(saved)
        return {
          currentStep: parsed.currentStep || steps[0]!.id,
          data: { ...initialData, ...parsed.data },
          isDirty: true,
        }
      }
    } catch (error) {
      console.error('Failed to load wizard draft:', error)
    }

    return {
      currentStep: steps[0]!.id,
      data: initialData,
      isDirty: false,
    }
  }, [steps, initialData, storageKey])

  const [state, setState] = useState<WizardState<T>>(loadDraft)

  // Save draft to localStorage
  const saveDraft = useCallback(() => {
    if (typeof window === 'undefined' || !storageKey) return

    try {
      localStorage.setItem(storageKey, JSON.stringify({
        currentStep: state.currentStep,
        data: state.data,
      }))
    } catch (error) {
      console.error('Failed to save wizard draft:', error)
    }
  }, [state, storageKey])

  // Clear draft from localStorage
  const clearDraft = useCallback(() => {
    if (typeof window === 'undefined' || !storageKey) return

    try {
      localStorage.removeItem(storageKey)
    } catch (error) {
      console.error('Failed to clear wizard draft:', error)
    }
  }, [storageKey])

  // Auto-save on data change
  useEffect(() => {
    if (state.isDirty) {
      saveDraft()
    }
  }, [state.data, state.isDirty, saveDraft])

  // Update wizard data
  const updateData = useCallback((updates: Partial<T>) => {
    setState(prev => ({
      ...prev,
      data: { ...prev.data, ...updates },
      isDirty: true,
    }))
  }, [])

  // Go to next step
  const goToNextStep = useCallback(() => {
    const currentIndex = steps.findIndex(s => s.id === state.currentStep)
    const nextIndex = currentIndex + 1

    if (nextIndex < steps.length) {
      const nextStep = steps[nextIndex]!.id
      setState(prev => ({ ...prev, currentStep: nextStep }))
      onStepChange?.(nextStep)
    }
  }, [state.currentStep, steps, onStepChange])

  // Go to previous step
  const goToPreviousStep = useCallback(() => {
    const currentIndex = steps.findIndex(s => s.id === state.currentStep)
    const prevIndex = currentIndex - 1

    if (prevIndex >= 0) {
      const prevStep = steps[prevIndex]!.id
      setState(prev => ({ ...prev, currentStep: prevStep }))
      onStepChange?.(prevStep)
    }
  }, [state.currentStep, steps, onStepChange])

  // Go to specific step
  const goToStep = useCallback((stepId: string) => {
    if (steps.some(s => s.id === stepId)) {
      setState(prev => ({ ...prev, currentStep: stepId }))
      onStepChange?.(stepId)
    }
  }, [steps, onStepChange])

  // Reset wizard
  const reset = useCallback(() => {
    setState({
      currentStep: steps[0]!.id,
      data: initialData,
      isDirty: false,
    })
    clearDraft()
  }, [steps, initialData, clearDraft])

  // Get current step index
  const currentStepIndex = steps.findIndex(s => s.id === state.currentStep)
  const isFirstStep = currentStepIndex === 0
  const isLastStep = currentStepIndex === steps.length - 1

  return {
    currentStep: state.currentStep,
    currentStepIndex,
    data: state.data,
    isDirty: state.isDirty,
    isFirstStep,
    isLastStep,
    updateData,
    goToNextStep,
    goToPreviousStep,
    goToStep,
    reset,
    saveDraft,
    clearDraft,
  }
}
