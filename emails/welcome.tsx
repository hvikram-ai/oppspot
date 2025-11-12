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

interface WelcomeEmailProps {
  firstName?: string
  email: string
  verificationUrl?: string
}

export default function WelcomeEmail({
  firstName = 'there',
  email,
  verificationUrl,
}: WelcomeEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Welcome to OppSpot - Discover Business Opportunities</Preview>
      <Tailwind>
        <Body className="bg-gray-100 font-sans">
          <Container className="mx-auto py-8 px-4">
            <Section className="bg-white rounded-lg shadow-lg p-8 max-w-2xl mx-auto">
              <Heading className="text-3xl font-bold text-gray-900 text-center mb-6">
                Welcome to OppSpot! 🎉
              </Heading>
              
              <Text className="text-gray-700 text-lg mb-4">
                Hi {firstName},
              </Text>
              
              <Text className="text-gray-700 mb-4">
                Thank you for joining OppSpot! We&apos;re excited to have you on board.
                OppSpot is your gateway to discovering acquisition opportunities and market intelligence across every continent.
              </Text>

              <Section className="bg-blue-50 rounded-lg p-6 mb-6">
                <Heading className="text-xl font-semibold text-gray-900 mb-3">
                  What you can do with OppSpot:
                </Heading>
                <ul className="space-y-2 text-gray-700">
                  <li>🔍 Search and discover businesses in your area</li>
                  <li>📍 Explore businesses on our interactive map</li>
                  <li>⭐ Find verified and highly-rated businesses</li>
                  <li>📊 Export business data for your research</li>
                  <li>💼 Save businesses to custom lists</li>
                </ul>
              </Section>

              {verificationUrl && (
                <Section className="text-center mb-6">
                  <Text className="text-gray-700 mb-4">
                    Please verify your email address to unlock all features:
                  </Text>
                  <Button
                    href={verificationUrl}
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700"
                  >
                    Verify Email Address
                  </Button>
                </Section>
              )}

              <Section className="border-t pt-6">
                <Heading className="text-lg font-semibold text-gray-900 mb-3">
                  Get Started:
                </Heading>
                <div className="space-y-3">
                  <Button
                    href={`${process.env.NEXT_PUBLIC_APP_URL}/search`}
                    className="bg-gray-800 text-white px-4 py-2 rounded-lg inline-block"
                  >
                    Start Searching
                  </Button>
                  <Text className="text-gray-600">
                    or explore our{' '}
                    <Link
                      href={`${process.env.NEXT_PUBLIC_APP_URL}/map`}
                      className="text-blue-600 underline"
                    >
                      interactive map
                    </Link>
                  </Text>
                </div>
              </Section>

              <Section className="mt-8 pt-6 border-t">
                <Text className="text-gray-600 text-sm text-center">
                  You&apos;re receiving this email because you signed up for OppSpot 
                  with the email address: {email}
                </Text>
                <Text className="text-gray-600 text-sm text-center mt-2">
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