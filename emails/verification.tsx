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

interface VerificationEmailProps {
  email: string
  verificationUrl: string
  firstName?: string
}

export default function VerificationEmail({
  email,
  verificationUrl,
  firstName = 'there',
}: VerificationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Verify your email address for OppSpot</Preview>
      <Tailwind>
        <Body className="bg-gray-100 font-sans">
          <Container className="mx-auto py-8 px-4">
            <Section className="bg-white rounded-lg shadow-lg p-8 max-w-lg mx-auto">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">✉️</span>
                </div>
                <Heading className="text-2xl font-bold text-gray-900">
                  Verify Your Email Address
                </Heading>
              </div>
              
              <Text className="text-gray-700 mb-4">
                Hi {firstName},
              </Text>
              
              <Text className="text-gray-700 mb-6">
                Please confirm your email address to complete your OppSpot account setup 
                and unlock all features.
              </Text>

              <Section className="text-center mb-6">
                <Button
                  href={verificationUrl}
                  className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 inline-block"
                >
                  Verify Email Address
                </Button>
              </Section>

              <Text className="text-gray-600 text-sm mb-4">
                Or copy and paste this link into your browser:
              </Text>
              
              <Section className="bg-gray-50 p-3 rounded mb-6">
                <Text className="text-xs text-gray-600 break-all">
                  {verificationUrl}
                </Text>
              </Section>

              <Text className="text-gray-600 text-sm">
                This verification link will expire in 24 hours. If you didn&apos;t create 
                an account with OppSpot, you can safely ignore this email.
              </Text>

              <Section className="mt-8 pt-6 border-t">
                <Text className="text-gray-500 text-xs text-center">
                  This email was sent to {email}
                </Text>
                <Text className="text-gray-500 text-xs text-center mt-2">
                  <Link
                    href={`${process.env.NEXT_PUBLIC_APP_URL}`}
                    className="text-blue-600 underline"
                  >
                    OppSpot
                  </Link>
                  {' '}- Discover Business Opportunities
                </Text>
              </Section>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
}