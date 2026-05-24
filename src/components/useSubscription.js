// src/hooks/useSubscription.js
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useSubscription(userId) {
  const [subscription, setSubscription] = useState(null)
  const [loading, setLoading]           = useState(true)

  useEffect(() => {
    if (!userId) return
    supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single()
      .then(({ data }) => {
        setSubscription(data || null)
        setLoading(false)
      })
  }, [userId])

  const updateSubscription = useCallback(async (updates) => {
    setSubscription(prev => ({ ...prev, ...updates }))
    await supabase
      .from('subscriptions')
      .upsert({ ...updates, user_id: userId }, { onConflict: 'user_id' })
  }, [userId])

  const completeOnboarding = useCallback(async () => {
    await updateSubscription({ onboarding_completed: true, onboarding_step: 99 })
  }, [updateSubscription])

  return { subscription, loading, updateSubscription, completeOnboarding }
}