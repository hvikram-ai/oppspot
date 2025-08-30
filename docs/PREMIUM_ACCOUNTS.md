# Premium Account Creation Guide

This guide explains how to create pre-registered premium accounts for paying clients.

## Overview

Premium accounts allow paying clients to:
- Skip the signup process
- Skip email verification
- Skip onboarding
- Have immediate access to all features
- No trial limitations

## Methods to Create Premium Accounts

### Method 1: Command Line Script (Recommended)

Use the npm script to create accounts directly from the command line:

```bash
npm run create-account -- \
  --email client@example.com \
  --password SecurePass123 \
  --name "John Doe" \
  --company "ACME Corp"
```

**Options:**
- `--email` (required): Client's email address
- `--password` (required): Account password
- `--name` (required): Full name
- `--company` (required): Company name
- `--role` (optional): User role (default: admin)
- `--tier` (optional): Subscription tier (default: premium)

**Example:**
```bash
# Create a premium account
npm run create-account -- --email john@acmecorp.com --password MySecurePass123! --name "John Smith" --company "ACME Corporation"

# Create an enterprise account with custom role
npm run create-account -- --email ceo@bigcorp.com --password UltraSecure456! --name "Jane CEO" --company "Big Corp" --tier enterprise --role owner
```

### Method 2: API Endpoint

Send a POST request to `/api/admin/create-account` with admin authentication:

```bash
curl -X POST http://localhost:3000/api/admin/create-account \
  -H "Content-Type: application/json" \
  -H "x-admin-api-key: your-secure-admin-api-key-here" \
  -d '{
    "email": "client@example.com",
    "password": "SecurePass123",
    "fullName": "John Doe",
    "companyName": "ACME Corp",
    "tier": "premium"
  }'
```

**Note:** Set `ADMIN_API_KEY` in your environment variables for API authentication.

## Database Migrations

Before creating premium accounts, ensure you've run the necessary database migrations:

1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Run the migrations in this order:
   - `supabase/migrations/add_missing_columns.sql`
   - `supabase/migrations/update_subscription_tiers.sql`

## Subscription Tiers

Available subscription tiers:
- `trial`: Default for regular signups (14-day trial)
- `free`: Free tier (limited features)
- `premium`: Full features, no trial limit
- `enterprise`: All features plus custom options

## Security Considerations

1. **Strong Passwords**: Generate strong passwords for client accounts
2. **Secure Sharing**: Share credentials through secure channels (encrypted email, password manager)
3. **API Key Protection**: Keep the admin API key secure and rotate regularly
4. **Environment Variables**: Ensure `SUPABASE_SERVICE_ROLE_KEY` is never exposed

## Troubleshooting

### Script won't run
- Ensure dependencies are installed: `npm install`
- Check environment variables in `.env.local`

### Account creation fails
- Verify Supabase connection
- Check if email already exists
- Ensure database migrations are applied

### User can't login
- Verify credentials are correct
- Check Supabase authentication settings
- Ensure email confirmation is disabled for the environment

## Best Practices

1. **Password Generation**: Use a password generator for strong, unique passwords
2. **Documentation**: Keep a secure record of created accounts
3. **Client Communication**: Provide clear login instructions with credentials
4. **Regular Audits**: Periodically review premium accounts

## Example Client Communication Template

```
Subject: Your oppSpot Premium Account is Ready

Hello [Client Name],

Your oppSpot premium account has been created and is ready for immediate use.

Account Details:
- URL: https://yourapp.com/login
- Email: [client email]
- Password: [secure password]

You can log in immediately - no email verification or setup required.

Features included:
✓ Full access to all features
✓ No trial limitations
✓ Priority support
✓ Advanced analytics

For security, please change your password after first login.

Best regards,
[Your Team]
```

## Support

For issues or questions about premium account creation, contact the development team.