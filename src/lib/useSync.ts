"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import {
  loadOverrideMap,
  loadStatusMap,
  saveOverrideMap,
  saveStatusMap,
} from "@/lib/localEventStore"
import type { EventStatus, OverrideRecord, StatusRecord } from "@/lib/statusTypes"
import { supabaseClient } from "@/lib/supabaseClient"
import { useAuth } from "@/lib/useAuth"

type StatusMap = Record<string, StatusRecord>
type OverrideMap = Record<string, OverrideRecord>

function isNewer(a?: string, b?: string) {
  if (!a) return false
  if (!b) return true
  return new Date(a).getTime() > new Date(b).getTime()
}

function latestTimestamp(a?: string, b?: string) {
  if (!a) return b
  if (!b) return a
  return isNewer(a, b) ? a : b
}

export function useSync() {
  const { user, loading: authLoading } = useAuth()
  const [statusMap, setStatusMap] = useState<StatusMap>({})
  const [overrideMap, setOverrideMap] = useState<OverrideMap>({})
  const [syncing, setSyncing] = useState(false)
  const hasLoadedLocal = useRef(false)

  useEffect(() => {
    if (hasLoadedLocal.current) return
    const localStatus = loadStatusMap<StatusRecord>()
    const localOverrides = loadOverrideMap<OverrideRecord>()
    setStatusMap(localStatus)
    setOverrideMap(localOverrides)
    hasLoadedLocal.current = true
  }, [])

  const persistStatus = useCallback((nextMap: StatusMap) => {
    setStatusMap(nextMap)
    saveStatusMap(nextMap)
  }, [])

  const persistOverrides = useCallback((nextMap: OverrideMap) => {
    setOverrideMap(nextMap)
    saveOverrideMap(nextMap)
  }, [])

  const mergeAndSync = useCallback(async () => {
    if (!user) return

    setSyncing(true)
    try {
      const { data: overrideRows, error } = await supabaseClient
        .from("user_event_overrides")
        .select("base_event_id,status,hidden,notes,updated_at")
        .eq("owner_id", user.id)

      if (error) throw error

      const remoteStatusMap: StatusMap = {}
      const remoteOverrideMap: OverrideMap = {}

      for (const row of overrideRows ?? []) {
        const updatedAt = row.updated_at ?? new Date(0).toISOString()
        if (row.status) {
          remoteStatusMap[row.base_event_id] = {
            status: row.status as EventStatus,
            updatedAt,
          }
        }
        remoteOverrideMap[row.base_event_id] = {
          hidden: row.hidden ?? false,
          notes: row.notes ?? undefined,
          updatedAt,
        }
      }

      const mergedStatus: StatusMap = { ...statusMap }
      const mergedOverrides: OverrideMap = { ...overrideMap }
      const overrideUpserts: Array<{
        owner_id: string
        base_event_id: string
        status: EventStatus
        hidden?: boolean
        notes?: string
        updated_at: string
      }> = []

      const allEventIds = new Set([
        ...Object.keys(statusMap),
        ...Object.keys(overrideMap),
        ...Object.keys(remoteStatusMap),
        ...Object.keys(remoteOverrideMap),
      ])

      for (const eventId of allEventIds) {
        const localStatus = statusMap[eventId]
        const localOverride = overrideMap[eventId]
        const remoteStatus = remoteStatusMap[eventId]
        const remoteOverride = remoteOverrideMap[eventId]

        const localUpdatedAt = latestTimestamp(
          localStatus?.updatedAt,
          localOverride?.updatedAt
        )
        const remoteUpdatedAt = latestTimestamp(
          remoteStatus?.updatedAt,
          remoteOverride?.updatedAt
        )

        if (!remoteUpdatedAt && localUpdatedAt) {
          overrideUpserts.push({
            owner_id: user.id,
            base_event_id: eventId,
            status: localStatus?.status ?? "talvez",
            hidden: localOverride?.hidden,
            notes: localOverride?.notes,
            updated_at: localUpdatedAt,
          })
          continue
        }

        if (!localUpdatedAt && remoteUpdatedAt) {
          if (remoteStatus) {
            mergedStatus[eventId] = remoteStatus
          }
          if (remoteOverride) {
            mergedOverrides[eventId] = remoteOverride
          }
          continue
        }

        if (localUpdatedAt && remoteUpdatedAt) {
          if (isNewer(localUpdatedAt, remoteUpdatedAt)) {
            overrideUpserts.push({
              owner_id: user.id,
              base_event_id: eventId,
              status: localStatus?.status ?? remoteStatus?.status ?? "talvez",
              hidden:
                localOverride?.hidden ?? remoteOverride?.hidden ?? false,
              notes: localOverride?.notes ?? remoteOverride?.notes,
              updated_at: localUpdatedAt,
            })
          } else if (isNewer(remoteUpdatedAt, localUpdatedAt)) {
            if (remoteStatus) {
              mergedStatus[eventId] = remoteStatus
            }
            if (remoteOverride) {
              mergedOverrides[eventId] = remoteOverride
            }
          }
        }
      }

      if (overrideUpserts.length > 0) {
        const { error } = await supabaseClient
          .from("user_event_overrides")
          .upsert(overrideUpserts, { onConflict: "owner_id,base_event_id" })
        if (error) throw error
      }

      persistStatus(mergedStatus)
      persistOverrides(mergedOverrides)
    } finally {
      setSyncing(false)
    }
  }, [overrideMap, persistOverrides, persistStatus, statusMap, user])

  useEffect(() => {
    if (authLoading || !user) return
    void mergeAndSync()
  }, [authLoading, mergeAndSync, user])

  const setStatus = useCallback(
    async (eventId: string, status: EventStatus) => {
      const updatedAt = new Date().toISOString()
      const nextMap = {
        ...statusMap,
        [eventId]: { status, updatedAt },
      }

      persistStatus(nextMap)

      if (!user) return

      await supabaseClient.from("user_event_overrides").upsert(
        {
          owner_id: user.id,
          base_event_id: eventId,
          status,
          updated_at: updatedAt,
        },
        { onConflict: "owner_id,base_event_id" }
      )
    },
    [persistStatus, statusMap, user]
  )

  const setOverride = useCallback(
    async (eventId: string, override: Omit<OverrideRecord, "updatedAt">) => {
      const updatedAt = new Date().toISOString()
      const nextMap = {
        ...overrideMap,
        [eventId]: { ...override, updatedAt },
      }

      persistOverrides(nextMap)

      if (!user) return

      await supabaseClient.from("user_event_overrides").upsert(
        {
          owner_id: user.id,
          base_event_id: eventId,
          status: statusMap[eventId]?.status ?? "talvez",
          hidden: override.hidden ?? false,
          notes: override.notes ?? null,
          updated_at: updatedAt,
        },
        { onConflict: "owner_id,base_event_id" }
      )
    },
    [overrideMap, persistOverrides, user]
  )

  const getStatus = useCallback(
    (eventId: string) => statusMap[eventId]?.status ?? null,
    [statusMap]
  )

  const getOverride = useCallback(
    (eventId: string) => overrideMap[eventId] ?? null,
    [overrideMap]
  )

  const isAuthenticated = useMemo(() => Boolean(user), [user])

  return {
    isAuthenticated,
    syncing,
    getStatus,
    setStatus,
    getOverride,
    setOverride,
  }
}
