"use client"

import type { TextareaHTMLAttributes } from "react"
import { useId } from "react"

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?:  string
  error?:  string
  helper?: string
}

export function Textarea({
  label,
  error,
  helper,
  className = "",
  ...props
}: TextareaProps) {
  const id         = useId()
  const textareaId = props.id ?? id

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={textareaId} className="text-sm font-medium text-foreground">
          {label}
          {props.required && (
            <span className="ml-1 text-destructive" aria-hidden="true">*</span>
          )}
        </label>
      )}
      <textarea
        id={textareaId}
        aria-invalid={!!error}
        aria-describedby={
          error ? `${textareaId}-error` : helper ? `${textareaId}-helper` : undefined
        }
        className={[
          "min-h-[120px] w-full resize-y rounded-md border bg-surface px-3 py-2.5 text-sm text-foreground",
          "placeholder:text-muted-foreground",
          "transition-colors duration-fast outline-none",
          "focus:border-ring focus:ring-2 focus:ring-ring/20",
          error
            ? "border-destructive focus:border-destructive focus:ring-destructive/20"
            : "border-input",
          className,
        ].join(" ")}
        {...props}
      />
      {error && (
        <p id={`${textareaId}-error`} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
      {helper && !error && (
        <p id={`${textareaId}-helper`} className="text-xs text-muted-foreground">
          {helper}
        </p>
      )}
    </div>
  )
}
