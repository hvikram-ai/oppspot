import { LoginForm } from '@/components/auth/login-form'
import { Navbar } from '@/components/layout/navbar'

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <Navbar />
      <div className="container mx-auto px-4 py-20">
        <div className="flex justify-center">
          <LoginForm />
        </div>
      </div>
    </div>
  )
}