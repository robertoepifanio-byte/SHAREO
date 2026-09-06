"use client"

import { useState } from "react"
import { toast } from "sonner"

const ID = "engagement-emails"

/**
 * Interruptor dos e-mails opcionais.
 *
 * Client Component pequeno de propósito — a página em volta continua Server
 * Component. Salva na hora (sem botão "Salvar"): é uma preferência de um bit, e
 * um passo a mais para desligar propaganda é exatamente o atrito que a LGPD
 * art. 18 manda evitar.
 *
 * 🪤 O rótulo cobre os TRÊS tipos que `engagementEmailsOptOut` desliga, não só
 * o digest de favoritos. A versão anterior dizia "Novidades sobre seus
 * favoritos": quem desligasse para parar o resumo mensal perdia junto o pedido
 * de avaliação pós-locação, sem saber — e avaliação que não chega prejudica o
 * proprietário, não a plataforma.
 */
export function EngagementToggle({ initialEnabled }: { initialEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled)
  // `saving` não é gordura: com dois PATCH em voo e reversão otimista, uma
  // resposta fora de ordem deixaria a caixa mostrando o oposto do banco.
  const [saving, setSaving] = useState(false)

  async function toggle(next: boolean) {
    // Otimista: a caixa responde na hora e volta atrás se o servidor recusar.
    setEnabled(next)
    setSaving(true)

    try {
      const res = await fetch("/api/users/me/engagement-emails", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ enabled: next }),
      })
      if (!res.ok) throw new Error("falhou")
      toast.success(next ? "Você voltará a receber estes e-mails" : "Pronto, não enviaremos mais")
    } catch {
      setEnabled(!next)
      toast.error("Não conseguimos salvar. Tente novamente.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="flex items-start gap-3">
        <input
          id={ID}
          type="checkbox"
          checked={enabled}
          disabled={saving}
          onChange={(e) => toggle(e.target.checked)}
          className="mt-0.5 h-5 w-5 shrink-0 rounded border-border text-brand focus:ring-2 focus:ring-brand"
        />
        {/* A área clicável é o label inteiro (44px de altura, largura do bloco),
            não os 20px da caixa — WCAG 2.5.5. */}
        <label htmlFor={ID} className="block min-h-11 cursor-pointer">
          <span className="block font-semibold text-foreground">
            E-mails de novidades e lembretes
          </span>
          <span className="mt-1 block text-sm text-muted-foreground">
            Resumo mensal dos favoritos que continuam disponíveis, sugestões de itens parecidos e o
            lembrete para avaliar depois de uma locação. Somando todos, no máximo um e-mail por
            semana.
          </span>
        </label>
      </div>

      {/* O `disabled` sozinho é mudo para leitor de tela: quem aciona por
          teclado não saberia se o clique foi registrado (WCAG 4.1.3). */}
      <span aria-live="polite" className="sr-only">
        {saving ? "Salvando preferência" : ""}
      </span>
    </div>
  )
}
