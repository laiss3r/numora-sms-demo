-- Optional: apply this standalone migration only if enabling webhooks.
-- Polling the authenticated provider APIs does not need a database.
begin;
create table if not exists public.webhook_receipts (
 id uuid primary key default gen_random_uuid(),
 provider text not null check(provider in ('twilio','textbee')),
 event_id text not null,
 payload_digest text not null check(length(payload_digest)=64),
 received_at timestamptz not null default now(),
 unique(provider,event_id)
);
alter table public.webhook_receipts enable row level security;
revoke all on public.webhook_receipts from anon,authenticated;
grant select,insert on public.webhook_receipts to service_role;
-- No message content, credentials, raw payloads or unauthenticated writes.
commit;
