create extension if not exists pgcrypto;
create schema if not exists myformsvault;

create table if not exists myformsvault."AnswerHistory" (
  id text primary key default gen_random_uuid()::text,
  "familyMemberId" text not null references myformsvault."FamilyMember"(id) on delete cascade,
  "fieldKey" text not null,
  "fieldLabel" text not null,
  value text not null,
  "templateName" text not null,
  "formName" text not null,
  "createdAt" timestamptz not null default now()
);

create index if not exists "AnswerHistory_familyMemberId_fieldKey_createdAt_idx"
  on myformsvault."AnswerHistory" ("familyMemberId", "fieldKey", "createdAt" desc);

create table if not exists myformsvault."Profile" (
  id text primary key default gen_random_uuid()::text,
  "userId" text not null unique,
  email text not null unique,
  "fullName" text,
  is_admin boolean not null default false,
  plan text not null default 'free',
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create index if not exists "Profile_is_admin_idx" on myformsvault."Profile" (is_admin);

create table if not exists myformsvault.admins (
  id text primary key default gen_random_uuid()::text,
  email text not null unique,
  is_admin boolean not null default true,
  "createdAt" timestamptz not null default now()
);

create table if not exists myformsvault."Subscription" (
  id text primary key default gen_random_uuid()::text,
  "userId" text not null,
  "profileId" text references myformsvault."Profile"(id) on delete set null,
  status text not null default 'trialing',
  plan text not null default 'free',
  "amountCents" integer not null default 0,
  interval text not null default 'month',
  "currentPeriodEnd" timestamptz,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create index if not exists "Subscription_status_idx" on myformsvault."Subscription" (status);
create index if not exists "Subscription_userId_idx" on myformsvault."Subscription" ("userId");

create table if not exists myformsvault."AuditLog" (
  id text primary key default gen_random_uuid()::text,
  "userId" text,
  action text not null,
  "targetType" text not null,
  "targetId" text,
  metadata jsonb not null default '{}'::jsonb,
  ip text,
  "userAgent" text,
  "createdAt" timestamptz not null default now()
);

create index if not exists "AuditLog_userId_createdAt_idx"
  on myformsvault."AuditLog" ("userId", "createdAt" desc);
create index if not exists "AuditLog_action_createdAt_idx"
  on myformsvault."AuditLog" (action, "createdAt" desc);

create table if not exists myformsvault."ApiKey" (
  id text primary key default gen_random_uuid()::text,
  "userId" text not null,
  name text not null,
  "keyHash" text not null unique,
  "keyPrefix" text not null,
  "lastUsedAt" timestamptz,
  "revokedAt" timestamptz,
  "createdAt" timestamptz not null default now()
);

create index if not exists "ApiKey_userId_idx" on myformsvault."ApiKey" ("userId");
create index if not exists "ApiKey_keyPrefix_idx" on myformsvault."ApiKey" ("keyPrefix");

alter table myformsvault."Profile" enable row level security;
alter table myformsvault.admins enable row level security;
alter table myformsvault."Subscription" enable row level security;
alter table myformsvault."AuditLog" enable row level security;
alter table myformsvault."ApiKey" enable row level security;

create or replace function myformsvault.is_admin()
returns boolean
language sql
stable
security definer
set search_path = myformsvault, public
as $$
  select exists (
    select 1 from myformsvault."Profile"
    where "userId" = auth.uid()::text and is_admin = true
  )
  or exists (
    select 1 from myformsvault.admins
    where lower(email) = lower(coalesce(auth.email(), '')) and is_admin = true
  );
$$;

drop policy if exists "profiles_select_self_or_admin" on myformsvault."Profile";
create policy "profiles_select_self_or_admin"
  on myformsvault."Profile"
  for select
  using ("userId" = auth.uid()::text or myformsvault.is_admin());

drop policy if exists "profiles_update_self_or_admin" on myformsvault."Profile";
create policy "profiles_update_self_or_admin"
  on myformsvault."Profile"
  for update
  using ("userId" = auth.uid()::text or myformsvault.is_admin());

drop policy if exists "admins_select_admins" on myformsvault.admins;
create policy "admins_select_admins"
  on myformsvault.admins
  for select
  using (myformsvault.is_admin());

drop policy if exists "subscriptions_select_self_or_admin" on myformsvault."Subscription";
create policy "subscriptions_select_self_or_admin"
  on myformsvault."Subscription"
  for select
  using ("userId" = auth.uid()::text or myformsvault.is_admin());

drop policy if exists "audit_select_self_or_admin" on myformsvault."AuditLog";
create policy "audit_select_self_or_admin"
  on myformsvault."AuditLog"
  for select
  using ("userId" = auth.uid()::text or myformsvault.is_admin());

drop policy if exists "api_keys_owner" on myformsvault."ApiKey";
create policy "api_keys_owner"
  on myformsvault."ApiKey"
  for all
  using ("userId" = auth.uid()::text)
  with check ("userId" = auth.uid()::text);

create or replace function myformsvault.get_admin_stats(
  subscription_status text default null,
  audit_action text default null,
  from_date timestamptz default null,
  to_date timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = myformsvault, public
as $$
declare
  stats jsonb;
begin
  if not myformsvault.is_admin() then
    raise exception 'admin access required';
  end if;

  select jsonb_build_object(
    'totalUsers', (select count(*) from myformsvault."Profile"),
    'totalTemplates', (select count(*) from myformsvault."FormTemplate"),
    'proSubscribers', (
      select count(*) from myformsvault."Subscription"
      where status in ('active', 'trialing')
    ),
    'mrrCents', coalesce((
      select sum(case when interval = 'year' then round("amountCents" / 12.0)::int else "amountCents" end)
      from myformsvault."Subscription"
      where status in ('active', 'trialing')
    ), 0),
    'recentSignups', coalesce((
      select jsonb_agg(to_jsonb(p) order by p."createdAt" desc)
      from (
        select id, email, "fullName", plan, "createdAt"
        from myformsvault."Profile"
        order by "createdAt" desc
        limit 10
      ) p
    ), '[]'::jsonb),
    'subscriptions', coalesce((
      select jsonb_agg(to_jsonb(s) order by s."updatedAt" desc)
      from (
        select *
        from myformsvault."Subscription"
        where subscription_status is null or status = subscription_status
        order by "updatedAt" desc
        limit 50
      ) s
    ), '[]'::jsonb),
    'auditLogs', coalesce((
      select jsonb_agg(to_jsonb(a) order by a."createdAt" desc)
      from (
        select *
        from myformsvault."AuditLog"
        where (audit_action is null or action = audit_action)
          and (from_date is null or "createdAt" >= from_date)
          and (to_date is null or "createdAt" <= to_date)
        order by "createdAt" desc
        limit 100
      ) a
    ), '[]'::jsonb)
  )
  into stats;

  return stats;
end;
$$;
