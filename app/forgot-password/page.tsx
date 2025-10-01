import { ForgotPasswordForm } from '@/components/auth/forgot-password-form'
import Link from 'next/link'
import { Sparkles, ArrowLeft } from 'lucide-react'

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Simple Header */}
      <div className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <span className="font-bold text-xl">oppSpot</span>
            </Link>
            
            <Link 
              href="/login" 
              className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to login
            </Link>
          </div>
        </div>
      </div>

      {/* Form Container */}
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col items-center">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold mb-2">Reset your password</h1>
            <p className="text-muted-foreground">
              Enter your email and we&apos;ll send you a reset link
            </p>
          </div>
          
          <ForgotPasswordForm />
        </div>
      </div>
    </div>
  )
}