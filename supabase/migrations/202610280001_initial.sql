-- FUTURE BACKEND FOUNDATION. Not required or connected to the demo.
-- Apply in a disposable Supabase project first. Requires Supabase auth schema/roles.
begin;
create type public.app_role as enum ('customer', 'admin');
create type public.rental_status as enum ('active','expired','cancelled');
create type public.transaction_type as enum ('credit','rental','refund');
create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null check (length(display_name) between 2 and 60),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.user_roles (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
 role public.app_role not null default 'customer', created_at timestamptz not null default now(), unique(user_id,role)
);
create table public.countries (
 id uuid primary key default gen_random_uuid(), iso_code char(2) not null unique, name text not null,
 calling_code text not null check(calling_code ~ '^\+[0-9]{1,3}$'), enabled boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.phone_numbers (
 id uuid primary key default gen_random_uuid(), country_id uuid not null references public.countries(id),
 display_number text not null unique, provider text, provider_number_id text,
 daily_price_minor bigint not null check(daily_price_minor>0), currency char(3) not null default 'USD',
 is_demo boolean not null default true, enabled boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(provider,provider_number_id)
);
create table public.number_capabilities (
 id uuid primary key default gen_random_uuid(), number_id uuid not null references public.phone_numbers(id) on delete cascade,
 capability text not null check(capability in ('incoming_sms','voice')), created_at timestamptz not null default now(), unique(number_id,capability)
);
create table public.rentals (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id),
 number_id uuid not null references public.phone_numbers(id), status public.rental_status not null default 'active',
 starts_at timestamptz not null default now(), expires_at timestamptz not null,
 cost_minor bigint not null check(cost_minor>0), currency char(3) not null, idempotency_key text not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(expires_at>starts_at), unique(user_id,idempotency_key), unique(id,user_id)
);
-- Server reservation must expire overdue rows inside its locking transaction first.
create unique index one_active_rental_per_number on public.rentals(number_id) where status='active';
create index rentals_owner_status on public.rentals(user_id,status);
create index rentals_expiration on public.rentals(expires_at) where status='active';
create table public.messages (
 id uuid primary key default gen_random_uuid(), rental_id uuid not null, user_id uuid not null,
 provider text, provider_message_id text, sender text not null check(length(sender)<=100),
 body text not null check(length(body)<=2000), is_demo boolean not null default true,
 received_at timestamptz not null default now(), read_at timestamptz, delete_after timestamptz not null default now()+interval '30 days',
 created_at timestamptz not null default now(),
 foreign key(rental_id,user_id) references public.rentals(id,user_id) on delete cascade,
 unique(provider,provider_message_id)
);
create index messages_owner_received on public.messages(user_id,received_at desc);
create index messages_rental on public.messages(rental_id);
create index messages_retention on public.messages(delete_after);
create table public.wallets (
 id uuid primary key default gen_random_uuid(), user_id uuid not null unique references public.profiles(id),
 currency char(3) not null default 'USD', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.transactions (
 id uuid primary key default gen_random_uuid(), wallet_id uuid not null references public.wallets(id),
 rental_id uuid references public.rentals(id), amount_minor bigint not null check(amount_minor<>0),
 type public.transaction_type not null, idempotency_key text not null, description text not null,
 created_at timestamptz not null default now(), unique(wallet_id,idempotency_key),
 check((type='rental' and amount_minor<0) or (type in ('credit','refund') and amount_minor>0))
);
create unique index one_refund_per_rental on public.transactions(rental_id) where type='refund';
create index transactions_wallet_created on public.transactions(wallet_id,created_at desc);
create table public.provider_events (
 id uuid primary key default gen_random_uuid(), provider text not null, event_id text not null,
 payload_digest text not null, status text not null check(status in ('received','processed','failed')),
 received_at timestamptz not null default now(), processed_at timestamptz, unique(provider,event_id)
);
create table public.audit_logs (
 id uuid primary key default gen_random_uuid(), actor_id uuid references public.profiles(id) on delete set null,
 action text not null, target_type text not null, target_id uuid, created_at timestamptz not null default now()
 -- Intentionally no arbitrary body/payload field: do not store SMS content or secrets here.
);
create index audit_actor_time on public.audit_logs(actor_id,created_at desc);
create table public.user_preferences (
 id uuid primary key default gen_random_uuid(), user_id uuid not null unique references public.profiles(id) on delete cascade,
 dark_mode boolean not null default false, notifications boolean not null default true,
 message_retention_days integer not null default 30 check(message_retention_days between 1 and 90),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
-- No browser role can mutate inventory, roles, rentals, balances or provider events.
-- All privileged writes must go through reviewed server authorization and transactions.
do $$ declare t text; begin
 foreach t in array array['profiles','user_roles','countries','phone_numbers','number_capabilities','rentals','messages','wallets','transactions','provider_events','audit_logs','user_preferences'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon, authenticated',t);
 execute format('grant all on public.%I to service_role',t);
 end loop;
end $$;
grant select on public.countries,public.phone_numbers,public.number_capabilities to anon,authenticated;
grant select on public.profiles,public.user_roles,public.rentals,public.messages,public.wallets,public.transactions,public.user_preferences to authenticated;
grant update(display_name) on public.profiles to authenticated;
grant update(dark_mode,notifications,message_retention_days) on public.user_preferences to authenticated;
grant update(read_at),delete on public.messages to authenticated;
create policy countries_read on public.countries for select to anon,authenticated using(enabled);
create policy numbers_read on public.phone_numbers for select to anon,authenticated using(enabled and exists(select 1 from public.countries c where c.id=country_id and c.enabled));
create policy capabilities_read on public.number_capabilities for select to anon,authenticated using(exists(select 1 from public.phone_numbers n where n.id=number_id and n.enabled));
create policy profile_read on public.profiles for select to authenticated using(id=(select auth.uid()));
create policy profile_update on public.profiles for update to authenticated using(id=(select auth.uid())) with check(id=(select auth.uid()));
create policy roles_read on public.user_roles for select to authenticated using(user_id=(select auth.uid()));
create policy rentals_read on public.rentals for select to authenticated using(user_id=(select auth.uid()));
create policy messages_read on public.messages for select to authenticated using(user_id=(select auth.uid()));
create policy messages_update on public.messages for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy messages_delete on public.messages for delete to authenticated using(user_id=(select auth.uid()));
create policy wallets_read on public.wallets for select to authenticated using(user_id=(select auth.uid()));
create policy transactions_read on public.transactions for select to authenticated using(exists(select 1 from public.wallets w where w.id=wallet_id and w.user_id=(select auth.uid())));
create policy preferences_read on public.user_preferences for select to authenticated using(user_id=(select auth.uid()));
create policy preferences_update on public.user_preferences for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
-- Ledger is the source of truth; concurrent postings serialize on the wallet row.
-- Only a trusted server may invoke this function after verifying ownership/role,
-- verified provider payment, currency, refund amount and rental state.
create function public.post_ledger_entry(p_wallet uuid,p_key text,p_amount bigint,p_type public.transaction_type,p_description text,p_rental uuid default null)
returns uuid language plpgsql security invoker set search_path=public,pg_temp as $$
declare existing public.transactions; total numeric; result uuid; owner uuid;
begin
 select user_id into owner from public.wallets where id=p_wallet for update;
 if not found then raise exception 'Wallet not found'; end if;
 select * into existing from public.transactions where wallet_id=p_wallet and idempotency_key=p_key;
 if found then
  if existing.amount_minor<>p_amount or existing.type<>p_type or existing.rental_id is distinct from p_rental then raise exception 'Idempotency conflict'; end if;
  return existing.id;
 end if;
 if p_rental is not null and not exists(select 1 from public.rentals where id=p_rental and user_id=owner) then raise exception 'Rental ownership mismatch'; end if;
 select coalesce(sum(amount_minor),0) into total from public.transactions where wallet_id=p_wallet;
 if total+p_amount<0 then raise exception 'Insufficient balance'; end if;
 insert into public.transactions(wallet_id,idempotency_key,amount_minor,type,description,rental_id) values(p_wallet,p_key,p_amount,p_type,p_description,p_rental) returning id into result;
 return result;
end $$;
revoke all on function public.post_ledger_entry(uuid,text,bigint,public.transaction_type,text,uuid) from public,anon,authenticated;
grant execute on function public.post_ledger_entry(uuid,text,bigint,public.transaction_type,text,uuid) to service_role;
create function public.touch_updated_at() returns trigger language plpgsql set search_path=public,pg_temp as $$ begin new.updated_at=now(); return new; end $$;
do $$ declare t text; begin foreach t in array array['profiles','countries','phone_numbers','rentals','wallets','user_preferences'] loop
 execute format('create trigger touch_updated_at before update on public.%I for each row execute function public.touch_updated_at()',t);
end loop; end $$;
commit;
