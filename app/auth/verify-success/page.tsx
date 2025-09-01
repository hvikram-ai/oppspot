'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle } from 'lucide-react'

export default function VerifySuccessPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to dashboard after 5 seconds
    const timer = setTimeout(() => {
      router.push('/dashboard')
    }, 5000)

    return () => clearTimeout(timer)
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900">
              Email Verified Successfully!
            </h1>
            
            <p className="text-gray-600">
              Your email has been verified. You now have full access to all 
              OppSpot features.
            </p>

            <div className="w-full space-y-3 pt-4">
              <Button 
                onClick={() => router.push('/dashboard')}
                className="w-full"
              >
                Go to Dashboard
              </Button>
              
              <p className="text-sm text-gray-500">
                You will be redirected automatically in 5 seconds...
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}