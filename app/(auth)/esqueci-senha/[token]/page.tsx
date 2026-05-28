import type { Metadata } from "next"
import { ResetPasswordForm } from "./_ResetPasswordForm"

export const metadata: Metadata = { title: "Nova senha" }

export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  return <ResetPasswordForm token={token} />
}
