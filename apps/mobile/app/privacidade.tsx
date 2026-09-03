// Fonte: app/privacidade/page.tsx
// Política de Privacidade — documento legal público.
// NÃO confundir com apps/mobile/app/perfil/dados.tsx (gestão de dados do usuário).

import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
} from "react-native"
import { router } from "expo-router"
import { useTheme } from "@/lib/theme"
import { ScreenHeader } from "@/components/layout/ScreenHeader"
import { API_URL } from "@/lib/api"
import { IdentificacaoPrestador } from "@/components/legal/IdentificacaoPrestador"
import { POLICY_UPDATED_AT } from "@/lib/legalConfig"

// Rotas do site que têm tela nativa equivalente — navegam via router.push
// em vez de abrir o navegador. (2026-07-09: 6 páginas do rodapé transcritas.)
const NATIVE_ROUTES = new Set(["/termos", "/ajuda", "/comunidade", "/ganhar", "/seguranca", "/sobre"])

export default function PrivacidadeScreen() {
  const { tokens } = useTheme()

  function openMail(address: string) {
    Linking.openURL(`mailto:${address}`)
  }

  // 2026-07-09: /termos, /ajuda etc. ganharam tela nativa — navega nativo se
  // houver tela; senão abre no navegador.
  function openSite(path: string) {
    if (NATIVE_ROUTES.has(path)) {
      router.push(path as never)
      return
    }
    Linking.openURL(`${API_URL}${path}`)
  }

  return (
    <View style={[s.root, { backgroundColor: tokens.bg }]}>

      <ScreenHeader title="Política de Privacidade" />

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Título da página — verbatim de page.tsx linha 15-16 ── */}
        <View style={[s.pageHead, { backgroundColor: tokens.bg }]}>
          <Text
            style={[s.pageTitle, { color: tokens.navy }]}
            accessibilityRole="header"
          >
            Política de Privacidade
          </Text>
          <Text style={[s.pageSubtitle, { color: tokens.muted }]}>
            Última atualização: {POLICY_UPDATED_AT}
          </Text>
        </View>

        {/* Verbatim de page.tsx — identifica o controlador. */}
        <IdentificacaoPrestador papel="controlador" />

        {/* ── Seção 1 — Introdução ── */}
        <View style={[s.section, { borderColor: tokens.border }]}>
          <Text style={[s.sectionTitle, { color: tokens.navy }]}>1. Introdução</Text>
          <Text style={[s.paragraph, { color: tokens.muted }]}>
            O ShareO está comprometido com a proteção dos seus dados pessoais. Esta Política descreve como coletamos, usamos, armazenamos e protegemos suas informações, em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018).
          </Text>
        </View>

        {/* ── Seção 2 — Dados Coletados ── */}
        <View style={[s.section, { borderColor: tokens.border }]}>
          <Text style={[s.sectionTitle, { color: tokens.navy }]}>2. Dados Coletados</Text>
          <Text style={[s.paragraph, { color: tokens.muted }]}>Coletamos os seguintes dados:</Text>
          <View style={s.bulletList}>
            <View style={s.bulletItem}>
              <Text style={[s.bulletDot, { color: tokens.muted }]}>•</Text>
              <Text style={[s.bulletText, { color: tokens.muted }]}>
                <Text style={[s.bold, { color: tokens.text }]}>Cadastro:</Text>
                {" "}nome, e-mail, CPF/CNPJ, telefone, endereço
              </Text>
            </View>
            <View style={s.bulletItem}>
              <Text style={[s.bulletDot, { color: tokens.muted }]}>•</Text>
              <Text style={[s.bulletText, { color: tokens.muted }]}>
                <Text style={[s.bold, { color: tokens.text }]}>Uso da plataforma:</Text>
                {" "}itens visualizados, reservas realizadas, avaliações
              </Text>
            </View>
            <View style={s.bulletItem}>
              <Text style={[s.bulletDot, { color: tokens.muted }]}>•</Text>
              <Text style={[s.bulletText, { color: tokens.muted }]}>
                <Text style={[s.bold, { color: tokens.text }]}>Localização:</Text>
                {" "}cidade e estado para exibição de itens próximos (com sua autorização)
              </Text>
            </View>
            <View style={s.bulletItem}>
              <Text style={[s.bulletDot, { color: tokens.muted }]}>•</Text>
              <Text style={[s.bulletText, { color: tokens.muted }]}>
                <Text style={[s.bold, { color: tokens.text }]}>Comunicações:</Text>
                {" "}mensagens trocadas pelo chat da plataforma
              </Text>
            </View>
            <View style={s.bulletItem}>
              <Text style={[s.bulletDot, { color: tokens.muted }]}>•</Text>
              <Text style={[s.bulletText, { color: tokens.muted }]}>
                <Text style={[s.bold, { color: tokens.text }]}>Técnicos:</Text>
                {" "}endereço IP, tipo de navegador, sistema operacional
              </Text>
            </View>
          </View>
        </View>

        {/* ── Seção 2.1 — Dados de Contas PJ ── */}
        <View style={[s.section, { borderColor: tokens.border }]}>
          <Text style={[s.sectionTitle, { color: tokens.navy }]}>
            2.1. Dados de Contas Pessoa Jurídica (PJ)
          </Text>
          <Text style={[s.paragraph, { color: tokens.muted }]}>
            Ao cadastrar uma empresa, coletamos e tratamos dados adicionais para prevenção a fraude e segurança jurídica das transações:
          </Text>
          <View style={s.bulletList}>
            <View style={s.bulletItem}>
              <Text style={[s.bulletDot, { color: tokens.muted }]}>•</Text>
              <Text style={[s.bulletText, { color: tokens.muted }]}>
                <Text style={[s.bold, { color: tokens.text }]}>Situação cadastral do CNPJ</Text>
                {" "}(razão social, situação na Receita Federal e data de abertura), consultada em fontes públicas da Receita — dado público, tratado para cumprimento de obrigação legal e regulatória (LGPD art. 7º, II).
              </Text>
            </View>
            <View style={s.bulletItem}>
              <Text style={[s.bulletDot, { color: tokens.muted }]}>•</Text>
              <Text style={[s.bulletText, { color: tokens.muted }]}>
                <Text style={[s.bold, { color: tokens.text }]}>Nome do responsável legal</Text>
                {" "}da empresa — necessário para identificar quem responde pela conta, com base na execução do contrato (LGPD art. 7º, V) e no legítimo interesse de prevenção a fraude (art. 7º, IX). É armazenado com criptografia.
              </Text>
            </View>
            <View style={s.bulletItem}>
              <Text style={[s.bulletDot, { color: tokens.muted }]}>•</Text>
              <Text style={[s.bulletText, { color: tokens.muted }]}>
                <Text style={[s.bold, { color: tokens.text }]}>Registro da declaração de vínculo</Text>
                {" "}(data, hora e endereço IP em que o responsável legal declarou representar a empresa) — tratado com base no legítimo interesse, como evidência em eventual processo (art. 7º, IX). O endereço IP da declaração é retido por até 5 anos.
              </Text>
            </View>
          </View>
          <Text style={[s.paragraph, { color: tokens.muted }]}>
            Por não se basearem em consentimento, esses dados não podem ser revogados isoladamente — apenas mediante exclusão da conta, respeitados os prazos legais de retenção.
          </Text>
        </View>

        {/* ── Seção 3 — Finalidade do Tratamento ── */}
        <View style={[s.section, { borderColor: tokens.border }]}>
          <Text style={[s.sectionTitle, { color: tokens.navy }]}>3. Finalidade do Tratamento</Text>
          <Text style={[s.paragraph, { color: tokens.muted }]}>Usamos seus dados para:</Text>
          <View style={s.bulletList}>
            {[
              "Criar e gerenciar sua conta na plataforma",
              "Facilitar transações entre locatários e locadores",
              "Enviar notificações sobre reservas e mensagens",
              "Prevenir fraudes e garantir a segurança da plataforma",
              "Melhorar nossos serviços com base em análises de uso",
              "Cumprir obrigações legais e regulatórias",
            ].map((item) => (
              <View key={item} style={s.bulletItem}>
                <Text style={[s.bulletDot, { color: tokens.muted }]}>•</Text>
                <Text style={[s.bulletText, { color: tokens.muted }]}>{item}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Seção 4 — Compartilhamento de Dados ── */}
        <View style={[s.section, { borderColor: tokens.border }]}>
          <Text style={[s.sectionTitle, { color: tokens.navy }]}>4. Compartilhamento de Dados</Text>
          <Text style={[s.paragraph, { color: tokens.muted }]}>
            Não vendemos seus dados a terceiros. Podemos compartilhá-los com: parceiros de processamento de pagamento (para finalizar transações); autoridades públicas (quando exigido por lei); prestadores de serviço de infraestrutura tecnológica (hospedagem, e-mail, analytics), sempre sob acordo de confidencialidade.
          </Text>
        </View>

        {/* ── Seção 5 — Armazenamento e Segurança ── */}
        <View style={[s.section, { borderColor: tokens.border }]}>
          <Text style={[s.sectionTitle, { color: tokens.navy }]}>5. Armazenamento e Segurança</Text>
          <Text style={[s.paragraph, { color: tokens.muted }]}>
            Seus dados são armazenados em servidores seguros com criptografia em trânsito (TLS) e em repouso. Documentos sensíveis (CPF/CNPJ) são armazenados com criptografia adicional. Adotamos controles de acesso rigorosos e monitoramento de segurança contínuo.
          </Text>
        </View>

        {/* ── Seção 6 — Seus Direitos (LGPD) ── */}
        <View style={[s.section, { borderColor: tokens.border }]}>
          <Text style={[s.sectionTitle, { color: tokens.navy }]}>6. Seus Direitos (LGPD)</Text>
          <Text style={[s.paragraph, { color: tokens.muted }]}>Você tem direito a:</Text>
          <View style={s.bulletList}>
            {[
              "Confirmar a existência de tratamento dos seus dados",
              "Acessar seus dados pessoais",
              "Corrigir dados incompletos, inexatos ou desatualizados",
              "Solicitar a exclusão de dados desnecessários ou excessivos",
              "Revogar consentimentos fornecidos",
              "Portabilidade dos seus dados",
            ].map((item) => (
              <View key={item} style={s.bulletItem}>
                <Text style={[s.bulletDot, { color: tokens.muted }]}>•</Text>
                <Text style={[s.bulletText, { color: tokens.muted }]}>{item}</Text>
              </View>
            ))}
          </View>
          <Text style={[s.paragraph, { color: tokens.muted }]}>
            Para exercer esses direitos, acesse as configurações da sua conta ou entre em contato via{" "}
            <Text
              style={[s.link, { color: tokens.green }]}
              onPress={() => openMail("privacidade@shareo.com.br")}
              accessibilityRole="link"
              accessibilityLabel="Enviar e-mail para privacidade@shareo.com.br"
            >
              privacidade@shareo.com.br
            </Text>
          </Text>
        </View>

        {/* ── Seção 7 — Cookies ── */}
        <View style={[s.section, { borderColor: tokens.border }]}>
          <Text style={[s.sectionTitle, { color: tokens.navy }]}>7. Cookies</Text>
          <Text style={[s.paragraph, { color: tokens.muted }]}>
            Utilizamos cookies essenciais para o funcionamento da plataforma (autenticação, preferências) e cookies analíticos (com seu consentimento) para entender como você usa o ShareO e melhorar a experiência.
          </Text>
        </View>

        {/* ── Seção 8 — Retenção de Dados ── */}
        <View style={[s.section, { borderColor: tokens.border }]}>
          <Text style={[s.sectionTitle, { color: tokens.navy }]}>8. Retenção de Dados</Text>
          <Text style={[s.paragraph, { color: tokens.muted }]}>
            Mantemos seus dados enquanto sua conta estiver ativa ou pelo período necessário para cumprir obrigações legais. A exclusão da conta é processada imediatamente: seus dados de identificação, localização, documentos e textos escritos por você são anonimizados ou apagados no momento da solicitação. Documentos e imagens são removidos definitivamente, sem cópia em backup. Registros de transações concluídas são preservados de forma anonimizada pelo prazo exigido pela legislação fiscal (5 anos), sem identificar você. Cópias de segurança do banco de dados são substituídas em até 7 dias.
          </Text>
        </View>

        {/* ── Seção 9 — Contato ── */}
        <View style={[s.section, { borderColor: tokens.border }]}>
          <Text style={[s.sectionTitle, { color: tokens.navy }]}>9. Contato</Text>
          <Text style={[s.paragraph, { color: tokens.muted }]}>
            Dúvidas sobre esta Política ou sobre o tratamento dos seus dados? Entre em contato com nosso encarregado de proteção de dados (DPO):{" "}
            <Text
              style={[s.link, { color: tokens.green }]}
              onPress={() => openMail("privacidade@shareo.com.br")}
              accessibilityRole="link"
              accessibilityLabel="Enviar e-mail para privacidade@shareo.com.br"
            >
              privacidade@shareo.com.br
            </Text>
          </Text>
        </View>

        {/* ── Footer — links verbatim de page.tsx linha 138-141 ── */}
        {/* /termos e /ajuda não têm rotas nativas → abre no site via Linking */}
        <View style={[s.footer, { borderColor: tokens.border }]}>
          <TouchableOpacity
            onPress={() => openSite("/termos")}
            accessibilityRole="link"
            accessibilityLabel="Termos de Uso"
            style={s.footerLink}
          >
            <Text style={[s.footerLinkText, { color: tokens.green }]}>Termos de Uso</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => openSite("/ajuda")}
            accessibilityRole="link"
            accessibilityLabel="Central de Ajuda"
            style={s.footerLink}
          >
            <Text style={[s.footerLinkText, { color: tokens.green }]}>Central de Ajuda</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  root:   { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingBottom: 48 },

  // ── Cabeçalho da página ──────────────────────────────────────────────────────
  pageHead: {
    paddingHorizontal: 16,
    paddingTop:        24,
    paddingBottom:     8,
    gap:               4,
  },
  pageTitle: {
    fontSize:   24,
    fontWeight: "800",
    lineHeight: 30,
  },
  pageSubtitle: {
    fontSize:  13,
    lineHeight: 18,
  },

  // ── Seções de conteúdo ───────────────────────────────────────────────────────
  section: {
    paddingHorizontal: 16,
    paddingVertical:   16,
    gap:               8,
    borderBottomWidth: 1,
  },
  sectionTitle: {
    fontSize:   15,
    fontWeight: "700",
    lineHeight: 22,
  },
  paragraph: {
    fontSize:  14,
    lineHeight: 22,
  },
  bold: {
    fontWeight: "700",
  },
  link: {
    fontWeight: "600",
    // underline via textDecorationLine não suportado em Text aninhado em todas versões
    // usar só a cor diferenciada (padrão do site usa `hover:underline` que é desktop-only)
  },

  // ── Listas com marcadores ────────────────────────────────────────────────────
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

  // ── Footer de links ──────────────────────────────────────────────────────────
  footer: {
    flexDirection:     "row",
    gap:               24,
    paddingHorizontal: 16,
    paddingVertical:   20,
    borderTopWidth:    1,
    marginTop:         8,
  },
  footerLink: {
    minHeight:      44,
    justifyContent: "center",
  },
  footerLinkText: {
    fontSize:   13,
    fontWeight: "600",
  },
})
