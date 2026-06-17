import type { Metadata } from "next"
import { SetPasswordForm } from "./_SetPasswordForm"

export const metadata: Metadata = { title: "Definir senha" }

export default async function DefinirSenhaPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  return <SetPasswordForm token={token} />
}
