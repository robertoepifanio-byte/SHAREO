"use client"

import type { InputHTMLAttributes, ReactNode } from "react"
import { useId } from "react"

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?:  string
  error?:  string
  helper?: string
  suffix?: ReactNode
}

export function Input({ label, error, helper, suffix, className = "", ...props }: InputProps) {
  const id = useId()
  const inputId = props.id ?? id

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="text-sm font-medium text-foreground"
        >
          {label}
          {props.required && <span className="ml-1 text-destructive" aria-hidden="true">*</span>}
        </label>
      )}
      <div className="relative">
        <input
          id={inputId}
          aria-describedby={error ? `${inputId}-error` : helper ? `${inputId}-helper` : undefined}
          aria-invalid={!!error}
          className={[
            "h-11 w-full rounded-md border bg-surface px-3 text-sm text-foreground",
            "placeholder:text-muted-foreground",
            "transition-colors duration-fast outline-none",
            "focus:border-ring focus:ring-2 focus:ring-ring/20",
            error
              ? "border-destructive focus:border-destructive focus:ring-destructive/20"
              : "border-input",
            suffix ? "pr-10" : "",
            className,
          ].join(" ")}
          {...props}
        />
        {suffix && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground">
            {suffix}
          </div>
        )}
      </div>
      {error && (
        <p id={`${inputId}-error`} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
      {helper && !error && (
        <p id={`${inputId}-helper`} className="text-xs text-muted-foreground">
          {helper}
        </p>
      )}
    </div>
  )
}
