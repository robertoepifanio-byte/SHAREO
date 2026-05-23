import type { Metadata } from "next"
import { RegisterForm } from "./RegisterForm"

export const metadata: Metadata = {
  title: "Criar conta",
  description: "Cadastre-se no ShareO e comece a alugar ou emprestar itens",
}

export default function CadastroPage() {
  return <RegisterForm />
}
