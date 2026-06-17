// src/hooks/useSettings.js
// ─────────────────────────────────────────────
// Loads/saves user settings (API keys, agency branding)
// Replaces S.keys + agency fields from rankforge3.html
// ─────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const DEFAULT_SETTINGS = {
  agency_name:     'Your Agency',
  agency_tagline:  'Local SEO Specialists',
  brand_color:     '#1a237e',
  anthropic_key:   '',
  google_key:      '',
  indexnow_key:    '',
  yext_key:        '',
  yext_account:    '',
  moz_id:          '',
  moz_secret:      '',
  brightlocal_key: '',
  brightlocal_cid: '',
  gmail_token:     '',
  wr_settings:     {}
}

export function useSettings(userId) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    if (!userId) return
    supabase
      .from('settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) console.error('Settings load error:', error)
        if (data) setSettings({ ...DEFAULT_SETTINGS, ...data })
        setLoading(false)
      })
  }, [userId])

  const updateSettings = useCallback(async (updates) => {
    setSettings(prev => ({ ...prev, ...updates }))
    const { error } = await supabase
      .from('settings')
      .upsert({ ...updates, user_id: userId }, { onConflict: 'user_id' })
    if (error) console.error('Settings save error:', error)
  }, [userId])

  return { settings, updateSettings, loading }
}