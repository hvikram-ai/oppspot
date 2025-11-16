# Custom Domain Fix - oppspot.ai

## Problem Statement

The custom domain `oppspot.ai` is currently pointing to an **old/stale Vercel deployment** and is NOT receiving the latest updates from GitHub. Users accessing oppspot.ai are seeing an outdated version of the application.

**Impact**: HIGH - This is a critical blocker for public launch

**Current Status**:
- ✅ **Production URL (working)**: https://oppspot-one.vercel.app
- ❌ **Custom Domain (broken)**: https://oppspot.ai → points to old deployment

## Root Cause

The domain `oppspot.ai` was configured to point to a previous Vercel deployment that is no longer being updated. The current active deployment is `oppspot-one`, but the domain routing was never updated.

## Solution Steps

### Step 1: Access Vercel Dashboard
1. Go to https://vercel.com/
2. Log in with account: `hirendra.vikram@boardguru.ai`
3. Select organization: `boardguruhv`

### Step 2: Locate Both Deployments
1. Find the OLD deployment (currently linked to oppspot.ai)
2. Find the CURRENT deployment: `oppspot-one`
   - Dashboard: https://vercel.com/boardguruhv/oppspot-one

### Step 3: Remove Domain from Old Deployment
1. Navigate to the old deployment
2. Go to **Settings** → **Domains**
3. Find `oppspot.ai` in the domains list
4. Click **Remove** or **Edit**
5. Remove `oppspot.ai` from this deployment
6. Confirm the removal

### Step 4: Add Domain to Current Deployment (oppspot-one)
1. Go to https://vercel.com/boardguruhv/oppspot-one
2. Click **Settings** → **Domains**
3. Click **Add Domain**
4. Enter: `oppspot.ai`
5. Click **Add**

### Step 5: Configure www Subdomain (Optional but Recommended)
1. In the same **Domains** section
2. Click **Add Domain**
3. Enter: `www.oppspot.ai`
4. Configure to redirect to `oppspot.ai`

### Step 6: Verify DNS Configuration
Vercel should automatically handle DNS, but verify:

1. Check that Vercel shows DNS records for:
   - **A Record**: `oppspot.ai` → Vercel IP
   - **CNAME Record**: `www.oppspot.ai` → `cname.vercel-dns.com`

2. If DNS is managed externally (not Vercel Nameservers):
   - Go to your DNS provider
   - Update A/CNAME records to point to Vercel
   - Vercel will show the correct values in the dashboard

### Step 7: Wait for SSL Certificate Generation
1. Vercel will automatically provision an SSL certificate
2. This usually takes 1-5 minutes
3. Watch for status change from "Pending" to "Active"

### Step 8: Verify the Fix
1. Wait 5-10 minutes for DNS propagation
2. Test the custom domain:
   ```bash
   curl -I https://oppspot.ai
   ```
3. Check that it returns HTTP 200 and the latest version
4. Visit https://oppspot.ai in a browser
5. Verify the latest features are present (check git commit hash in footer if available)

### Step 9: Clear CDN Cache (if needed)
If the old content is still showing:
1. Go to Vercel Dashboard → **Deployments**
2. Find the latest deployment
3. Click **...** (three dots) → **Redeploy**
4. Select **Clear Cache and Redeploy**

## Verification Checklist

- [ ] oppspot.ai loads without errors
- [ ] oppspot.ai shows the same content as oppspot-one.vercel.app
- [ ] SSL certificate is valid (https:// works)
- [ ] www.oppspot.ai redirects to oppspot.ai (or vice versa)
- [ ] OAuth redirect URIs work with the custom domain
- [ ] Latest GitHub commits are reflected on oppspot.ai

## DNS Propagation Time

- **Minimum**: 5-10 minutes
- **Typical**: 30-60 minutes
- **Maximum**: 24-48 hours (worst case)

Use https://dnschecker.org to check global DNS propagation.

## Rollback Plan

If something goes wrong:
1. Remove `oppspot.ai` from oppspot-one deployment
2. Re-add `oppspot.ai` to the old deployment
3. Investigate the issue
4. Try again with fixes

## Common Issues and Solutions

### Issue 1: "Domain is already in use"
**Solution**: The domain is still attached to another deployment. Complete Step 3 first.

### Issue 2: SSL Certificate Fails
**Solution**:
- Ensure DNS is properly configured
- Wait 5 minutes and try again
- Check that no CAA records are blocking Let's Encrypt

### Issue 3: Domain shows 404
**Solution**:
- Check that the domain is added to the CORRECT deployment
- Verify DNS propagation is complete
- Clear browser cache

### Issue 4: OAuth Breaks
**Solution**:
The app uses `window.location.origin` dynamically, so OAuth should work automatically. But if issues occur:
1. Go to Google Cloud Console
2. Update Authorized JavaScript Origins to include `https://oppspot.ai`
3. Update Authorized Redirect URIs to include `https://oppspot.ai/auth/callback`

## Post-Fix Actions

1. Update all documentation to use `oppspot.ai` as the primary URL
2. Update CLAUDE.md to reflect that oppspot.ai is now the canonical URL
3. Update DEBUT_RELEASE_PLAN.md to mark this blocker as resolved
4. Test all critical user flows on the custom domain
5. Update any marketing materials or external links

## Time Estimate

- **DNS Configuration**: 5-10 minutes (hands-on)
- **DNS Propagation**: 5-60 minutes (wait time)
- **SSL Certificate**: 1-5 minutes (automatic)
- **Total**: 15-30 minutes hands-on, up to 1 hour total

## Owner

**Assigned to**: DevOps Lead / Deployment Manager
**Priority**: CRITICAL (Blocker for public launch)
**Deadline**: Week 1, Day 1

## Success Criteria

✅ https://oppspot.ai loads the latest deployment
✅ SSL certificate is valid
✅ All features work identically to oppspot-one.vercel.app
✅ OAuth authentication works
✅ DNS propagation complete globally

---

**Note**: This is a non-destructive change. The old deployment will remain intact even after removing the domain. The domain can be moved back if needed.
