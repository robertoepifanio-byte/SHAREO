// Fonte: app/politicas/page.tsx

import React from "react"
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
} from "react-native"
import { router } from "expo-router"
import { useTheme, type Tokens } from "@/lib/theme"
import { ScreenHeader } from "@/components/layout/ScreenHeader"
import {
  usePlatformConfig,
  formatFeeLabel,
  formatPayoutWindow,
  formatMaxLabel,
} from "@/lib/platformConfig"
import { IdentificacaoPrestador } from "@/components/legal/IdentificacaoPrestador"

// Verbatim de app/politicas/page.tsx linha 23
const LAST_UPDATED = "4 de setembro de 2026"

// ── Componentes internos ───────────────────────────────────────────────────────

function SectionHeader({
  emoji,
  title,
  tokens,
}: {
  emoji: string
  title: string
  tokens: Tokens
}) {
  return (
    <View style={sh.row}>
      <Text style={sh.emoji}>{emoji}</Text>
      <Text
        style={[sh.title, { color: tokens.navy }]}
        accessibilityRole="header"
      >
        {title}
      </Text>
    </View>
  )
}

const sh = StyleSheet.create({
  row:   { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingTop: 28, paddingBottom: 4 },
  emoji: { fontSize: 22 },
  title: { flex: 1, fontSize: 20, fontWeight: "800", lineHeight: 26 },
})

// ─────────────────────────────────────────────────────────────────────────────

function PolicyBlock({
  title,
  children,
  tokens,
}: {
  title: string
  children: React.ReactNode
  tokens: Tokens
}) {
  return (
    <View
      style={[
        pb.card,
        { borderColor: tokens.border, backgroundColor: tokens.surface },
      ]}
    >
      <Text style={[pb.title, { color: tokens.navy }]}>{title}</Text>
      {children}
    </View>
  )
}

const pb = StyleSheet.create({
  card:  { marginHorizontal: 16, marginTop: 12, borderWidth: 1, borderRadius: 12, padding: 16 },
  title: { fontSize: 15, fontWeight: "700", marginBottom: 8, lineHeight: 20 },
})

// ── Tela principal ─────────────────────────────────────────────────────────────

export default function PoliticasScreen() {
  const { tokens } = useTheme()
  const cfg        = usePlatformConfig()

  const feeLabel    = formatFeeLabel(cfg.feeRateBps)
  const payoutLabel = formatPayoutWindow(cfg.payoutWindowDays)
  const maxLabel    = formatMaxLabel(cfg.checkoutMaxCents)

  function openMail(address: string) {
    Linking.openURL(`mailto:${address}`)
  }

  return (
    <View style={[s.root, { backgroundColor: tokens.bg }]}>

      <ScreenHeader title="Políticas do ShareO" />

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Título e intro — verbatim de page.tsx linhas 54-63 ── */}
        <View style={[s.titleSection, { backgroundColor: tokens.bg }]}>
          <Text
            style={[s.pageTitle, { color: tokens.navy }]}
            accessibilityRole="header"
          >
            Políticas do ShareO
          </Text>
          <Text style={[s.updatedAt, { color: tokens.muted }]}>
            Última atualização: {LAST_UPDATED}
          </Text>
          <Text style={[s.intro, { color: tokens.muted }]}>
            Estas políticas regem o uso da plataforma ShareO e o tratamento de dados pessoais de seus usuários. Ao criar uma conta ou utilizar os serviços, você confirma que leu, compreendeu e concorda com estes termos.
          </Text>
        </View>

        {/* ── Índice — verbatim de page.tsx linhas 66-84 ── */}
        <View
          style={[
            s.indexCard,
            { borderColor: tokens.border, backgroundColor: tokens.surface },
          ]}
        >
          <Text style={[s.indexHeading, { color: tokens.muted }]}>
            Nesta página
          </Text>
          {[
            "1. Termos de Uso",
            "2. Política de Privacidade (LGPD)",
            "3. Responsabilidade",
            "4. Cancelamento e Reembolso",
            "5. Cookies e Analytics",
            "6. Contato",
          ].map((item) => (
            <Text key={item} style={[s.indexItem, { color: tokens.green }]}>
              {item}
            </Text>
          ))}
        </View>

        {/* ══ 1. Termos de Uso — verbatim de page.tsx linhas 88-165 ══ */}
        <SectionHeader emoji="📜" title="1. Termos de Uso" tokens={tokens} />

        <PolicyBlock title="1.1 Descrição do Serviço" tokens={tokens}>
          <Text style={[s.body, { color: tokens.muted }]}>
            O ShareO é uma plataforma digital que conecta proprietários de itens ("Locadores") a pessoas que desejam alugá-los temporariamente ("Locatários"). O ShareO atua exclusivamente como intermediário tecnológico, facilitando a descoberta de itens, a comunicação entre as partes, o processamento de pagamentos e a gestão de reservas. O ShareO não é parte do contrato de locação celebrado entre Locador e Locatário.
          </Text>
        </PolicyBlock>

        <PolicyBlock title="1.2 Elegibilidade" tokens={tokens}>
          <Text style={[s.body, { color: tokens.muted }]}>
            Para criar uma conta no ShareO, você deve: (a) ter pelo menos 18 anos de idade ou ser legalmente emancipado; (b) possuir CPF ou CNPJ válido e em situação regular; (c) ter capacidade civil plena para celebrar contratos; e (d) não ter sido banido anteriormente da plataforma.
          </Text>
        </PolicyBlock>

        <PolicyBlock title="1.3 Cadastro e Conta" tokens={tokens}>
          <Text style={[s.body, { color: tokens.muted }]}>
            {/* seguranca@shareo.com.br: mailto via Linking (link <a> do site) */}
            Você é responsável por manter a confidencialidade de suas credenciais de acesso. Qualquer atividade realizada com sua conta é de sua responsabilidade. Notifique imediatamente o ShareO em caso de acesso não autorizado pelo e-mail{" "}
            <Text
              style={[s.link, { color: tokens.green }]}
              onPress={() => openMail("seguranca@shareo.com.br")}
              accessibilityRole="link"
              accessibilityLabel="Enviar e-mail para seguranca@shareo.com.br"
            >
              seguranca@shareo.com.br
            </Text>
            . O ShareO se reserva o direito de suspender ou encerrar contas que violem estas políticas.
          </Text>
        </PolicyBlock>

        <PolicyBlock title="1.4 Regras para Anúncio de Itens" tokens={tokens}>
          <Text style={[s.body, { color: tokens.muted }]}>
            Ao anunciar um item, o Locador declara: (a) ser o legítimo proprietário do item ou ter autorização para alugá-lo; (b) que o item está em boas condições de funcionamento e é seguro para uso; (c) que as informações, fotos e preços divulgados são precisos e verídicos; (d) que o item não está gravado por ônus ou constrição judicial que impeça sua disponibilização.
          </Text>
        </PolicyBlock>

        <PolicyBlock title="1.5 Itens Proibidos" tokens={tokens}>
          <Text style={[s.body, { color: tokens.muted }]}>
            São vedados na plataforma: armas de fogo, munições e acessórios; substâncias entorpecentes, medicamentos controlados e psicotrópicos; artigos cujo aluguel seja ilegal ou exija habilitação especial não verificável pela plataforma; itens que violem direitos de propriedade intelectual de terceiros; e qualquer bem cuja transação configure prática ilícita nos termos da legislação brasileira.
          </Text>
        </PolicyBlock>

        <PolicyBlock title="1.6 Obrigações do Locatário" tokens={tokens}>
          <Text style={[s.body, { color: tokens.muted }]}>
            O Locatário se compromete a: utilizar o item exclusivamente para os fins acordados; devolvê-lo no prazo e nas condições originais, ressalvado o desgaste natural pelo uso adequado; comunicar imediatamente qualquer dano, extravio ou sinistro ao Locador e ao ShareO; e responder por danos causados ao item por uso indevido.
          </Text>
        </PolicyBlock>

        {/* 🪤 Taxa, limite e prazo: NUNCA hardcode — vêm de usePlatformConfig() */}
        <PolicyBlock title="1.7 Pagamentos e Taxa de Serviço" tokens={tokens}>
          <Text style={[s.body, { color: tokens.muted }]}>
            Os pagamentos das locações são processados pela{" "}
            <Text style={s.bold}>Stripe</Text>, provedor de pagamentos contratado pelo ShareO, responsável pelo processamento da cobrança e pelo repasse ao Locador. Sobre o valor da locação, o ShareO cobra uma{" "}
            <Text style={s.bold}>taxa de serviço de {feeLabel}</Text>, devida pelo Locatário e exibida no resumo antes da confirmação do pagamento; o valor restante é destinado ao Locador. Nesta versão da plataforma, o checkout aceita{" "}
            <Text style={s.bold}>cartão de crédito à vista, sem parcelamento</Text>, e cada locação está sujeita ao limite de{" "}
            <Text style={s.bold}>{maxLabel} por transação</Text>. O valor pago é{" "}
            <Text style={s.bold}>retido</Text> e não é repassado ao Locador no ato do pagamento: o repasse torna-se elegível{" "}
            <Text style={s.bold}>{payoutLabel} após a confirmação da devolução</Text>{" "}
            do item, prazo que cobre a janela de abertura de disputa, e fica suspenso enquanto houver disputa em análise. Para receber, o Locador deve cadastrar seus dados de recebimento em Meu Perfil → Recebimentos. Não há exigência de caução nesta versão.
          </Text>
        </PolicyBlock>

        <PolicyBlock title="1.8 Alterações nos Termos" tokens={tokens}>
          <Text style={[s.body, { color: tokens.muted }]}>
            O ShareO poderá atualizar estas políticas a qualquer tempo. Alterações substanciais serão comunicadas por e-mail com antecedência mínima de 30 dias. O uso contínuo da plataforma após a entrada em vigor das alterações implica aceitação dos novos termos.
          </Text>
        </PolicyBlock>

        {/* ══ 2. Política de Privacidade (LGPD) — verbatim de page.tsx linhas 167-263 ══ */}
        <SectionHeader
          emoji="🔒"
          title="2. Política de Privacidade (LGPD)"
          tokens={tokens}
        />
        <Text style={[s.sectionIntro, { color: tokens.muted }]}>
          Esta seção atende aos requisitos da Lei Geral de Proteção de Dados Pessoais — Lei nº 13.709/2018 (LGPD).
        </Text>

        <PolicyBlock title="2.1 Dados Coletados" tokens={tokens}>
          <Text style={[s.body, { color: tokens.muted }]}>
            Coletamos os seguintes dados pessoais:{" "}
            <Text style={s.bold}>dados de cadastro</Text> (nome, e-mail, CPF/CNPJ, telefone, endereço);{" "}
            <Text style={s.bold}>dados de identidade</Text> (documento de identificação com foto e selfie, para verificação de identidade opcional);{" "}
            <Text style={s.bold}>dados financeiros</Text> (dados bancários e de verificação informados ao provedor de pagamentos para recebimento de repasses, chave PIX para recebimento, histórico de transações);{" "}
            <Text style={s.bold}>dados de uso</Text> (endereços IP, logs de acesso, dispositivo e navegador);{" "}
            <Text style={s.bold}>dados de localização</Text> (cidade e estado informados no perfil; coordenadas GPS somente quando o usuário concede permissão no dispositivo); e{" "}
            <Text style={s.bold}>conteúdo gerado</Text> (fotos de itens, avaliações, mensagens de chat).
          </Text>
        </PolicyBlock>

        <PolicyBlock title="2.2 Finalidade e Base Legal" tokens={tokens}>
          <View style={s.bulletList}>
            {[
              {
                label:  "Execução do contrato",
                detail: " (Art. 7, V, LGPD): operação da plataforma, processamento de pagamentos, suporte ao usuário.",
              },
              {
                label:  "Obrigação legal",
                detail: " (Art. 7, II, LGPD): cumprimento de obrigações fiscais, anti-lavagem de dinheiro (Lei 9.613/98) e retenção de dados financeiros (CTN Art. 173 — 5 anos).",
              },
              {
                label:  "Legítimo interesse",
                detail: " (Art. 7, IX, LGPD): prevenção a fraudes, segurança da plataforma, melhorias de produto com base em dados anonimizados.",
              },
              {
                label:  "Consentimento",
                detail: " (Art. 7, I, LGPD): envio de comunicações de marketing e novidades. Pode ser revogado a qualquer momento sem prejuízo ao uso do serviço.",
              },
            ].map(({ label, detail }) => (
              <View key={label} style={s.bulletItem}>
                <Text style={[s.bulletDot, { color: tokens.muted }]}>•</Text>
                <Text style={[s.bulletText, { color: tokens.muted }]}>
                  <Text style={[s.bold, { color: tokens.text }]}>{label}</Text>
                  {detail}
                </Text>
              </View>
            ))}
          </View>
        </PolicyBlock>

        <PolicyBlock title="2.3 Compartilhamento de Dados" tokens={tokens}>
          <Text style={[s.body, { color: tokens.muted }]}>
            Seus dados podem ser compartilhados com:{" "}
            <Text style={s.bold}>Stripe</Text> (processamento dos pagamentos, verificação dos dados do Locador e repasse dos valores, atuando como operador de dados financeiros — sujeito à Política de Privacidade da Stripe Inc.);{" "}
            <Text style={s.bold}>Supabase</Text> (infraestrutura de banco de dados e armazenamento — servidores na região sa-east-1, Brasil);{" "}
            <Text style={s.bold}>Resend</Text> (envio de e-mails transacionais);{" "}
            <Text style={s.bold}>Sentry</Text> (monitoramento de erros — dados de sessão anonimizados);{" "}
            <Text style={s.bold}>Mapbox</Text> (mapas e geocodificação — coordenadas aproximadas);{" "}
            <Text style={s.bold}>Vercel</Text> (hospedagem e execução da plataforma — dados das requisições enquanto você usa o site ou o app); e{" "}
            <Text style={s.bold}>Upstash</Text> (proteção contra uso abusivo, contagem de visualizações e cache das consultas de CNPJ — endereço IP, o identificador da sua conta, o e-mail usado no login e, no cadastro de empresa, os dados públicos do CNPJ consultado). Não vendemos dados pessoais a terceiros.
          </Text>
        </PolicyBlock>

        <PolicyBlock title="2.4 Retenção de Dados" tokens={tokens}>
          <Text style={[s.body, { color: tokens.muted }]}>
            Os dados são retidos pelos seguintes prazos: dados de conta ativa — enquanto a conta existir; dados financeiros e de transações — 5 anos (CTN Art. 173); logs de acesso — 6 meses (Marco Civil da Internet, Art. 15); dados de marketing com consentimento — até a revogação pelo titular; dados de verificação de identidade — 5 anos ou conforme exigência regulatória. Após o prazo, os dados são anonimizados ou excluídos.
          </Text>
        </PolicyBlock>

        <PolicyBlock title="2.5 Direitos do Titular (LGPD Art. 18)" tokens={tokens}>
          <Text style={[s.body, { color: tokens.muted }]}>
            Você tem direito a:{" "}
            <Text style={s.bold}>acesso</Text> — obter confirmação e cópia dos seus dados;{" "}
            <Text style={s.bold}>correção</Text> — corrigir dados incompletos, inexatos ou desatualizados;{" "}
            <Text style={s.bold}>anonimização, bloqueio ou eliminação</Text> — de dados desnecessários ou tratados em desconformidade;{" "}
            <Text style={s.bold}>portabilidade</Text> — obter seus dados em formato estruturado;{" "}
            <Text style={s.bold}>informação</Text> — sobre compartilhamento com terceiros;{" "}
            <Text style={s.bold}>revogação do consentimento</Text> — para finalidades que dependam de consentimento; e{" "}
            <Text style={s.bold}>eliminação da conta</Text> — com exclusão de dados não sujeitos a obrigação legal de retenção. Exerça seus direitos em:{" "}
            <Text
              style={[s.link, { color: tokens.green }]}
              onPress={() => openMail("privacidade@shareo.com.br")}
              accessibilityRole="link"
              accessibilityLabel="Enviar e-mail para privacidade@shareo.com.br"
            >
              privacidade@shareo.com.br
            </Text>.
          </Text>
        </PolicyBlock>

        <PolicyBlock title="2.6 Segurança" tokens={tokens}>
          <Text style={[s.body, { color: tokens.muted }]}>
            Adotamos medidas técnicas e organizacionais para proteger seus dados: criptografia em trânsito (TLS 1.2+) e em repouso para dados sensíveis; autenticação com tokens JWT de curta duração; controles de acesso por função (RBAC); e monitoramento contínuo de incidentes via Sentry. Em caso de violação de dados que possa acarretar risco aos titulares, notificaremos a ANPD e os usuários afetados no prazo legal.
          </Text>
        </PolicyBlock>

        <PolicyBlock title="2.7 Encarregado (DPO)" tokens={tokens}>
          <Text style={[s.body, { color: tokens.muted }]}>
            O Encarregado de Proteção de Dados (DPO) do ShareO, nos termos do Art. 41 da LGPD, é:
          </Text>
          <Text style={[s.dpoName, { color: tokens.text }]}>
            Roberto Epifanio da Silva
          </Text>
          <Text style={[s.body, { color: tokens.muted }]}>
            Responsável por assegurar a conformidade da organização com a LGPD e demais normas aplicáveis à privacidade e proteção de dados pessoais. Atua como ponto de contato entre o ShareO, os titulares de dados e a Autoridade Nacional de Proteção de Dados (ANPD), monitorando práticas de tratamento de dados, promovendo treinamentos internos e apoiando a gestão de riscos e a resposta a incidentes de segurança.
          </Text>
          <Text style={[s.body, { color: tokens.muted }]}>
            Contato:{" "}
            <Text
              style={[s.link, { color: tokens.green }]}
              onPress={() => openMail("privacidade@shareo.com.br")}
              accessibilityRole="link"
              accessibilityLabel="Enviar e-mail para privacidade@shareo.com.br"
            >
              privacidade@shareo.com.br
            </Text>
          </Text>
        </PolicyBlock>

        {/* ══ 3. Responsabilidade — verbatim de page.tsx linhas 265-306 ══ */}
        <SectionHeader emoji="⚖️" title="3. Responsabilidade" tokens={tokens} />

        <PolicyBlock title="3.1 Papel do ShareO" tokens={tokens}>
          <Text style={[s.body, { color: tokens.muted }]}>
            O ShareO é uma plataforma de intermediação. Não é parte, locador nem locatário em qualquer transação realizada entre usuários. O contrato de locação é celebrado exclusivamente entre o Locador e o Locatário, ficando o ShareO alheio às obrigações decorrentes desse contrato, salvo na medida em que expressamente assumidas nessas políticas.
          </Text>
        </PolicyBlock>

        <PolicyBlock title="3.2 Limitação de Responsabilidade" tokens={tokens}>
          <Text style={[s.body, { color: tokens.muted }]}>
            O ShareO não se responsabiliza por: (a) danos ao item locado ou a terceiros decorrentes de uso indevido pelo Locatário; (b) inexatidão nas informações prestadas pelos usuários; (c) inadimplemento de qualquer obrigação entre Locador e Locatário; (d) eventos de força maior ou caso fortuito que impeçam a realização da locação. A responsabilidade total do ShareO, em qualquer hipótese, fica limitada ao valor da taxa de serviço da transação em questão.
          </Text>
        </PolicyBlock>

        <PolicyBlock title="3.3 Disputas" tokens={tokens}>
          <Text style={[s.body, { color: tokens.muted }]}>
            Em caso de conflito entre Locador e Locatário, o ShareO oferece um mecanismo de mediação disponível na plataforma. O prazo para abrir uma disputa depende de quem abre: o Locatário pode abrir enquanto a locação estiver ativa, antes de devolver o item; o Locador pode abrir somente depois que o Locatário devolver o item, em até 48 horas a partir da devolução. O ShareO analisará as evidências apresentadas e emitirá uma decisão em até 5 dias úteis, que poderá incluir reembolso parcial ou total ao Locatário ou liberação do valor ao Locador. A decisão do ShareO é vinculante para efeitos do repasse do valor retido na plataforma.
          </Text>
        </PolicyBlock>

        <PolicyBlock title="3.4 Indenização" tokens={tokens}>
          <Text style={[s.body, { color: tokens.muted }]}>
            Você concorda em indenizar e isentar o ShareO, seus diretores, funcionários e parceiros de qualquer reclamação, dano, perda, responsabilidade ou despesa (incluindo honorários advocatícios) decorrentes de: (a) violação destas políticas; (b) uso indevido da plataforma; ou (c) infração de direitos de terceiros.
          </Text>
        </PolicyBlock>

        {/* ══ 4. Cancelamento e Reembolso — verbatim de page.tsx linhas 308-353 ══ */}
        {/* 🪤 cancel.*: NUNCA hardcode — vêm de usePlatformConfig().cancel */}
        <SectionHeader
          emoji="↩️"
          title="4. Cancelamento e Reembolso"
          tokens={tokens}
        />

        <PolicyBlock title="4.1 Cancelamento pelo Locatário" tokens={tokens}>
          <Text style={[s.body, { color: tokens.muted }]}>
            O cancelamento não depende da antecedência em relação ao início da locação: o Locatário recebe de volta 100% do valor pago, descontada apenas a taxa que a Stripe já havia cobrado sobre a cobrança original — repassada integralmente ao provedor de pagamentos, sem retenção pelo ShareO.
          </Text>
        </PolicyBlock>

        <PolicyBlock title="4.2 Cancelamento pelo Locador" tokens={tokens}>
          <Text style={[s.body, { color: tokens.muted }]}>
            O cancelamento pelo Locador após a confirmação da reserva resulta em reembolso integral ao Locatário. Cancelamentos recorrentes por parte do Locador podem acarretar advertência, suspensão temporária ou encerramento de conta, a critério do ShareO.
          </Text>
        </PolicyBlock>

        <PolicyBlock title="4.3 Processamento do Reembolso" tokens={tokens}>
          <Text style={[s.body, { color: tokens.muted }]}>
            Reembolsos são processados pela Stripe, provedor de pagamentos do ShareO, e devolvidos ao mesmo meio de pagamento utilizado na reserva — não é possível reembolsar em conta ou meio diferente. Depois de emitido o estorno, o prazo até o crédito aparecer é definido pelo banco ou operadora do cartão, não pelo ShareO nem pela Stripe. O ShareO não retém a taxa de serviço sobre o valor reembolsado.
          </Text>
        </PolicyBlock>

        {/* ══ 5. Cookies e Analytics — verbatim de page.tsx linhas 355-384 ══ */}
        <SectionHeader
          emoji="🍪"
          title="5. Cookies e Analytics"
          tokens={tokens}
        />

        <PolicyBlock title="5.1 Cookies Funcionais" tokens={tokens}>
          <Text style={[s.body, { color: tokens.muted }]}>
            Utilizamos cookies estritamente necessários para: manter sua sessão autenticada; lembrar preferências de navegação; e garantir o funcionamento seguro da plataforma. Esses cookies não podem ser desativados sem comprometer o uso do serviço.
          </Text>
        </PolicyBlock>

        <PolicyBlock title="5.2 Analytics" tokens={tokens}>
          {/*
            O link de opt-out do GA saiu junto com a declaração: sem ferramenta de
            analytics não há do que optar por sair, e manter o link sugeriria que
            existe medição. Se o analytics voltar, o link volta com ele — era o MEIO
            de exercer o direito, não enfeite.
          */}
          <Text style={[s.body, { color: tokens.muted }]}>
            A plataforma <Text style={s.bold}>não utiliza ferramentas de analytics de terceiros</Text>: não usamos cookies analíticos e não enviamos seus dados de navegação a terceiros para essa finalidade. Contamos <Text style={s.bold}>visualizações por anúncio</Text>, de forma agregada, para mostrar o desempenho a quem anuncia — esse número não identifica quem visitou.
          </Text>
        </PolicyBlock>

        {/* ══ 6. Contato — verbatim de page.tsx linhas 386-418 ══ */}
        <SectionHeader emoji="✉️" title="6. Contato" tokens={tokens} />

        <View
          style={[
            s.contactCard,
            { borderColor: tokens.border, backgroundColor: tokens.surface },
          ]}
        >
          <View style={s.contactRow}>
            <Text style={[s.contactLabel, { color: tokens.text }]}>
              Dúvidas gerais e suporte:
            </Text>
            <Text
              style={[s.link, { color: tokens.green }]}
              onPress={() => openMail("suporte@shareo.com.br")}
              accessibilityRole="link"
              accessibilityLabel="Enviar e-mail para suporte@shareo.com.br"
            >
              suporte@shareo.com.br
            </Text>
          </View>
          <View style={s.contactRow}>
            <Text style={[s.contactLabel, { color: tokens.text }]}>
              Privacidade e direitos LGPD:
            </Text>
            <Text
              style={[s.link, { color: tokens.green }]}
              onPress={() => openMail("privacidade@shareo.com.br")}
              accessibilityRole="link"
              accessibilityLabel="Enviar e-mail para privacidade@shareo.com.br"
            >
              privacidade@shareo.com.br
            </Text>
          </View>
          <View style={s.contactRow}>
            <Text style={[s.contactLabel, { color: tokens.text }]}>
              Segurança e incidentes:
            </Text>
            <Text
              style={[s.link, { color: tokens.green }]}
              onPress={() => openMail("seguranca@shareo.com.br")}
              accessibilityRole="link"
              accessibilityLabel="Enviar e-mail para seguranca@shareo.com.br"
            >
              seguranca@shareo.com.br
            </Text>
          </View>
        </View>

        {/* IdentificacaoPrestador — verbatim de page.tsx linha 416 */}
        <View style={s.prestadorWrapper}>
          <IdentificacaoPrestador />
        </View>

        {/* ── Rodapé — verbatim de page.tsx linhas 422-433 ── */}
        <View
          style={[
            s.footer,
            {
              borderColor:     tokens.border,
              backgroundColor: tokens.surface,
            },
          ]}
        >
          <Text style={[s.footerText, { color: tokens.muted }]}>
            Dúvidas sobre as políticas?{" "}
            <Text
              style={[s.link, { color: tokens.green }]}
              onPress={() => router.push("/ajuda" as never)}
              accessibilityRole="link"
              accessibilityLabel="Central de ajuda"
            >
              Consulte nossa central de ajuda
            </Text>
            {" "}ou entre em contato em{" "}
            <Text
              style={[s.link, { color: tokens.green }]}
              onPress={() => openMail("suporte@shareo.com.br")}
              accessibilityRole="link"
              accessibilityLabel="Enviar e-mail para suporte@shareo.com.br"
            >
              suporte@shareo.com.br
            </Text>.
          </Text>
        </View>

      </ScrollView>
    </View>
  )
}

// ── Estilos ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root:   { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingBottom: 48 },

  // ── Bloco de título ──────────────────────────────────────────────────────────
  titleSection: {
    paddingHorizontal: 16,
    paddingTop:        24,
    paddingBottom:     8,
    gap:               6,
  },
  pageTitle: {
    fontSize:   26,
    fontWeight: "800",
    lineHeight: 32,
  },
  updatedAt: {
    fontSize:  12,
    marginTop: 2,
  },
  intro: {
    fontSize:   14,
    lineHeight: 22,
    marginTop:  4,
  },

  // ── Índice ───────────────────────────────────────────────────────────────────
  indexCard: {
    marginHorizontal: 16,
    marginTop:        16,
    borderWidth:      1,
    borderRadius:     12,
    padding:          16,
    gap:              8,
  },
  indexHeading: {
    fontSize:      12,
    fontWeight:    "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom:  4,
  },
  indexItem: {
    fontSize:  14,
    lineHeight: 22,
  },

  // ── Subtítulo de seção (privacidade) ─────────────────────────────────────────
  sectionIntro: {
    fontSize:          14,
    lineHeight:        20,
    paddingHorizontal: 16,
    paddingTop:        8,
    paddingBottom:     4,
  },

  // ── Conteúdo dos blocos ───────────────────────────────────────────────────────
  body: {
    fontSize:  14,
    lineHeight: 22,
  },
  bodySmallMuted: {
    fontSize:   13,
    lineHeight: 20,
    marginTop:  8,
  },
  bold: {
    fontWeight: "700",
  },

  // ── DPO name ──────────────────────────────────────────────────────────────────
  dpoName: {
    fontSize:    15,
    fontWeight:  "700",
    marginTop:   8,
    marginBottom: 4,
  },

  // ── Listas com marcadores ─────────────────────────────────────────────────────
  bulletList: {
    gap: 6,
  },
  bulletItem: {
    flexDirection: "row",
    alignItems:    "flex-start",
    gap:           8,
  },
  bulletDot: {
    fontSize:   14,
    lineHeight: 22,
    flexShrink: 0,
    width:      12,
  },
  bulletText: {
    flex:       1,
    fontSize:   14,
    lineHeight: 22,
  },

  // ── Link inline ──────────────────────────────────────────────────────────────
  link: {
    fontWeight: "600",
  },

  // ── Card de contato ──────────────────────────────────────────────────────────
  contactCard: {
    marginHorizontal: 16,
    marginTop:        12,
    borderWidth:      1,
    borderRadius:     12,
    padding:          16,
    gap:              12,
  },
  contactRow: {
    gap: 2,
  },
  contactLabel: {
    fontSize:   14,
    fontWeight: "700",
  },

  // ── IdentificacaoPrestador wrapper ────────────────────────────────────────────
  prestadorWrapper: {
    marginTop: 4,
  },

  // ── Rodapé ───────────────────────────────────────────────────────────────────
  footer: {
    marginHorizontal: 16,
    marginTop:        24,
    borderWidth:      1,
    borderRadius:     12,
    padding:          16,
    alignItems:       "center",
  },
  footerText: {
    fontSize:  14,
    lineHeight: 22,
    textAlign: "center",
  },
})
