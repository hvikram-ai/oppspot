import { ResetPasswordForm } from '@/components/auth/reset-password-form'
import Link from 'next/link'
import { Sparkles } from 'lucide-react'

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Simple Header */}
      <div className="border-b">
        <div className="container mx-auto px-4 py-4">
          <Link href="/" className="flex items-center space-x-2 w-fit">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-xl">oppSpot</span>
          </Link>
        </div>
      </div>

      {/* Form Container */}
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col items-center">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold mb-2">Set new password</h1>
            <p className="text-muted-foreground">
              Enter your new password below
            </p>
          </div>
          
          <ResetPasswordForm />
        </div>
      </div>
    </div>
  )
}