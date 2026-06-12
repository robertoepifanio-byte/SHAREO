import type { Metadata } from "next"
import { RegisterForm } from "./RegisterForm"

export const metadata: Metadata = {
  title: "Criar conta",
  description: "Cadastre-se no ShareO e comece a gerar renda com o que você já tem.",
}

export default function CadastroPage() {
  return <RegisterForm />
}
