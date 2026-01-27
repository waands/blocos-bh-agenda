"use client"

import { useEffect, useState } from "react"

import { supabaseClient } from "@/lib/supabaseClient"

type AuthState = {
  user: { id: string } | null
  loading: boolean
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<AuthState["user"]>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    supabaseClient.auth
      .getSession()
      .then(({ data }) => {
        if (!isMounted) return
        setUser(data.session?.user ?? null)
      })
      .finally(() => {
        if (!isMounted) return
        setLoading(false)
      })

    const { data: listener } = supabaseClient.auth.onAuthStateChange(
      (_, session) => {
        if (!isMounted) return
        setUser(session?.user ?? null)
      }
    )

    return () => {
      isMounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

  return { user, loading }
}
