import type { Metadata } from "next"
import Link from "next/link"
import { AppHeader } from "@/components/layout/AppHeader"

export const metadata: Metadata = {
  title: "Segurança — ShareO | Como protegemos você",
  description:
    "Saiba como o ShareO protege seus dados e sua conta: conexão criptografada, senhas com hash, proteção contra ataques e conformidade com a LGPD.",
}

export default function SegurancaPage() {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-10 max-w-3xl">
        <h1 className="text-3xl font-extrabold text-primary mb-2">Segurança</h1>
        <p className="text-sm text-muted-foreground mb-8">Como protegemos você e seus dados na plataforma</p>

        <div className="prose prose-sm max-w-none text-foreground space-y-6">

          <section>
            <h2 className="text-lg font-bold text-primary">Conexão sempre criptografada</h2>
            <p className="text-muted-foreground leading-relaxed">
              Toda comunicação entre o seu dispositivo e o ShareO utiliza HTTPS — o protocolo de
              transferência com criptografia padrão da web. Isso significa que seus dados de login,
              mensagens e informações pessoais trafegam de forma segura, sem que terceiros possam
              interceptar ou alterar o conteúdo. Adicionalmente, configuramos HSTS (HTTP Strict
              Transport Security) para garantir que o navegador nunca abra o ShareO sem criptografia,
              mesmo se você digitar o endereço sem o "https://".
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-primary">Senhas nunca ficam visíveis</h2>
            <p className="text-muted-foreground leading-relaxed">
              Sua senha nunca é armazenada em texto puro em nossos servidores. Utilizamos um
              algoritmo de hash robusto para transformar a senha em um código irreversível antes
              de salvá-la. Isso significa que nem mesmo a equipe do ShareO consegue ver sua senha
              — apenas verificar se a que você digitou no login está correta.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-primary">Proteção contra ataques na web</h2>
            <p className="text-muted-foreground leading-relaxed">
              Implementamos cabeçalhos de segurança HTTP para proteger contra os ataques mais
              comuns da web. Entre eles está o CSP (Content Security Policy), que impede que
              scripts maliciosos sejam executados nas páginas do ShareO — uma proteção efetiva
              contra ataques do tipo XSS (Cross-Site Scripting). Também limitamos a quantidade de
              tentativas de login por endereço IP, dificultando tentativas de acesso por força bruta.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-primary">Documentos de identidade em área privada</h2>
            <p className="text-muted-foreground leading-relaxed">
              Documentos de identidade enviados para verificação de conta (como fotos do documento
              com CPF/CNPJ) são armazenados em compartimento privado — diferente das fotos de
              itens, que são públicas. O acesso a esses documentos é restrito e controlado, e eles
              nunca são exibidos publicamente.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-primary">Conformidade com a LGPD</h2>
            <p className="text-muted-foreground leading-relaxed">
              O ShareO trata seus dados pessoais em conformidade com a Lei Geral de Proteção de
              Dados (LGPD — Lei nº 13.709/2018). Você tem direito de acessar, corrigir ou solicitar
              a exclusão dos seus dados a qualquer momento. Para mais detalhes sobre quais dados
              coletamos e como os utilizamos, consulte nossa{" "}
              <Link href="/privacidade" className="text-brand hover:underline">
                Política de Privacidade
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-primary">Como reportar uma vulnerabilidade</h2>
            <p className="text-muted-foreground leading-relaxed">
              Se você encontrou um problema de segurança no ShareO, pedimos que entre em contato
              de forma responsável antes de tornar o problema público. Agradecemos e levamos a
              sério todo relatório enviado.
            </p>
            <ul className="mt-3 list-disc pl-5 space-y-1 text-muted-foreground">
              <li>
                E-mail:{" "}
                <a href="mailto:seguranca@shareo.com.br" className="text-brand hover:underline">
                  seguranca@shareo.com.br
                </a>
              </li>
              <li>
                Arquivo de contato (RFC 9116):{" "}
                <a
                  href="/.well-known/security.txt"
                  className="text-brand hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  /.well-known/security.txt
                </a>
              </li>
            </ul>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              Responderemos em até 5 dias úteis. Não publique detalhes da vulnerabilidade antes
              de recebermos sua mensagem e combinarmos uma data para divulgação coordenada.
            </p>
          </section>

        </div>

        <div className="mt-10 pt-6 border-t border-border flex gap-4 text-sm">
          <Link href="/privacidade" className="text-brand hover:underline">Privacidade</Link>
          <Link href="/termos" className="text-brand hover:underline">Termos de uso</Link>
          <Link href="/ajuda" className="text-brand hover:underline">Central de ajuda</Link>
        </div>
      </main>
    </div>
  )
}
