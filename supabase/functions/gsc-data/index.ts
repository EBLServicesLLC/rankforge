// supabase/functions/vault-keys/index.ts
// Edge Function: store and retrieve API keys via Supabase Vault
// Deploy: supabase functions deploy vault-keys

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create a Supabase client using the caller's JWT (respects RLS)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // Verify the caller is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Service-role client for Vault operations (Vault is not accessible via anon key)
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { method } = req
    const url = new URL(req.url)
    const action = url.searchParams.get('action') // 'get' | 'set' | 'delete'

    // ── GET: retrieve all keys for this user ──────────────────────────────
    if (method === 'GET' || action === 'get') {
      // Keys are stored with name pattern: "rf_keys_{user_id}_{key_name}"
      const { data, error } = await adminClient.rpc('vault_get_user_secrets', {
        p_user_id: user.id
      })

      if (error) throw error

      // Return decrypted key names and values
      const keys: Record<string, string> = {}
      for (const secret of (data || [])) {
        // Strip the user prefix from the name
        const keyName = secret.name.replace(`rf_keys_${user.id}_`, '')
        keys[keyName] = secret.decrypted_secret
      }

      return new Response(JSON.stringify({ keys }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // ── POST: store/update a key ──────────────────────────────────────────
    if (method === 'POST' || action === 'set') {
      const body = await req.json()
      const { key_name, key_value } = body

      if (!key_name || typeof key_value !== 'string') {
        return new Response(JSON.stringify({ error: 'key_name and key_value required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Validate key_name is one of the allowed keys (whitelist)
      const ALLOWED_KEYS = [
        'anthropic', 'openai', 'gemini', 'google_search_console',
        'google_business_profile', 'moz', 'yext', 'indexnow', 'gmail_token'
      ]
      if (!ALLOWED_KEYS.includes(key_name)) {
        return new Response(JSON.stringify({ error: 'Invalid key name' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const secretName = `rf_keys_${user.id}_${key_name}`

      // Check if secret already exists
      const { data: existing } = await adminClient
        .from('vault.secrets')
        .select('id')
        .eq('name', secretName)
        .single()

      if (existing?.id) {
        // Update existing secret
        const { error } = await adminClient.rpc('vault_update_secret', {
          p_id: existing.id,
          p_secret: key_value
        })
        if (error) throw error
      } else {
        // Insert new secret
        const { error } = await adminClient.rpc('vault_create_secret', {
          p_name: secretName,
          p_secret: key_value,
          p_description: `API key for user ${user.id}`
        })
        if (error) throw error
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // ── DELETE: remove a key ──────────────────────────────────────────────
    if (method === 'DELETE' || action === 'delete') {
      const body = await req.json()
      const { key_name } = body
      const secretName = `rf_keys_${user.id}_${key_name}`

      const { error } = await adminClient.rpc('vault_delete_secret', {
        p_name: secretName
      })
      if (error) throw error

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err) {
    console.error('vault-keys error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
