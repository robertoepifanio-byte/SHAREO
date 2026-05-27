"use client"

import type { ButtonHTMLAttributes, ReactNode } from "react"

type Variant = "primary" | "secondary" | "ghost" | "destructive"
type Size    = "sm" | "md" | "lg"

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:  Variant
  size?:     Size
  loading?:  boolean
  children:  ReactNode
}

const variantClasses: Record<Variant, string> = {
  primary:     "bg-brand text-white hover:bg-brand-hover active:bg-brand-hover focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 uppercase tracking-wide font-bold",
  secondary:   "bg-surface text-primary border border-border hover:bg-background active:bg-background focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2",
  ghost:       "bg-transparent text-primary hover:bg-background active:bg-background focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2",
  destructive: "bg-destructive text-white hover:bg-destructive-hover active:bg-destructive-hover focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2",
}

const sizeClasses: Record<Size, string> = {
  sm: "h-9 px-4 text-sm rounded",
  md: "h-11 px-6 text-sm rounded-md",
  lg: "h-12 px-8 text-base rounded-md",
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  children,
  className = "",
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading

  return (
    <button
      disabled={isDisabled}
      aria-busy={loading}
      className={[
        "inline-flex items-center justify-center gap-2 font-medium",
        "transition-colors duration-fast outline-none",
        "disabled:pointer-events-none disabled:opacity-50",
        variantClasses[variant],
        sizeClasses[size],
        className,
      ].join(" ")}
      {...props}
    >
      {loading && (
        <svg
          className="h-4 w-4 animate-spin"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12" cy="12" r="10"
            stroke="currentColor" strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      )}
      {children}
    </button>
  )
}
