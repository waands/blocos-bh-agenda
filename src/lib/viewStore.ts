"use client"

import { useCallback, useEffect, useState } from "react"

export type ViewMode = "calendar" | "list"

const STORAGE_KEY = "blocos:view"

export function useViewStore() {
  const [view, setViewState] = useState<ViewMode>("list")

  useEffect(() => {
    if (typeof window === "undefined") return
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored === "calendar" || stored === "list") {
      setViewState(stored)
    }
  }, [])

  const setView = useCallback((next: ViewMode) => {
    setViewState(next)
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, next)
    }
  }, [])

  const setAutoView = useCallback(
    (next: ViewMode) => {
      setViewState((current) => {
        if (current === next) return current
        if (typeof window !== "undefined") {
          window.localStorage.setItem(STORAGE_KEY, next)
        }
        return next
      })
    },
    []
  )

  return { view, setView, setAutoView }
}
