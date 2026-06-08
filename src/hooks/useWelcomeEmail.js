// src/hooks/useWelcomeEmail.js
// Call sendWelcomeEmail(user) right after a successful signup
import { supabase } from '../lib/supabase'

export function useWelcomeEmail() {
  const sendWelcomeEmail = async (user) => {
    if (!user?.email) return
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`,
        {
          method: 'POST',
          headers: {
            'Content-Type':  'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            action: 'welcome',
            to:     user.email,
            name:   user.user_metadata?.name || user.email.split('@')[0],
          }),
        }
      )
      const data = await res.json()
      if (data.sent) console.log('Welcome email sent to', user.email)
      else console.warn('Welcome email not sent:', data)
    } catch (err) {
      console.error('Welcome email error:', err.message)
    }
  }

  return { sendWelcomeEmail }
}
