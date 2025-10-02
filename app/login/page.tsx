import { LoginForm } from '@/components/auth/login-form'
import { PublicLayout } from '@/components/layout/public-layout'

export default function LoginPage() {
  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-20">
        <div className="flex justify-center">
          <LoginForm />
        </div>
      </div>
    </PublicLayout>
  )
}