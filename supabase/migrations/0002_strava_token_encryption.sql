-- ============================================================================
-- Unbroken — Strava token encryption (Phase 5)
--
-- Strava access/refresh tokens are stored as pgcrypto ciphertext, not
-- plaintext. The encryption key (STRAVA_TOKEN_ENCRYPTION_KEY) lives only in
-- server-side environment variables — the Next.js server and the
-- strava-webhook Edge Function — and is passed as a parameter at call time,
-- so the key itself is never persisted in the database.
--
-- Reading/writing tokens is only possible through these SECURITY DEFINER
-- functions, which are granted to service_role only (except clear, which a
-- user can call on themselves to disconnect without needing the key).
-- ============================================================================

alter table public.users
  alter column strava_access_token type bytea using strava_access_token::bytea,
  alter column strava_refresh_token type bytea using strava_refresh_token::bytea;

create or replace function public.save_strava_tokens(
  p_user_id uuid,
  p_athlete_id bigint,
  p_access_token text,
  p_refresh_token text,
  p_expires_at timestamptz,
  p_encryption_key text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.users
  set
    strava_athlete_id = p_athlete_id,
    strava_access_token = pgp_sym_encrypt(p_access_token, p_encryption_key),
    strava_refresh_token = pgp_sym_encrypt(p_refresh_token, p_encryption_key),
    strava_token_expires_at = p_expires_at
  where id = p_user_id;
end;
$$;

create or replace function public.get_strava_tokens(
  p_user_id uuid,
  p_encryption_key text
)
returns table (
  access_token text,
  refresh_token text,
  expires_at timestamptz,
  athlete_id bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    case when u.strava_access_token is null then null
      else pgp_sym_decrypt(u.strava_access_token, p_encryption_key) end,
    case when u.strava_refresh_token is null then null
      else pgp_sym_decrypt(u.strava_refresh_token, p_encryption_key) end,
    u.strava_token_expires_at,
    u.strava_athlete_id
  from public.users u
  where u.id = p_user_id;
end;
$$;

create or replace function public.clear_strava_tokens(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is distinct from p_user_id then
    raise exception 'not authorized';
  end if;

  update public.users
  set
    strava_athlete_id = null,
    strava_access_token = null,
    strava_refresh_token = null,
    strava_token_expires_at = null
  where id = p_user_id;
end;
$$;

revoke execute on function public.save_strava_tokens(uuid, bigint, text, text, timestamptz, text) from public, anon, authenticated;
revoke execute on function public.get_strava_tokens(uuid, text) from public, anon, authenticated;

grant execute on function public.save_strava_tokens(uuid, bigint, text, text, timestamptz, text) to service_role;
grant execute on function public.get_strava_tokens(uuid, text) to service_role;
grant execute on function public.clear_strava_tokens(uuid) to authenticated, service_role;
