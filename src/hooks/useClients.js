// src/hooks/useClients.js
// ─────────────────────────────────────────────
// Replaces the CM (Client Management) object
// from rankforge3.html localStorage with real DB calls
// ─────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useClients(userId) {
  const [clients, setClients]     = useState([])
  const [activeId, setActiveIdRaw] = useState(() => sessionStorage.getItem('rf_active_client') || null)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)

  // Persist activeId to sessionStorage whenever it changes
  const setActiveId = (id) => {
    if (id) sessionStorage.setItem('rf_active_client', id)
    else sessionStorage.removeItem('rf_active_client')
    setActiveIdRaw(id)
  }

  // ── Load all clients for this user ─────────────────
  const loadClients = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })

    if (error) setError(error.message)
    else {
      setClients(data || [])
      // Auto-select first client if no activeId stored or stored id no longer exists
      const stored = sessionStorage.getItem('rf_active_client')
      const valid  = stored && (data || []).some(c => c.id === stored)
      if (!valid && data?.length > 0) setActiveId(data[0].id)
    }
    setLoading(false)
  }, [userId])

  useEffect(() => { loadClients() }, [loadClients])

  // ── Create a new client ────────────────────────────
  const createClient = async (name) => {
    const colors = ['#1A6FBF','#1C7A37','#6B3FA0','#D97706','#C0392B','#0E7090']
    const color  = colors[clients.length % colors.length]

    const { data, error } = await supabase
      .from('clients')
      .insert({ user_id: userId, name, color })
      .select()
      .single()

    if (error) { setError(error.message); return null }

    // Also create an empty client_data row
    await supabase.from('client_data').insert({
      client_id: data.id,
      user_id:   userId,
      biz_name:  name
    })

    setClients(prev => [data, ...prev])
    setActiveId(data.id)
    return data
  }

  // ── Delete a client ────────────────────────────────
  const deleteClient = async (clientId) => {
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', clientId)

    if (error) { setError(error.message); return }
    setClients(prev => prev.filter(c => c.id !== clientId))
    if (activeId === clientId) setActiveId(clients[0]?.id || null)
  }

  // ── Update client metadata (score, city, etc) ──────
  const updateClientMeta = async (clientId, updates) => {
    const { error } = await supabase
      .from('clients')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', clientId)

    if (error) { setError(error.message); return }
    setClients(prev => prev.map(c => c.id === clientId ? { ...c, ...updates } : c))
  }

  return { clients, activeId, setActiveId, loading, error, createClient, deleteClient, updateClientMeta, reload: loadClients }
}