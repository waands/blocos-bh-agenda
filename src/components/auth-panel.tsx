"use client"

import { useState } from "react"

import { supabaseClient } from "@/lib/supabaseClient"
import { useAuth } from "@/lib/useAuth"

type AuthPanelProps = {
  isAuthenticated: boolean
  syncing: boolean
}

export function AuthPanel({ isAuthenticated, syncing }: AuthPanelProps) {
  const { user, loading } = useAuth()
  const [email, setEmail] = useState("")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSignIn = async () => {
    if (!email) return
    setIsSubmitting(true)
    setErrorMessage(null)
    setSuccessMessage(null)
    try {
      const { error } = await supabaseClient.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo:
            typeof window !== "undefined" ? window.location.origin : undefined,
        },
      })
      if (error) throw error
      setSuccessMessage(
        "Enviamos um link de acesso para o seu e-mail. Basta abrir para entrar."
      )
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Não foi possível enviar o link de acesso."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSignOut = async () => {
    setIsSubmitting(true)
    setErrorMessage(null)
    setSuccessMessage(null)
    try {
      const { error } = await supabaseClient.auth.signOut()
      if (error) throw error
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Não foi possível sair agora."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Conta e sincronização
          </p>
          <h2 className="mt-2 text-lg font-semibold text-foreground">
            Salve suas escolhas para usar em qualquer dispositivo
          </h2>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Ao entrar, seus status e anotações ficam sincronizados e prontos
            para compartilhar quando o recurso estiver disponível.
          </p>
          {isAuthenticated ? (
            <p className="mt-3 text-xs text-muted-foreground">
              {syncing
                ? "Sincronizando agora..."
                : "Sincronização automática ativa."}
            </p>
          ) : null}
        </div>

        <div className="flex w-full flex-col gap-3 sm:max-w-sm">
          {loading ? (
            <p className="text-sm text-muted-foreground">
              Carregando status da conta...
            </p>
          ) : user ? (
            <>
              <div className="rounded-xl border border-border/70 bg-muted/40 px-4 py-3 text-sm text-foreground">
                Conectado como{" "}
                <span className="font-semibold">
                  {user.email ?? "usuário autenticado"}
                </span>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                disabled={isSubmitting}
                className="rounded-full border border-border bg-background px-4 py-2 text-sm text-foreground shadow-sm hover:bg-accent/40 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Sair
              </button>
            </>
          ) : (
            <>
              <label className="flex flex-col gap-2 text-sm text-muted-foreground">
                <span>Entre com seu e-mail</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="voce@exemplo.com"
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </label>
              <button
                type="button"
                onClick={handleSignIn}
                disabled={!email || isSubmitting}
                className="rounded-full border border-border bg-background px-4 py-2 text-sm text-foreground shadow-sm hover:bg-accent/40 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Enviar link de acesso
              </button>
            </>
          )}
          {successMessage ? (
            <p className="text-xs text-primary">{successMessage}</p>
          ) : null}
          {errorMessage ? (
            <p className="text-xs text-destructive">{errorMessage}</p>
          ) : null}
        </div>
      </div>
    </section>
  )
}
