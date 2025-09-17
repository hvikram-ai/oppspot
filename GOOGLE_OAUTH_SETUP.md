# Google OAuth Setup Guide for oppSpot

This guide will help you configure Google OAuth authentication for your oppSpot application.

## Prerequisites

1. A Google Cloud Platform account
2. Access to your Supabase project dashboard
3. Your application's production URL (e.g., https://oppspot.vercel.app)

## Step 1: Google Cloud Console Setup

### 1.1 Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click on the project dropdown at the top
3. Click "New Project"
4. Enter a project name (e.g., "oppSpot Auth")
5. Click "Create"

### 1.2 Enable Google+ API

1. In the Google Cloud Console, navigate to "APIs & Services" > "Library"
2. Search for "Google+ API"
3. Click on it and press "Enable"

### 1.3 Configure OAuth Consent Screen

1. Go to "APIs & Services" > "OAuth consent screen"
2. Select "External" as the user type (unless you have a Google Workspace account)
3. Click "Create"
4. Fill in the required information:
   - **App name**: oppSpot
   - **User support email**: Your email
   - **App logo**: Upload your logo (optional)
   - **Application home page**: https://oppspot.vercel.app (or your domain)
   - **Application privacy policy link**: https://oppspot.vercel.app/privacy
   - **Application terms of service link**: https://oppspot.vercel.app/terms
   - **Authorized domains**: oppspot.vercel.app (and any custom domains)
   - **Developer contact information**: Your email

5. Click "Save and Continue"

6. In the "Scopes" section:
   - Click "Add or Remove Scopes"
   - Select these scopes:
     - `openid`
     - `.../auth/userinfo.email`
     - `.../auth/userinfo.profile`
   - Click "Update" and then "Save and Continue"

7. Add test users if in development mode
8. Review and click "Back to Dashboard"

### 1.4 Create OAuth 2.0 Client ID

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Select "Web application" as the application type
4. Enter a name (e.g., "oppSpot Web Client")
5. Add Authorized JavaScript origins:
   ```
   http://localhost:3000
   http://localhost:3001
   https://oppspot.vercel.app
   https://your-custom-domain.com (if applicable)
   ```

6. Add Authorized redirect URIs:
   ```
   https://fuqdbewftdthbjfcecrz.supabase.co/auth/v1/callback
   http://localhost:3000/auth/callback
   http://localhost:3001/auth/callback
   https://oppspot.vercel.app/auth/callback
   https://your-custom-domain.com/auth/callback (if applicable)
   ```

7. Click "Create"
8. **IMPORTANT**: Copy and save:
   - Client ID
   - Client Secret

## Step 2: Supabase Configuration

### 2.1 Add Google Provider in Supabase

1. Go to your [Supabase Dashboard](https://app.supabase.com/)
2. Select your project
3. Navigate to "Authentication" > "Providers"
4. Find "Google" in the list and enable it
5. Enter the credentials from Google Cloud Console:
   - **Client ID**: Paste the Client ID from step 1.4
   - **Client Secret**: Paste the Client Secret from step 1.4
6. **IMPORTANT**: Copy the callback URL shown (it should be: `https://fuqdbewftdthbjfcecrz.supabase.co/auth/v1/callback`)
7. Click "Save"

### 2.2 Verify Redirect URLs

Ensure the callback URL from Supabase is added to your Google OAuth client's authorized redirect URIs (Step 1.4, item 6).

## Step 3: Environment Variables (Optional for Local Development)

While not required for production (Supabase handles it), for local development you might want to add these to your `.env.local`:

```env
# Google OAuth (handled by Supabase, not needed in .env.local)
# These are configured in Supabase Dashboard
# GOOGLE_CLIENT_ID=your_google_client_id
# GOOGLE_CLIENT_SECRET=your_google_client_secret
```

## Step 4: Testing the Integration

### 4.1 Test in Development

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to http://localhost:3000/login
3. Click "Continue with Google"
4. You should be redirected to Google's OAuth consent screen
5. After authorization, you should be redirected back to your app

### 4.2 Test in Production

1. Deploy your latest changes to Vercel:
   ```bash
   git add .
   git commit -m "Configure Google OAuth"
   git push
   ```

2. Visit your production URL
3. Test the Google sign-in flow

## Step 5: Troubleshooting

### Common Issues and Solutions

#### 1. "OAuth provider not configured" Error
- **Cause**: Google provider not enabled in Supabase
- **Solution**: Follow Step 2.1 to enable Google provider in Supabase

#### 2. "Redirect URI mismatch" Error
- **Cause**: The callback URL doesn't match what's configured in Google Console
- **Solution**: 
  - Check that the Supabase callback URL is added to Google OAuth client
  - Ensure no trailing slashes in URLs
  - Match URLs exactly (http vs https)

#### 3. "Invalid Client" Error
- **Cause**: Wrong Client ID or Secret
- **Solution**: 
  - Verify Client ID and Secret in Supabase match Google Console
  - Regenerate credentials if needed

#### 4. Users Not Created in Database
- **Cause**: Database triggers or RLS policies blocking user creation
- **Solution**: 
  - Check Supabase logs for errors
  - Verify profiles table has proper RLS policies
  - Ensure trigger functions are working

#### 5. Infinite Loading After Authorization
- **Cause**: Callback route not handling the OAuth response properly
- **Solution**: 
  - Check browser console for errors
  - Verify `/app/auth/callback/route.ts` exists and is correct
  - Check network tab for failed requests

### Debug Checklist

- [ ] Google Cloud Project created and APIs enabled
- [ ] OAuth consent screen configured
- [ ] OAuth 2.0 Client ID created with correct origins and redirect URIs
- [ ] Google provider enabled in Supabase with correct credentials
- [ ] Callback URL from Supabase added to Google OAuth client
- [ ] Application deployed with latest changes
- [ ] Test users added (if in development mode)

## Step 6: Going to Production

When ready for production:

1. **Verify your OAuth consent screen**:
   - Submit for verification if needed (for sensitive scopes)
   - Move from "Testing" to "Production" status

2. **Update your domains**:
   - Add production domain to authorized domains
   - Update JavaScript origins and redirect URIs

3. **Security considerations**:
   - Keep Client Secret secure
   - Use HTTPS for all production URLs
   - Regularly rotate credentials

## Additional Resources

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google Cloud Console](https://console.cloud.google.com/)

## Support

If you encounter issues not covered in this guide:

1. Check Supabase logs: Dashboard > Logs > Auth
2. Review browser console for client-side errors
3. Contact support with:
   - Error messages
   - Screenshots of configuration
   - Network tab HAR file (for debugging)