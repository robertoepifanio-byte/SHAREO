"use client"

import type { SelectHTMLAttributes, ReactNode } from "react"
import { useId } from "react"

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?:       string
  error?:       string
  helper?:      string
  placeholder?: string
  children:     ReactNode
}

export function Select({
  label,
  error,
  helper,
  placeholder,
  className = "",
  children,
  ...props
}: SelectProps) {
  const id       = useId()
  const selectId = props.id ?? id

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={selectId} className="text-sm font-medium text-foreground">
          {label}
          {props.required && (
            <span className="ml-1 text-destructive" aria-hidden="true">*</span>
          )}
        </label>
      )}
      <div className="relative">
        <select
          id={selectId}
          aria-invalid={!!error}
          aria-describedby={
            error ? `${selectId}-error` : helper ? `${selectId}-helper` : undefined
          }
          className={[
            "h-11 w-full appearance-none rounded-md border bg-surface px-3 pr-10 text-sm text-foreground",
            "cursor-pointer transition-colors duration-fast outline-none",
            "focus:border-ring focus:ring-2 focus:ring-ring/20",
            error
              ? "border-destructive focus:border-destructive focus:ring-destructive/20"
              : "border-input",
            className,
          ].join(" ")}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {children}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>
      {error && (
        <p id={`${selectId}-error`} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
      {helper && !error && (
        <p id={`${selectId}-helper`} className="text-xs text-muted-foreground">
          {helper}
        </p>
      )}
    </div>
  )
}
