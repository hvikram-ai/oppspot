-- Persisted rate-limit counters for OpenCorporates API usage
create table if not exists public.opencorporates_rate_limits (
    id text primary key,
    daily_requests int default 0,
    monthly_requests int default 0,
    day_reset_date timestamptz,
    month_reset_date timestamptz,
    updated_at timestamptz default now()
);

comment on table public.opencorporates_rate_limits is 'Tracks current OpenCorporates API usage counters for quota enforcement';
