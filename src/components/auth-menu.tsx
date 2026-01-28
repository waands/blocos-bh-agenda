"use client"

import { useEffect, useMemo, useRef, useState } from "react"

import { supabaseClient } from "@/lib/supabaseClient"
import { useAuth } from "@/lib/useAuth"

type AuthMenuProps = {
  syncing: boolean
}

const avatarPalette = [
  { bg: "bg-sky-100", text: "text-sky-700" },
  { bg: "bg-emerald-100", text: "text-emerald-700" },
  { bg: "bg-violet-100", text: "text-violet-700" },
  { bg: "bg-amber-100", text: "text-amber-700" },
  { bg: "bg-rose-100", text: "text-rose-700" },
  { bg: "bg-teal-100", text: "text-teal-700" },
]

const avatarFonts = ["font-sans", "font-serif", "font-mono"]

const getInitials = (value: string) => {
  const cleaned = value
    .replace(/[^a-zA-ZÀ-ÿ0-9\s]/g, " ")
    .trim()
  if (!cleaned) return "?"
  const parts = cleaned.split(/\s+/)
  const letters =
    parts.length >= 2
      ? `${parts[0][0]}${parts[1][0]}`
      : cleaned.slice(0, 2)
  return letters.toUpperCase()
}

const hashValue = (value: string) => {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

const getStorageKey = (userId?: string) =>
  `agenda:profile-name:${userId ?? "guest"}`

export function AuthMenu({ syncing }: AuthMenuProps) {
  const { user, loading } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [feedback, setFeedback] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const popoverRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!isOpen) return
    const handleClick = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    document.addEventListener("keydown", handleEscape)
    return () => {
      document.removeEventListener("mousedown", handleClick)
      document.removeEventListener("keydown", handleEscape)
    }
  }, [isOpen])

  useEffect(() => {
    if (typeof window === "undefined") return
    const key = getStorageKey(user?.id)
    const stored = window.localStorage.getItem(key)
    const fallback =
      (user?.user_metadata?.full_name as string | undefined) ??
      user?.email?.split("@")[0] ??
      ""
    setDisplayName(stored ?? fallback)
  }, [user])

  const label = useMemo(() => {
    if (displayName) return displayName
    if (user?.email) return user.email
    return "Visitante"
  }, [displayName, user?.email])

  const avatarSeed = useMemo(() => {
    return displayName || user?.email || "visitante"
  }, [displayName, user?.email])

  const avatarStyle = useMemo(() => {
    const hash = hashValue(avatarSeed)
    const palette = avatarPalette[hash % avatarPalette.length]
    const font = avatarFonts[hash % avatarFonts.length]
    return { palette, font }
  }, [avatarSeed])

  const handleGoogleSignIn = async () => {
    setIsSubmitting(true)
    setErrorMessage(null)
    setFeedback(null)
    try {
      const { error } = await supabaseClient.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo:
            typeof window !== "undefined" ? window.location.origin : undefined,
        },
      })
      if (error) throw error
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Não foi possível iniciar o login com Google."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEmailSignIn = async () => {
    if (!email) return
    setIsSubmitting(true)
    setErrorMessage(null)
    setFeedback(null)
    try {
      const { error } = await supabaseClient.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo:
            typeof window !== "undefined" ? window.location.origin : undefined,
        },
      })
      if (error) throw error
      setFeedback(
        "Enviamos um link de acesso. Abra o e-mail para concluir o login."
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

  const handleSaveName = () => {
    if (typeof window === "undefined") return
    const key = getStorageKey(user?.id)
    window.localStorage.setItem(key, displayName.trim())
    setFeedback("Nome atualizado.")
  }

  const handleSignOut = async () => {
    setIsSubmitting(true)
    setErrorMessage(null)
    setFeedback(null)
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
    <div className="relative" ref={popoverRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-2 rounded-full border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm hover:bg-accent/40"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold uppercase ${avatarStyle.palette.bg} ${avatarStyle.palette.text} ${avatarStyle.font}`}
        >
          {getInitials(label)}
        </span>
        <span className="hidden text-sm font-medium sm:block">
          {user ? "Perfil" : "Entrar"}
        </span>
      </button>

      {isOpen ? (
        <div
          role="dialog"
          aria-label="Entrar ou ver perfil"
          className="absolute right-0 z-50 mt-3 w-[min(92vw,360px)] rounded-2xl border border-border/70 bg-card p-4 shadow-lg"
        >
          {loading ? (
            <p className="text-sm text-muted-foreground">
              Carregando informações da conta...
            </p>
          ) : user ? (
            <div className="space-y-4">
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">
                  Perfil
                </p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {user.email}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {syncing
                    ? "Sincronizando escolhas agora."
                    : "Sincronização automática ativa."}
                </p>
              </div>
              <label className="flex flex-col gap-2 text-sm text-muted-foreground">
                <span>Nome exibido</span>
                <input
                  type="text"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="Seu nome ou apelido"
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveName}
                  className="rounded-full border border-border bg-background px-4 py-2 text-sm text-foreground shadow-sm hover:bg-accent/40"
                >
                  Salvar nome
                </button>
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={isSubmitting}
                  className="rounded-full border border-border bg-background px-4 py-2 text-sm text-foreground shadow-sm hover:bg-accent/40 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Sair
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">
                  Entrar
                </p>
                <h2 className="mt-1 text-base font-semibold text-foreground">
                  Guarde seus blocos entre dispositivos
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Assim que você entrar, suas escolhas ficam prontas para
                  compartilhar.
                </p>
              </div>
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isSubmitting}
                className="flex w-full items-center justify-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm text-foreground shadow-sm hover:bg-accent/40 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="h-4 w-4 rounded-full border border-border" />
                Entrar com Google
              </button>
              <label className="flex flex-col gap-2 text-sm text-muted-foreground">
                <span>Entrar com e-mail</span>
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
                onClick={handleEmailSignIn}
                disabled={!email || isSubmitting}
                className="rounded-full border border-border bg-background px-4 py-2 text-sm text-foreground shadow-sm hover:bg-accent/40 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Enviar link de acesso
              </button>
              <label className="flex flex-col gap-2 text-sm text-muted-foreground">
                <span>Nome exibido</span>
                <input
                  type="text"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="Seu nome ou apelido"
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </label>
              <button
                type="button"
                onClick={handleSaveName}
                className="rounded-full border border-border bg-background px-4 py-2 text-sm text-foreground shadow-sm hover:bg-accent/40"
              >
                Salvar nome local
              </button>
            </div>
          )}
          {feedback ? (
            <p className="mt-3 text-xs text-primary">{feedback}</p>
          ) : null}
          {errorMessage ? (
            <p className="mt-3 text-xs text-destructive">{errorMessage}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
