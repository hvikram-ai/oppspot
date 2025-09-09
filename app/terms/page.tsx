import Link from 'next/link'
import { Sparkles } from 'lucide-react'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
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

      {/* Content */}
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
        
        <div className="prose prose-gray dark:prose-invert max-w-none">
          <p className="text-muted-foreground mb-6">
            Last updated: {new Date().toLocaleDateString()}
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
            <p>
              By accessing and using oppSpot ("the Service"), you agree to be bound by these Terms of Service. 
              If you do not agree to these terms, please do not use our Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">2. Description of Service</h2>
            <p>
              oppSpot provides business intelligence and M&A opportunity discovery services for UK and Ireland companies. 
              Our platform includes company search, similarity analysis, market insights, and data export capabilities.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">3. User Accounts</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>You must provide accurate and complete information when creating an account</li>
              <li>You are responsible for maintaining the security of your account credentials</li>
              <li>You are responsible for all activities that occur under your account</li>
              <li>You must notify us immediately of any unauthorized use of your account</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">4. Acceptable Use</h2>
            <p className="mb-4">You agree not to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Use the Service for any illegal or unauthorized purpose</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Interfere with or disrupt the Service or servers</li>
              <li>Scrape or harvest data from the Service without permission</li>
              <li>Resell or redistribute our data without authorization</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">5. Data and Privacy</h2>
            <p>
              Your use of our Service is also governed by our Privacy Policy. 
              We collect and process business data from public sources and maintain high standards of data protection.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">6. Subscription and Billing</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Free trial: 30 days with full access to features</li>
              <li>Subscription plans are billed monthly or annually</li>
              <li>Payments are non-refundable except as required by law</li>
              <li>We reserve the right to change pricing with 30 days notice</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">7. Intellectual Property</h2>
            <p>
              All content, features, and functionality of the Service are owned by oppSpot 
              and are protected by international copyright, trademark, and other intellectual property laws.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">8. Limitation of Liability</h2>
            <p>
              oppSpot shall not be liable for any indirect, incidental, special, consequential, 
              or punitive damages resulting from your use or inability to use the Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">9. Termination</h2>
            <p>
              We may terminate or suspend your account at any time for violations of these Terms. 
              You may cancel your account at any time through your account settings.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">10. Changes to Terms</h2>
            <p>
              We reserve the right to modify these Terms at any time. 
              We will notify users of any material changes via email or through the Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">11. Contact Information</h2>
            <p>
              For questions about these Terms, please contact us at:
              <br />
              Email: legal@oppspot.ai
              <br />
              Address: oppSpot, London, UK
            </p>
          </section>

          <div className="mt-12 pt-8 border-t">
            <Link href="/signup" className="text-primary hover:underline">
              ← Back to Sign Up
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}