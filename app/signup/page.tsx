import { SignupForm } from '@/components/auth/signup-form'
import Link from 'next/link'
import { Sparkles } from 'lucide-react'

export default function SignupPage() {
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

      {/* Signup Form */}
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col items-center">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold mb-2">Start your free trial</h1>
            <p className="text-muted-foreground">
              No credit card required. Get instant access.
            </p>
          </div>
          
          <SignupForm />

          {/* Trust Indicators */}
          <div className="mt-12 flex items-center space-x-8 text-sm text-muted-foreground">
            <div className="flex items-center">
              <svg className="h-4 w-4 mr-2 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              30-day free trial
            </div>
            <div className="flex items-center">
              <svg className="h-4 w-4 mr-2 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              No credit card
            </div>
            <div className="flex items-center">
              <svg className="h-4 w-4 mr-2 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              GDPR compliant
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}