import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
  Tailwind,
} from '@react-email/components'

interface PasswordResetEmailProps {
  email: string
  resetUrl: string
  firstName?: string
}

export default function PasswordResetEmail({
  email,
  resetUrl,
  firstName = 'there',
}: PasswordResetEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Reset your OppSpot password</Preview>
      <Tailwind>
        <Body className="bg-gray-100 font-sans">
          <Container className="mx-auto py-8 px-4">
            <Section className="bg-white rounded-lg shadow-lg p-8 max-w-lg mx-auto">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">🔐</span>
                </div>
                <Heading className="text-2xl font-bold text-gray-900">
                  Reset Your Password
                </Heading>
              </div>
              
              <Text className="text-gray-700 mb-4">
                Hi {firstName},
              </Text>
              
              <Text className="text-gray-700 mb-6">
                We received a request to reset your password for your OppSpot account. 
                Click the button below to create a new password:
              </Text>

              <Section className="text-center mb-6">
                <Button
                  href={resetUrl}
                  className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 inline-block"
                >
                  Reset Password
                </Button>
              </Section>

              <Text className="text-gray-600 text-sm mb-4">
                Or copy and paste this link into your browser:
              </Text>
              
              <Section className="bg-gray-50 p-3 rounded mb-6">
                <Text className="text-xs text-gray-600 break-all">
                  {resetUrl}
                </Text>
              </Section>

              <Section className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                <Text className="text-amber-800 text-sm font-semibold mb-2">
                  ⚠️ Important Security Information:
                </Text>
                <Text className="text-amber-700 text-sm">
                  • This link will expire in 1 hour
                  <br />
                  • If you didn&apos;t request this reset, please ignore this email
                  <br />
                  • Your password won&apos;t change until you create a new one
                </Text>
              </Section>

              <Text className="text-gray-600 text-sm">
                For security reasons, we recommend choosing a strong, unique password 
                that you don&apos;t use for other accounts.
              </Text>

              <Section className="mt-8 pt-6 border-t">
                <Text className="text-gray-500 text-xs text-center">
                  This email was sent to {email}
                </Text>
                <Text className="text-gray-500 text-xs text-center mt-2">
                  Need help?{' '}
                  <Link
                    href={`mailto:${process.env.EMAIL_REPLY_TO || 'support@oppspot.com'}`}
                    className="text-blue-600 underline"
                  >
                    Contact Support
                  </Link>
                </Text>
              </Section>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
}