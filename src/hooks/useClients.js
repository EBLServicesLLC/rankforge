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
  const createClient = async (data) => {
    const name = typeof data === 'string' ? data : data.name
    const colors = ['#1A6FBF','#1C7A37','#6B3FA0','#D97706','#C0392B','#0E7090']
    const color  = colors[clients.length % colors.length]

    const { data: clientRow, error } = await supabase
      .from('clients')
      .insert({ user_id: userId, name, color })
      .select()
      .single()

    if (error) { setError(error.message); return null }

    // Save all client_data fields if provided
    const clientData = {
      client_id: clientRow.id,
      user_id:   userId,
      biz_name:  name,
    }
    if (typeof data === 'object') {
      if (data.addr)     clientData.biz_addr    = data.addr
      if (data.city)     clientData.biz_city    = data.city
      if (data.state)    clientData.biz_state   = data.state
      if (data.zip)      clientData.biz_zip     = data.zip
      if (data.phone)    clientData.biz_phone   = data.phone
      if (data.website)  clientData.biz_website = data.website
      if (data.category) clientData.biz_cat     = data.category
      if (data.desc)     clientData.biz_desc    = data.desc
      if (data.keywords) clientData.biz_kw      = data.keywords
    }
    await supabase.from('client_data').insert(clientData)

    setClients(prev => [clientRow, ...prev])
    setActiveId(clientRow.id)
    return clientRow
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

  // ── Update client_data (website, phone, address, etc) ──
  const updateClientData = async (clientId, fields) => {
    const { error } = await supabase
      .from('client_data')
      .upsert({ client_id: clientId, user_id: userId, ...fields }, { onConflict: 'client_id' })

    if (error) { setError(error.message); return false }
    return true
  }

  return { clients, activeId, setActiveId, loading, error, createClient, deleteClient, updateClientMeta, updateClientData, reload: loadClients }
}