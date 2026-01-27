"use client"

import { createContext, useContext } from "react"

type ToggleGroupContextValue = {
  value?: string
  onValueChange?: (value: string) => void
}

const ToggleGroupContext = createContext<ToggleGroupContextValue | null>(null)

type ToggleGroupProps = {
  type?: "single"
  value?: string
  onValueChange?: (value: string) => void
  className?: string
  children: React.ReactNode
}

export function ToggleGroup({
  value,
  onValueChange,
  className = "",
  children,
}: ToggleGroupProps) {
  return (
    <ToggleGroupContext.Provider value={{ value, onValueChange }}>
      <div className={`inline-flex items-center gap-1 ${className}`}>
        {children}
      </div>
    </ToggleGroupContext.Provider>
  )
}

type ToggleGroupItemProps = {
  value: string
  className?: string
  children: React.ReactNode
}

export function ToggleGroupItem({
  value,
  className = "",
  children,
}: ToggleGroupItemProps) {
  const context = useContext(ToggleGroupContext)
  const isActive = context?.value === value

  return (
    <button
      type="button"
      data-state={isActive ? "on" : "off"}
      onClick={() => context?.onValueChange?.(value)}
      className={`${className} ${isActive ? "" : "text-muted-foreground"}`}
    >
      {children}
    </button>
  )
}
