import { toast as sonnerToast } from 'sonner'

export interface ToastOptions {
  title?: string | React.ReactNode
  description?: string
  duration?: number
  variant?: 'default' | 'destructive'
}

export function useToast() {
  const toast = (options: ToastOptions) => {
    const { title, description, duration = 3000, variant = 'default' } = options

    if (variant === 'destructive') {
      sonnerToast.error(title as string, {
        description,
        duration
      })
    } else {
      sonnerToast.success(title as string, {
        description,
        duration
      })
    }
  }

  return { toast }
}
