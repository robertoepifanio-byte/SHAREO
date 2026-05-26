import type { Metadata } from "next"
import { ForgotPasswordForm } from "./_ForgotPasswordForm"

export const metadata: Metadata = { title: "Recuperar senha | ShareO" }

export default function EsqueciSenhaPage() {
  return <ForgotPasswordForm />
}
