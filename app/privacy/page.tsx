import Link from 'next/link'
import { Sparkles } from 'lucide-react'

export default function PrivacyPage() {
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
        <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
        
        <div className="prose prose-gray dark:prose-invert max-w-none">
          <p className="text-muted-foreground mb-6">
            Last updated: {new Date().toLocaleDateString()}
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
            <p>
              oppSpot (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is committed to protecting your privacy.
              This Privacy Policy explains how we collect, use, disclose, and safeguard your information
              when you use our business intelligence platform.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">2. Information We Collect</h2>
            
            <h3 className="text-xl font-semibold mb-2 mt-4">Personal Information</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Name and contact information (email address, phone number)</li>
              <li>Company information and job title</li>
              <li>Account credentials</li>
              <li>Payment information (processed securely through third-party providers)</li>
            </ul>

            <h3 className="text-xl font-semibold mb-2 mt-4">Usage Information</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Search queries and saved searches</li>
              <li>Feature usage and interaction data</li>
              <li>Device and browser information</li>
              <li>IP address and location data</li>
            </ul>

            <h3 className="text-xl font-semibold mb-2 mt-4">Business Data</h3>
            <p>
              We collect publicly available business information from various sources including 
              Companies House, business registries, and public websites.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">3. How We Use Your Information</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>To provide and maintain our Service</li>
              <li>To process your transactions and manage subscriptions</li>
              <li>To send administrative information and updates</li>
              <li>To respond to your inquiries and provide customer support</li>
              <li>To improve our Service and develop new features</li>
              <li>To send marketing communications (with your consent)</li>
              <li>To detect and prevent fraud and security issues</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">4. Data Sharing and Disclosure</h2>
            <p className="mb-4">We may share your information in the following situations:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Service Providers:</strong> With trusted third parties who assist in operating our Service</li>
              <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
              <li><strong>Business Transfers:</strong> In connection with a merger, sale, or acquisition</li>
              <li><strong>Consent:</strong> With your explicit consent for specific purposes</li>
            </ul>
            <p className="mt-4">
              We do not sell, rent, or trade your personal information to third parties for marketing purposes.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">5. Data Security</h2>
            <p>
              We implement appropriate technical and organizational measures to protect your information, including:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-4">
              <li>Encryption of data in transit and at rest</li>
              <li>Regular security assessments and audits</li>
              <li>Access controls and authentication mechanisms</li>
              <li>Secure development practices</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">6. Data Retention</h2>
            <p>
              We retain your personal information for as long as necessary to provide our Service 
              and comply with legal obligations. You may request deletion of your account and 
              associated data at any time.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">7. Your Rights</h2>
            <p className="mb-4">Under GDPR and UK data protection laws, you have the right to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Access your personal information</li>
              <li>Correct inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Object to processing of your data</li>
              <li>Request data portability</li>
              <li>Withdraw consent at any time</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">8. Cookies and Tracking</h2>
            <p>
              We use cookies and similar tracking technologies to enhance your experience. 
              You can control cookie preferences through your browser settings. Essential cookies 
              are required for the Service to function properly.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">9. Children&apos;s Privacy</h2>
            <p>
              Our Service is not intended for individuals under 18 years of age.
              We do not knowingly collect personal information from children.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">10. International Data Transfers</h2>
            <p>
              Your information may be transferred to and processed in countries other than your own. 
              We ensure appropriate safeguards are in place for such transfers in compliance with applicable laws.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">11. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any
              material changes by posting the new policy on this page and updating the &quot;Last updated&quot; date.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">12. Contact Us</h2>
            <p>
              If you have questions about this Privacy Policy or our data practices, please contact us:
              <br /><br />
              <strong>Data Protection Officer</strong>
              <br />
              Email: privacy@oppspot.ai
              <br />
              Address: oppSpot, London, UK
              <br /><br />
              For GDPR inquiries: dpo@oppspot.ai
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