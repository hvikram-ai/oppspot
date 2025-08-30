export const emailTemplates = {
  welcome: (name: string, companyName: string) => ({
    subject: 'Welcome to oppSpot! 🎉',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
            .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .feature { padding: 15px; margin: 10px 0; background: #f9fafb; border-radius: 5px; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to oppSpot!</h1>
            </div>
            <div class="content">
              <h2>Hi ${name},</h2>
              <p>Welcome to oppSpot! We're thrilled to have you and ${companyName} on board.</p>
              
              <p>You now have instant access to discover UK & Ireland business opportunities. Here's what you can do right away:</p>
              
              <div class="feature">
                <strong>🔍 Smart Search</strong><br>
                Try searching "tech companies in London" or "restaurants in Dublin"
              </div>
              
              <div class="feature">
                <strong>📍 Interactive Maps</strong><br>
                Explore businesses geographically with our powerful map view
              </div>
              
              <div class="feature">
                <strong>📋 Create Lists</strong><br>
                Save interesting businesses to organized lists for later
              </div>
              
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" class="button">Get Started</a>
              
              <p><strong>Pro tip:</strong> Verify your email within the next 48 hours to unlock premium features like data exports and team collaboration!</p>
              
              <p>If you have any questions, just reply to this email. We're here to help!</p>
              
              <p>Best regards,<br>The oppSpot Team</p>
            </div>
            <div class="footer">
              <p>© 2024 oppSpot. All rights reserved.</p>
              <p>You're receiving this because you signed up at oppspot.com</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
Hi ${name},

Welcome to oppSpot! We're thrilled to have you and ${companyName} on board.

You now have instant access to discover UK & Ireland business opportunities. Here's what you can do right away:

🔍 Smart Search - Try searching "tech companies in London"
📍 Interactive Maps - Explore businesses geographically
📋 Create Lists - Save interesting businesses

Get started: ${process.env.NEXT_PUBLIC_APP_URL}/dashboard

Pro tip: Verify your email within 48 hours to unlock premium features!

Best regards,
The oppSpot Team
    `.trim()
  }),

  verificationReminder: (name: string) => ({
    subject: 'Verify your email to unlock all oppSpot features',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #fef3c7; border: 1px solid #fbbf24; padding: 20px; border-radius: 10px; margin-bottom: 20px; }
            .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-radius: 10px; }
            .button { display: inline-block; padding: 12px 24px; background: #10b981; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .benefits { list-style: none; padding: 0; }
            .benefits li { padding: 10px 0; }
            .benefits li:before { content: "✅ "; font-weight: bold; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <strong>⚠️ Action Required:</strong> Verify your email address
            </div>
            <div class="content">
              <h2>Hi ${name},</h2>
              <p>You're using oppSpot with limited features. Verify your email now to unlock:</p>
              
              <ul class="benefits">
                <li>Unlimited data exports (CSV, Excel)</li>
                <li>Invite team members to collaborate</li>
                <li>API access for integrations</li>
                <li>Priority customer support</li>
                <li>Extended trial period (30 days)</li>
              </ul>
              
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/verify-email" class="button">Verify Email Now</a>
              
              <p><em>This takes just 10 seconds and unlocks the full potential of oppSpot.</em></p>
              
              <p>If you're having trouble, just reply to this email and we'll help you out!</p>
              
              <p>Best regards,<br>The oppSpot Team</p>
            </div>
            <div class="footer">
              <p>© 2024 oppSpot. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
Hi ${name},

You're using oppSpot with limited features. Verify your email now to unlock:

✅ Unlimited data exports (CSV, Excel)
✅ Invite team members to collaborate  
✅ API access for integrations
✅ Priority customer support
✅ Extended trial period (30 days)

Verify now: ${process.env.NEXT_PUBLIC_APP_URL}/verify-email

This takes just 10 seconds!

Best regards,
The oppSpot Team
    `.trim()
  }),

  onboardingTips: (name: string, day: number) => ({
    subject: `Day ${day}: Discover what oppSpot can do for you`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-radius: 10px; }
            .tip { background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; }
            .button { display: inline-block; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="content">
              <h2>Hi ${name},</h2>
              <p>Here's your tip for today:</p>
              
              <div class="tip">
                <strong>💡 Pro Tip:</strong> Use advanced filters to narrow down your search. Try combining location, industry, and company size for laser-focused results.
              </div>
              
              <p>Did you know you can save searches and get alerts when new businesses match your criteria?</p>
              
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/search" class="button">Try Advanced Search</a>
              
              <p>Happy discovering!<br>The oppSpot Team</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `Day ${day} tip: Use advanced filters to find exactly what you need.`
  })
}