import type { Metadata } from "next"
import { ForgotPasswordForm } from "./_ForgotPasswordForm"

export const metadata: Metadata = { title: "Recuperar senha" }

export default function EsqueciSenhaPage() {
  return <ForgotPasswordForm />
}
