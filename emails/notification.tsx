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

interface NotificationEmailProps {
  firstName?: string
  email: string
  subject: string
  title: string
  message: string
  actionUrl?: string
  actionText?: string
  type?: 'info' | 'success' | 'warning' | 'alert'
}

export default function NotificationEmail({
  firstName = 'there',
  email,
  subject,
  title,
  message,
  actionUrl,
  actionText = 'View Details',
  type = 'info',
}: NotificationEmailProps) {
  const typeConfig = {
    info: {
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-800',
      borderColor: 'border-blue-200',
      icon: 'ℹ️',
    },
    success: {
      bgColor: 'bg-green-100',
      textColor: 'text-green-800',
      borderColor: 'border-green-200',
      icon: '✅',
    },
    warning: {
      bgColor: 'bg-amber-100',
      textColor: 'text-amber-800',
      borderColor: 'border-amber-200',
      icon: '⚠️',
    },
    alert: {
      bgColor: 'bg-red-100',
      textColor: 'text-red-800',
      borderColor: 'border-red-200',
      icon: '🚨',
    },
  }

  const config = typeConfig[type]

  return (
    <Html>
      <Head />
      <Preview>{subject}</Preview>
      <Tailwind>
        <Body className="bg-gray-100 font-sans">
          <Container className="mx-auto py-8 px-4">
            <Section className="bg-white rounded-lg shadow-lg p-8 max-w-lg mx-auto">
              <div className="text-center mb-6">
                <div className={`w-16 h-16 ${config.bgColor} rounded-full flex items-center justify-center mx-auto mb-4`}>
                  <span className="text-3xl">{config.icon}</span>
                </div>
                <Heading className="text-2xl font-bold text-gray-900">
                  {title}
                </Heading>
              </div>
              
              <Text className="text-gray-700 mb-4">
                Hi {firstName},
              </Text>
              
              <Section className={`${config.bgColor} border ${config.borderColor} rounded-lg p-4 mb-6`}>
                <Text className={`${config.textColor} whitespace-pre-line`}>
                  {message}
                </Text>
              </Section>

              {actionUrl && (
                <Section className="text-center mb-6">
                  <Button
                    href={actionUrl}
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 inline-block"
                  >
                    {actionText}
                  </Button>
                </Section>
              )}

              <Section className="mt-8 pt-6 border-t">
                <Text className="text-gray-500 text-xs text-center">
                  You&apos;re receiving this notification because you&apos;re registered 
                  with the email address: {email}
                </Text>
                <Text className="text-gray-500 text-xs text-center mt-2">
                  <Link
                    href={`${process.env.NEXT_PUBLIC_APP_URL}/settings/notifications`}
                    className="text-blue-600 underline"
                  >
                    Manage notification preferences
                  </Link>
                  {' '}|{' '}
                  <Link
                    href={`${process.env.NEXT_PUBLIC_APP_URL}/settings`}
                    className="text-blue-600 underline"
                  >
                    Account settings
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