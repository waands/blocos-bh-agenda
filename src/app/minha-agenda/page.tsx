"use client"

import { useEffect, useMemo, useState } from "react"
import { addYears, format, startOfYear } from "date-fns"
import { ptBR } from "date-fns/locale"
import Link from "next/link"

import { AuthMenu } from "@/components/auth-menu"
import { EventRow } from "@/components/event-row"
import type { BaseEvent } from "@/lib/eventTypes"
import { supabaseClient } from "@/lib/supabaseClient"
import { useSync } from "@/lib/useSync"

type DateRange = {
  start: Date
  end: Date
}

export default function MinhaAgendaPage() {
  const { getStatus, setStatus, isAuthenticated, syncing } = useSync()
  const [events, setEvents] = useState<BaseEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    const fetchEvents = async (range: DateRange) => {
      try {
        setIsLoading(true)
        setErrorMessage(null)

        const { data, error } = await supabaseClient
          .from("events_base")
          .select("id,title,starts_at,ends_at,location,description,all_day")
          .or("is_active.is.null,is_active.eq.true")
          .gte("starts_at", range.start.toISOString())
          .lt("starts_at", range.end.toISOString())
          .order("starts_at", { ascending: true })

        if (error) throw error

        setEvents((data ?? []) as BaseEvent[])
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : "Erro ao carregar")
      } finally {
        setIsLoading(false)
      }
    }

    const start = startOfYear(new Date())
    const end = addYears(start, 1)
    void fetchEvents({ start, end })
  }, [])

  const personalEvents = useMemo(() => {
    return events
      .filter((event) => {
        const status = getStatus(event.id)
        return status === "maybe" || status === "sure"
      })
      .sort(
        (a, b) =>
          new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
      )
  }, [events, getStatus])

  const currentYearLabel = useMemo(() => {
    return format(new Date(), "yyyy", { locale: ptBR })
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/60">
      <header className="border-b border-border/70 bg-background/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-none flex-col gap-4 px-4 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              Minha agenda
            </p>
            <h1 className="text-2xl font-semibold text-foreground">
              Seus blocos marcados
            </h1>
            <p className="mt-2 max-w-lg text-sm text-muted-foreground">
              Centralize tudo o que você marcou como talvez, vou ou certeza e
              revise os horários em um só lugar.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/?view=calendar&status=marked&calendarView=month"
              className="rounded-full border border-border bg-background px-4 py-2 text-sm text-foreground shadow-sm hover:bg-accent/40"
            >
              Ver no calendário
            </Link>
            <Link
              href="/"
              className="rounded-full border border-border bg-background px-4 py-2 text-sm text-foreground shadow-sm hover:bg-accent/40"
            >
              Voltar para agenda geral
            </Link>
            <AuthMenu syncing={syncing} />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-none px-4 py-6">
        <section className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                Visão geral
              </p>
              <h2 className="mt-2 text-xl font-semibold text-foreground">
                Seus eventos salvos para {currentYearLabel}
              </h2>
            </div>
            <div className="rounded-full border border-border bg-muted/40 px-4 py-2 text-xs text-muted-foreground">
              {personalEvents.length} blocos marcados
            </div>
          </div>

          <div className="mt-6 border-t border-border/60 pt-4">
            {errorMessage ? (
              <div className="rounded-xl border border-destructive/40 bg-background p-4 text-sm text-destructive">
                {errorMessage}
              </div>
            ) : null}
            {isLoading ? (
              <p className="text-sm text-muted-foreground">
                Carregando seus blocos...
              </p>
            ) : null}
            {!isLoading && personalEvents.length === 0 ? (
              <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                <p>Nenhum bloco salvo ainda.</p>
                <p>
                  Explore a agenda geral e marque os eventos para acompanhar
                  aqui.
                </p>
              </div>
            ) : null}
            <div className="mt-4 flex flex-col gap-4">
              {personalEvents.map((event) => (
                <EventRow
                  key={event.id}
                  event={event}
                  status={getStatus(event.id)}
                  onStatusChange={(status) => setStatus(event.id, status)}
                />
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
