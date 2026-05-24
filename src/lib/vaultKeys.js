// src/lib/vaultKeys.js
// Drop-in replacement for localStorage API key storage.
// Stores and retrieves keys via the Supabase Vault Edge Function.

import { supabase } from './supabase'

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/vault-keys`

async function getAuthHeader() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')
  return { Authorization: `Bearer ${session.access_token}` }
}

/** Save one API key to Vault. keyName = 'anthropic' | 'openai' | 'moz' etc. */
export async function saveApiKey(keyName, keyValue) {
  const headers = await getAuthHeader()
  const res = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ key_name: keyName, key_value: keyValue }),
  })
  if (!res.ok) throw new Error((await res.json()).error || 'Failed to save key')
  return true
}

/** Load all API keys for the current user. Returns { anthropic: '...', openai: '...' } */
export async function loadApiKeys() {
  const headers = await getAuthHeader()
  const res = await fetch(FUNCTION_URL, { method: 'GET', headers })
  if (!res.ok) throw new Error((await res.json()).error || 'Failed to load keys')
  return (await res.json()).keys || {}
}

/** Delete one key from Vault. */
export async function deleteApiKey(keyName) {
  const headers = await getAuthHeader()
  const res = await fetch(FUNCTION_URL, {
    method: 'DELETE',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ key_name: keyName }),
  })
  if (!res.ok) throw new Error((await res.json()).error || 'Failed to delete key')
  return true
}

/**
 * One-time migration: move keys from localStorage into Vault then wipe them.
 * Call from App.jsx on first authenticated load.
 */
export async function migrateLocalStorageKeysToVault() {
  const MAP = {
    rf_anthropic_key: 'anthropic',
    rf_openai_key:    'openai',
    rf_gemini_key:    'gemini',
    rf_gsc_key:       'google_search_console',
    rf_gbp_key:       'google_business_profile',
    rf_moz_key:       'moz',
    rf_yext_key:      'yext',
    rf_indexnow_key:  'indexnow',
    rf_gmail_token:   'gmail_token',
  }
  let migrated = 0
  for (const [local, vault] of Object.entries(MAP)) {
    const val = localStorage.getItem(local)
    if (val?.trim()) {
      try {
        await saveApiKey(vault, val)
        localStorage.removeItem(local)
        migrated++
      } catch (e) {
        console.warn(`Migration failed for ${local}:`, e)
      }
    }
  }
  return migrated
}
