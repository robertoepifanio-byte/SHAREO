import type { Metadata } from "next"
import Link from "next/link"
import { AppHeader } from "@/components/layout/AppHeader"
import { IdentificacaoPrestador } from "@/components/legal/IdentificacaoPrestador"
import { POLICY_UPDATED_AT } from "@/lib/legal-config"

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
        <p className="text-sm text-muted-foreground mb-6">Última atualização: {POLICY_UPDATED_AT}</p>

        {/* Quem é o controlador precisa vir antes do que ele faz com os dados (LGPD art. 9º, I). */}
        <div className="mb-8">
          <IdentificacaoPrestador papel="controlador" />
        </div>

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
            <h2 className="text-lg font-bold text-primary">2.1. Dados de Contas Pessoa Jurídica (PJ)</h2>
            <p className="text-muted-foreground leading-relaxed mb-2">
              Ao cadastrar uma empresa, coletamos e tratamos dados adicionais para prevenção a fraude e segurança jurídica das transações:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>
                <strong>Situação cadastral do CNPJ</strong> (razão social, situação na Receita Federal e data de abertura),
                consultada em fontes públicas da Receita — dado público, tratado para cumprimento de obrigação legal e
                regulatória (LGPD art. 7º, II).
              </li>
              <li>
                <strong>Nome do responsável legal</strong> da empresa — necessário para identificar quem responde pela conta,
                com base na execução do contrato (LGPD art. 7º, V) e no legítimo interesse de prevenção a fraude (art. 7º, IX).
                É armazenado com criptografia.
              </li>
              <li>
                <strong>Registro da declaração de vínculo</strong> (data, hora e endereço IP em que o responsável legal declarou
                representar a empresa) — tratado com base no legítimo interesse, como evidência em eventual processo (art. 7º, IX).
                O endereço IP da declaração é retido por até 5 anos.
              </li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-2">
              Por não se basearem em consentimento, esses dados não podem ser revogados isoladamente — apenas mediante exclusão
              da conta, respeitados os prazos legais de retenção.
            </p>
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
              Não vendemos seus dados a terceiros. Podemos compartilhá-los com: parceiros de processamento de pagamento (para finalizar transações); autoridades públicas (quando exigido por lei); prestadores de serviço de infraestrutura tecnológica (hospedagem, e-mail, monitoramento de falhas), sempre sob acordo de confidencialidade.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-primary">4.1. Transferência Internacional de Dados</h2>
            <p className="text-muted-foreground leading-relaxed">
              Parte dos nossos prestadores de serviço está sediada fora do Brasil, principalmente nos Estados Unidos. Isso significa que alguns dos seus dados são transferidos e processados no exterior. Informamos abaixo quem são, o que recebem e para quê:
            </p>
            <ul className="mt-3 space-y-2 text-muted-foreground leading-relaxed">
              <li><strong>Stripe, LLC</strong> (Estados Unidos) — processamento dos pagamentos. Recebe os dados necessários à cobrança e, no caso de quem anuncia, os dados bancários e de verificação de identidade exigidos para receber os repasses. Os dados seguem em uso enquanto a locação estiver em curso e durante o repasse; depois, o registro da transação é guardado por 5 anos, como exige a lei fiscal, sem o seu nome.</li>
              <li><strong>Vercel Inc.</strong> (Estados Unidos) — hospedagem e execução da aplicação. Processa os dados das requisições apenas durante o tempo em que cada tela funciona.</li>
              <li><strong>Plus Five Five, Inc. (Resend)</strong> (Estados Unidos) — envio dos e-mails da plataforma. Recebe seu nome, e-mail e o conteúdo da mensagem, no momento do envio.</li>
              <li><strong>Functional Software, Inc. (Sentry)</strong> (Estados Unidos) — monitoramento de erros. Recebe informações técnicas da falha, com filtro que remove dados pessoais, mantidas por 30 dias.</li>
              <li><strong>Mapbox, Inc.</strong> (Estados Unidos) — conversão de endereços em coordenadas. Recebe o endereço informado, sem seu nome, no momento da consulta.</li>
              <li><strong>Upstash</strong> (Estados Unidos) — proteção contra uso abusivo, contagem de visualizações e cache das consultas de CNPJ. Recebe seu endereço IP, o identificador da sua conta, o e-mail usado no login e, no cadastro de empresa, os dados públicos do CNPJ consultado.</li>
            </ul>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              <strong>O que permanece no Brasil:</strong> o banco de dados, os documentos e fotos que você envia e as mensagens do chat ficam armazenados em servidores na região de São Paulo.
            </p>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              <strong>De quem é a responsabilidade:</strong> nós decidimos o que é tratado e para quê, respondemos aos seus pedidos e comunicamos incidentes de segurança. As empresas acima tratam os dados apenas conforme as nossas instruções e o contrato. <strong>Se um prestador falhar, quem responde a você somos nós.</strong>
            </p>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              <strong>Repasses a outros fornecedores:</strong> essas empresas podem usar fornecedores próprios — por exemplo, servidores em nuvem — sempre para a mesma finalidade descrita acima e com o mesmo dever de proteger seus dados. Nos pagamentos, a Stripe também precisa informar bancos e órgãos reguladores, por exigência legal.
            </p>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              Você pode solicitar informações sobre essas transferências, incluindo as garantias adotadas e uma cópia das cláusulas contratuais, pelo e-mail{" "}
              <a href="mailto:privacidade@shareo.com.br" className="text-brand hover:underline">
                privacidade@shareo.com.br
              </a>. Respondemos em até 15 dias.
            </p>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              <strong>Se não concordar com a nossa resposta</strong> — ou se preferir não falar conosco — você pode reclamar de nós diretamente à <strong>ANPD (Autoridade Nacional de Proteção de Dados)</strong>, pelos canais oficiais em{" "}
              <a href="https://www.gov.br/anpd" target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">
                gov.br/anpd
              </a>.
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
              Utilizamos apenas cookies essenciais ao funcionamento da plataforma (autenticação e preferências). Não usamos cookies analíticos nem de publicidade.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-primary">8. Retenção de Dados</h2>
            <p className="text-muted-foreground leading-relaxed">
              Mantemos seus dados enquanto sua conta estiver ativa ou pelo período necessário para cumprir obrigações legais. A exclusão da conta é processada imediatamente: seus dados de identificação, localização, documentos e textos escritos por você são anonimizados ou apagados no momento da solicitação. Documentos e imagens são removidos definitivamente, sem cópia em backup. Registros de transações concluídas são preservados de forma anonimizada pelo prazo exigido pela legislação fiscal (5 anos), sem identificar você. Cópias de segurança do banco de dados são substituídas em até 7 dias.
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
