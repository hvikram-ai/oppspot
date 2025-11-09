import { LoginForm } from '@/components/auth/login-form'
import { LoginHero } from '@/components/auth/login-hero'
import { Sparkles } from 'lucide-react'

export default function LoginPage() {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[60%_40%]">
      {/* Left: Brand Hero (desktop only) */}
      <LoginHero />

      {/* Right: Login Form */}
      <div className="flex flex-col min-h-screen lg:min-h-0">
        {/* Mobile Hero - visible only on mobile/tablet */}
        <div className="lg:hidden relative bg-gradient-to-br from-purple-600 via-blue-600 to-purple-700 p-6 pb-12">
          <div className="flex items-center gap-2 text-white mb-4">
            <div className="h-8 w-8 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Sparkles className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold">oppSpot</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            Discover opportunities in{' '}
            <span className="text-yellow-300">30 seconds</span>
          </h1>
          <p className="text-white/90 text-sm sm:text-base">
            AI-powered intelligence for UK & Ireland businesses
          </p>
        </div>

        {/* Form Container */}
        <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-background">
          <div className="w-full max-w-md">
            <LoginForm />
          </div>
        </div>
      </div>
    </div>
  )
}