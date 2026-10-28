// The only way a photo reaches a profile. See the migration
// 20261029090000_profile_photo.sql for the whole sequence and why no client
// can write the photo itself.
//
// POST   a JPEG body: checked, analysed, stored, set on the caller's profile.
// DELETE no body:     the caller's photo removed, the piece shown again.
//
// Secrets: OPENAI_API_KEY, set with `supabase secrets set`. SUPABASE_URL and
// SUPABASE_SERVICE_ROLE_KEY are provided by the platform.

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.117.3'
import {
  checkUpload,
  MAX_PHOTO_BYTES,
  type PhotoErrorCode,
  readModeration,
  statusFor,
  toBase64,
} from './rules.ts'

const BUCKET = 'avatars'

// The token is a bearer header, not a cookie, so another site cannot borrow a
// player's session through this; any origin may ask.
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
}

function reply(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

const fail = (code: PhotoErrorCode) => reply(statusFor(code), { error: code })

async function moderate(bytes: Uint8Array): Promise<'accepted' | 'refused' | null> {
  const key = Deno.env.get('OPENAI_API_KEY')
  if (!key) return null
  try {
    const response = await fetch('https://api.openai.com/v1/moderations', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'omni-moderation-latest',
        input: [
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${toBase64(bytes)}` } },
        ],
      }),
      signal: AbortSignal.timeout(15_000),
    })
    if (!response.ok) return null
    return readModeration(await response.json())
  } catch {
    return null
  }
}

async function upload(admin: SupabaseClient, userId: string, bytes: Uint8Array) {
  const problem = checkUpload(bytes)
  if (problem) return fail(problem)

  const { error: refusal } = await admin.rpc('begin_photo_upload', { p_user: userId })
  if (refusal) {
    return fail(
      refusal.hint === 'rate_limited' || refusal.hint === 'under_review' ? refusal.hint : 'failed',
    )
  }

  // Fails closed: with the analysis unavailable, nothing goes up unchecked.
  const verdict = await moderate(bytes)
  if (verdict === null) return fail('unavailable')
  if (verdict === 'refused') return fail('refused')

  const path = `${userId}/${crypto.randomUUID()}.jpg`
  const { error: stored } = await admin.storage.from(BUCKET).upload(path, bytes, {
    contentType: 'image/jpeg',
    // A new name for every photo, so the file under one never changes.
    cacheControl: '31536000',
    upsert: false,
  })
  if (stored) return fail('failed')

  const { data: previous, error: set } = await admin.rpc('set_profile_photo', {
    p_user: userId,
    p_path: path,
  })
  if (set) {
    await admin.storage.from(BUCKET).remove([path])
    return fail('failed')
  }
  if (typeof previous === 'string') await admin.storage.from(BUCKET).remove([previous])
  return reply(200, { photo_path: path })
}

async function remove(admin: SupabaseClient, userId: string) {
  const { data: previous, error } = await admin.rpc('clear_profile_photo', { p_user: userId })
  if (error) return fail('failed')
  // Only the photo on the profile: one taken down by reports stays in the
  // bucket until it has been reviewed.
  if (typeof previous === 'string') {
    const { error: removed } = await admin.storage.from(BUCKET).remove([previous])
    if (removed) return fail('failed')
  }
  return reply(200, { photo_path: null })
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: CORS })

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )

  // The player is whoever the token says, verified by Auth, never a parameter.
  const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') ?? ''
  const { data } = token ? await admin.auth.getUser(token) : { data: { user: null } }
  const user = data.user
  if (!user) return fail('unauthenticated')

  if (request.method === 'DELETE') return remove(admin, user.id)
  if (request.method === 'POST') {
    // Before reading the body: an oversized one is refused without holding it.
    if (Number(request.headers.get('Content-Length') ?? 0) > MAX_PHOTO_BYTES) {
      return fail('too_large')
    }
    return upload(admin, user.id, new Uint8Array(await request.arrayBuffer()))
  }
  return reply(405, { error: 'failed' })
})
