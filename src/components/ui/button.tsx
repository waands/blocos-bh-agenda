"use client"

import type { ButtonHTMLAttributes } from "react"

type ButtonVariant = "default" | "outline"
type ButtonSize = "sm" | "md"

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
}

const baseStyles =
  "inline-flex items-center justify-center rounded-full border text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"

const variantStyles: Record<ButtonVariant, string> = {
  default: "border-transparent bg-primary text-primary-foreground hover:opacity-90",
  outline: "border-border bg-background text-foreground hover:bg-accent/40",
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-8 px-3",
  md: "h-10 px-4",
}

export function Button({
  className = "",
  variant = "default",
  size = "md",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    />
  )
}
