/**
 * P2-46 — Skeleton base component
 * Pulse animation via `animation-skeleton` token do design system.
 * O container pai deve receber `aria-busy="true"` e `aria-label` descritivo.
 */

import { type HTMLAttributes } from "react"

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  /** Largura, ex: "w-full" ou "w-32" */
  className?: string
}

/**
 * Bloco retangular animado usado para compor layouts de carregamento.
 * Nunca use `"use client"` aqui — é um Server Component estático.
 */
export function Skeleton({ className = "", ...props }: SkeletonProps) {
  return (
    <div
      className={[
        "rounded-md bg-border animate-skeleton",
        className,
      ].join(" ")}
      aria-hidden="true"
      {...props}
    />
  )
}
