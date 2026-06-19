import type { Metadata } from "next"
import Link from "next/link"
import { AppHeader } from "@/components/layout/AppHeader"

export const metadata: Metadata = {
  title: "Política de Privacidade — ShareO",
  description: "Saiba como o ShareO coleta, usa e protege seus dados pessoais, em conformidade com a LGPD.",
}

export default function PrivacidadePage() {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-10 max-w-3xl">
        <h1 className="text-3xl font-extrabold text-primary mb-2">Política de Privacidade</h1>
        <p className="text-sm text-muted-foreground mb-8">Última atualização: junho de 2026</p>

        <div className="prose prose-sm max-w-none text-foreground space-y-6">

          <section>
            <h2 className="text-lg font-bold text-primary">1. Introdução</h2>
            <p className="text-muted-foreground leading-relaxed">
              O ShareO está comprometido com a proteção dos seus dados pessoais. Esta Política descreve como coletamos, usamos, armazenamos e protegemos suas informações, em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-primary">2. Dados Coletados</h2>
            <p className="text-muted-foreground leading-relaxed mb-2">Coletamos os seguintes dados:</p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li><strong>Cadastro:</strong> nome, e-mail, CPF/CNPJ, telefone, endereço</li>
              <li><strong>Uso da plataforma:</strong> itens visualizados, reservas realizadas, avaliações</li>
              <li><strong>Localização:</strong> cidade e estado para exibição de itens próximos (com sua autorização)</li>
              <li><strong>Comunicações:</strong> mensagens trocadas pelo chat da plataforma</li>
              <li><strong>Técnicos:</strong> endereço IP, tipo de navegador, sistema operacional</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-primary">3. Finalidade do Tratamento</h2>
            <p className="text-muted-foreground leading-relaxed mb-2">Usamos seus dados para:</p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>Criar e gerenciar sua conta na plataforma</li>
              <li>Facilitar transações entre locatários e locadores</li>
              <li>Enviar notificações sobre reservas e mensagens</li>
              <li>Prevenir fraudes e garantir a segurança da plataforma</li>
              <li>Melhorar nossos serviços com base em análises de uso</li>
              <li>Cumprir obrigações legais e regulatórias</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-primary">4. Compartilhamento de Dados</h2>
            <p className="text-muted-foreground leading-relaxed">
              Não vendemos seus dados a terceiros. Podemos compartilhá-los com: parceiros de processamento de pagamento (para finalizar transações); autoridades públicas (quando exigido por lei); prestadores de serviço de infraestrutura tecnológica (hospedagem, e-mail, analytics), sempre sob acordo de confidencialidade.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-primary">5. Armazenamento e Segurança</h2>
            <p className="text-muted-foreground leading-relaxed">
              Seus dados são armazenados em servidores seguros com criptografia em trânsito (TLS) e em repouso. Documentos sensíveis (CPF/CNPJ) são armazenados com criptografia adicional. Adotamos controles de acesso rigorosos e monitoramento de segurança contínuo.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-primary">6. Seus Direitos (LGPD)</h2>
            <p className="text-muted-foreground leading-relaxed mb-2">Você tem direito a:</p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>Confirmar a existência de tratamento dos seus dados</li>
              <li>Acessar seus dados pessoais</li>
              <li>Corrigir dados incompletos, inexatos ou desatualizados</li>
              <li>Solicitar a exclusão de dados desnecessários ou excessivos</li>
              <li>Revogar consentimentos fornecidos</li>
              <li>Portabilidade dos seus dados</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-2">
              Para exercer esses direitos, acesse as configurações da sua conta ou entre em contato via{" "}
              <a href="mailto:privacidade@shareo.com.br" className="text-brand hover:underline">
                privacidade@shareo.com.br
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-primary">7. Cookies</h2>
            <p className="text-muted-foreground leading-relaxed">
              Utilizamos cookies essenciais para o funcionamento da plataforma (autenticação, preferências) e cookies analíticos (com seu consentimento) para entender como você usa o ShareO e melhorar a experiência.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-primary">8. Retenção de Dados</h2>
            <p className="text-muted-foreground leading-relaxed">
              Mantemos seus dados enquanto sua conta estiver ativa ou pelo período necessário para cumprir obrigações legais. Após a exclusão da conta, os dados são anonimizados ou apagados em até 90 dias, exceto onde a lei exige retenção por período maior.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-primary">9. Contato</h2>
            <p className="text-muted-foreground leading-relaxed">
              Dúvidas sobre esta Política ou sobre o tratamento dos seus dados? Entre em contato com nosso encarregado de proteção de dados (DPO):{" "}
              <a href="mailto:privacidade@shareo.com.br" className="text-brand hover:underline">
                privacidade@shareo.com.br
              </a>
            </p>
          </section>
        </div>

        <div className="mt-10 pt-6 border-t border-border flex gap-4 text-sm">
          <Link href="/termos" className="text-brand hover:underline">Termos de Uso</Link>
          <Link href="/ajuda" className="text-brand hover:underline">Central de Ajuda</Link>
        </div>
      </main>
    </div>
  )
}
