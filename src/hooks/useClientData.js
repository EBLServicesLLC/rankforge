// src/hooks/useClientData.js
// ─────────────────────────────────────────────
// Replaces S object + localStorage in rankforge3.html
// Loads/saves all campaign data for the active client
// ─────────────────────────────────────────────

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'

// Default empty state — mirrors the S object in rankforge3.html
const DEFAULT_DATA = {
  biz_name: '', biz_cat: '', biz_addr: '', biz_city: '',
  biz_state: '', biz_zip: '', biz_phone: '', biz_website: '',
  biz_desc: '', biz_kw: '',
  dir_status: {}, bl_status: {}, w2_status: {}, checklist: {},
  gbp_posts: [], review_requests: [], service_cities: [],
  locations: [], kw_matrix: [], lp_pages: {},
  rep_reviews: [], score_history: [], gmb_insights: {},
  publish_queue: [], sp_data: {}
}

export function useClientData(clientId, userId) {
  const [data, setData]       = useState(DEFAULT_DATA)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving]   = useState(false)
  const saveTimer             = useRef(null)

  // ── Load client data when clientId changes ─────────
  useEffect(() => {
    if (!clientId || !userId) { setData(DEFAULT_DATA); return }

    setLoading(true)
    supabase
      .from('client_data')
      .select('*')
      .eq('client_id', clientId)
      .single()
      .then(({ data: row, error }) => {
        if (error && error.code !== 'PGRST116') {
          // PGRST116 = no rows found — that's fine for new clients
          console.error('Load error:', error)
        }
        setData(row ? { ...DEFAULT_DATA, ...row } : DEFAULT_DATA)
        setLoading(false)
      })
  }, [clientId, userId])

  // ── Update a field or object locally ──────────────
  const update = useCallback((field, value) => {
    setData(prev => ({ ...prev, [field]: value }))
  }, [])

  // ── Patch a nested key inside a JSON field ─────────
  // e.g. patchJson('dir_status', dirId, { status: 'submitted' })
  const patchJson = useCallback((field, key, value) => {
    setData(prev => ({
      ...prev,
      [field]: { ...prev[field], [key]: value }
    }))
  }, [])

  // ── Save to Supabase (debounced 1.5s) ─────────────
  const save = useCallback(async (overrideData) => {
    if (!clientId || !userId) return
    const payload = overrideData || data

    setSaving(true)
    const { error } = await supabase
      .from('client_data')
      .upsert({
        ...payload,
        client_id:  clientId,
        user_id:    userId,
        updated_at: new Date().toISOString()
      }, { onConflict: 'client_id' })

    if (error) console.error('Save error:', error)
    setSaving(false)
  }, [clientId, userId, data])

  // ── Auto-save with debounce ────────────────────────
  const autoSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => save(), 1500)
  }, [save])

  // ── Persist: call this wherever rankforge3 calls persist()
  const persist = useCallback(() => {
    autoSave()
  }, [autoSave])

  return { data, update, patchJson, save, persist, loading, saving }
}