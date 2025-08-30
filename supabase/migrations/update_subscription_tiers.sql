-- Update subscription_tier to support different tiers
ALTER TABLE organizations 
ALTER COLUMN subscription_tier SET DEFAULT 'trial';

-- Add constraint to ensure valid subscription tiers
ALTER TABLE organizations 
ADD CONSTRAINT valid_subscription_tier 
CHECK (subscription_tier IN ('trial', 'free', 'premium', 'enterprise'));

-- Update existing 'free' entries to 'trial' if needed
UPDATE organizations 
SET subscription_tier = 'trial' 
WHERE subscription_tier = 'free';

-- Add index for faster queries on subscription tier
CREATE INDEX IF NOT EXISTS idx_organizations_subscription_tier 
ON organizations(subscription_tier);

-- Update profiles table to ensure premium users skip onboarding
COMMENT ON COLUMN profiles.onboarding_completed IS 'Whether user has completed onboarding. Premium users have this set to true by default.';
COMMENT ON COLUMN profiles.trial_ends_at IS 'Trial end date. NULL for premium/enterprise users.';
COMMENT ON COLUMN profiles.email_verified_at IS 'Email verification timestamp. Pre-set for premium users.';

-- Create a function to check if user is premium
CREATE OR REPLACE FUNCTION is_premium_user(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  tier TEXT;
BEGIN
  SELECT o.subscription_tier INTO tier
  FROM profiles p
  JOIN organizations o ON p.org_id = o.id
  WHERE p.id = user_id;
  
  RETURN tier IN ('premium', 'enterprise');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION is_premium_user TO authenticated;