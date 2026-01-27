"use client"

const STATUS_KEY = "blocos:status"
const OVERRIDE_KEY = "blocos:override"

function safeParse<T>(value: string | null): T | null {
  if (!value) return null
  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

export function loadStatusMap<T>() {
  if (typeof window === "undefined") return {}
  return safeParse<Record<string, T>>(localStorage.getItem(STATUS_KEY)) ?? {}
}

export function saveStatusMap(value: Record<string, unknown>) {
  if (typeof window === "undefined") return
  localStorage.setItem(STATUS_KEY, JSON.stringify(value))
}

export function loadOverrideMap<T>() {
  if (typeof window === "undefined") return {}
  return safeParse<Record<string, T>>(localStorage.getItem(OVERRIDE_KEY)) ?? {}
}

export function saveOverrideMap(value: Record<string, unknown>) {
  if (typeof window === "undefined") return
  localStorage.setItem(OVERRIDE_KEY, JSON.stringify(value))
}
