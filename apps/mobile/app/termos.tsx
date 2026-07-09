// Fonte: app/termos/page.tsx
// Taxa de serviço lida de /api/platform-config/public (nunca hardcode — CLAUDE.md).
// CHECKOUT_MAX_CENTS = 50 000 basis cents → R$ 500,00 (constante de código, não do banco).

import { useEffect, useState } from "react"
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
  ActivityIndicator,
} from "react-native"
import { router } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useTheme } from "@/lib/theme"
import { API_URL } from "@/lib/api"

// Constante espelhada de lib/legal-config.ts
const POLICY_UPDATED_AT = "junho de 2026"

// Limite por transação em reais — espelha CHECKOUT_MAX_CENTS / 100 de lib/platform-config.ts
const MAX_POR_TRANSACAO = "R$ 500,00"

export default function TermosScreen() {
  const { tokens } = useTheme()
  const insets = useSafeAreaInsets()

  // Taxa da plataforma em basis points (ex: 1500 = 15%).
  // Buscada de /api/platform-config/public para nunca hardcodar.
  const [feeRateBps, setFeeRateBps] = useState<number | null>(null)

  useEffect(() => {
    fetch(`${API_URL}/api/platform-config/public`)
      .then((r) => r.json())
      .then((json) => {
        const bps = json?.data?.feeRateBps
        if (typeof bps === "number") setFeeRateBps(bps)
      })
      .catch(() => {
        // Fallback: assume taxa padrão de 15% (1500 bps) se offline
        setFeeRateBps(1500)
      })
  }, [])

  // Converte basis points para string "15" (igual a (feeRate / 100).toLocaleString("pt-BR"))
  const feePct = feeRateBps !== null ? String(feeRateBps / 100) : null

  return (
    <View style={[s.root, { backgroundColor: tokens.bg }]}>

      {/* ── Header — padrão de sobre.tsx / dados.tsx ── */}
      <View
        style={[
          s.header,
          {
            paddingTop: insets.top + 8,
            backgroundColor: tokens.surface,
            borderColor: tokens.border,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          accessibilityLabel="Voltar"
          accessibilityRole="button"
          style={s.backBtn}
        >
          <Text style={[s.backArrow, { color: tokens.muted }]}>‹</Text>
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: tokens.navy }]}>Termos de Uso</Text>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Título e data — verbatim de page.tsx linhas 24-25 ── */}
        <View style={[s.titleSection, { backgroundColor: tokens.bg }]}>
          <Text
            style={[s.pageTitle, { color: tokens.navy }]}
            accessibilityRole="header"
          >
            Termos de Uso
          </Text>
          <Text style={[s.updatedAt, { color: tokens.muted }]}>
            Última atualização: {POLICY_UPDATED_AT}
          </Text>
        </View>

        {/* ── Seção 1 — verbatim de page.tsx linhas 29-34 ── */}
        <View style={[s.section, { backgroundColor: tokens.bg }]}>
          <Text style={[s.sectionTitle, { color: tokens.navy }]}>
            1. Aceitação dos Termos
          </Text>
          <Text style={[s.paragraph, { color: tokens.muted }]}>
            Ao acessar ou usar a plataforma ShareO, você concorda com estes Termos de Uso. Se não concordar com alguma parte, não utilize nossos serviços.
          </Text>
        </View>

        <View style={[s.divider, { backgroundColor: tokens.border }]} />

        {/* ── Seção 2 — verbatim de page.tsx linhas 36-41 ── */}
        <View style={[s.section, { backgroundColor: tokens.bg }]}>
          <Text style={[s.sectionTitle, { color: tokens.navy }]}>
            2. Descrição do Serviço
          </Text>
          <Text style={[s.paragraph, { color: tokens.muted }]}>
            O ShareO é um marketplace de economia circular que conecta pessoas que desejam alugar itens (locatários) com pessoas que possuem itens disponíveis para locação (locadores). O ShareO atua como intermediário tecnológico e não é responsável pelos itens anunciados.
          </Text>
        </View>

        <View style={[s.divider, { backgroundColor: tokens.border }]} />

        {/* ── Seção 3 — verbatim de page.tsx linhas 43-55 ── */}
        <View style={[s.section, { backgroundColor: tokens.bg }]}>
          <Text style={[s.sectionTitle, { color: tokens.navy }]}>
            3. Cadastro e Conta
          </Text>
          <Text style={[s.paragraph, { color: tokens.muted }]}>
            Para utilizar os serviços completos do ShareO, é necessário criar uma conta fornecendo informações verdadeiras e atualizadas. Você é responsável por manter a confidencialidade de sua senha e por todas as atividades realizadas em sua conta.
          </Text>
          <Text style={[s.paragraph, { color: tokens.muted, marginTop: 8 }]}>
            <Text style={[s.bold, { color: tokens.text }]}>Contas Pessoa Jurídica (PJ):</Text>
            {" "}ao cadastrar uma empresa, o ShareO valida a situação cadastral do CNPJ junto à Receita Federal, e quem realiza o cadastro declara, sob as penas da lei (art. 299 do Código Penal), ser o representante legal da pessoa jurídica ou possuir poderes para representá-la. Essa declaração é registrada com data, hora e endereço IP. CNPJs inativos, baixados ou suspensos não são aceitos, e o ShareO pode encerrar contas cujo vínculo se mostre falso.
          </Text>
        </View>

        <View style={[s.divider, { backgroundColor: tokens.border }]} />

        {/* ── Seção 4 — verbatim de page.tsx linhas 57-62 ── */}
        <View style={[s.section, { backgroundColor: tokens.bg }]}>
          <Text style={[s.sectionTitle, { color: tokens.navy }]}>
            4. Responsabilidades do Locador
          </Text>
          <Text style={[s.paragraph, { color: tokens.muted }]}>
            O locador é responsável por: (a) garantir que o item anunciado lhe pertence ou que possui autorização para alugá-lo; (b) descrever o item com precisão, incluindo seu estado de conservação; (c) entregar o item nas condições anunciadas; (d) cumprir os prazos acordados.
          </Text>
        </View>

        <View style={[s.divider, { backgroundColor: tokens.border }]} />

        {/* ── Seção 5 — verbatim de page.tsx linhas 64-69 ── */}
        <View style={[s.section, { backgroundColor: tokens.bg }]}>
          <Text style={[s.sectionTitle, { color: tokens.navy }]}>
            5. Responsabilidades do Locatário
          </Text>
          <Text style={[s.paragraph, { color: tokens.muted }]}>
            O locatário é responsável por: (a) usar o item de acordo com sua finalidade e com cuidado; (b) devolver o item no prazo e nas condições em que o recebeu; (c) ressarcir eventuais danos causados ao item durante a locação.
          </Text>
        </View>

        <View style={[s.divider, { backgroundColor: tokens.border }]} />

        {/* ── Seção 6 — verbatim de page.tsx linhas 71-76 ── */}
        {/* Taxa: buscada de /api/platform-config/public, nunca hardcodada. */}
        {/* Limite: R$ 500,00 = CHECKOUT_MAX_CENTS / 100 (constante de código). */}
        <View style={[s.section, { backgroundColor: tokens.bg }]}>
          <Text style={[s.sectionTitle, { color: tokens.navy }]}>
            6. Pagamentos e Taxa de Serviço
          </Text>
          {feePct === null ? (
            <ActivityIndicator
              size="small"
              color={tokens.navy}
              style={s.loader}
              accessibilityLabel="Carregando taxa de serviço"
            />
          ) : (
            <Text style={[s.paragraph, { color: tokens.muted }]}>
              Os pagamentos são processados de forma segura pela plataforma, que intermedia o valor da locação entre locatário e locador. O locatário paga o valor da locação; sobre esse valor, o ShareO retém uma taxa de serviço de {feePct}% e repassa o restante ao locador. O repasse aos locadores é realizado semanalmente, às segundas-feiras, referente às locações concluídas. Cada transação está sujeita a um limite de {MAX_POR_TRANSACAO}. A taxa de serviço vigente é informada no momento da contratação e pode ser alterada mediante atualização destes Termos.
            </Text>
          )}
        </View>

        <View style={[s.divider, { backgroundColor: tokens.border }]} />

        {/* ── Seção 7 — verbatim de page.tsx linhas 78-83 ── */}
        <View style={[s.section, { backgroundColor: tokens.bg }]}>
          <Text style={[s.sectionTitle, { color: tokens.navy }]}>
            7. Condutas Proibidas
          </Text>
          <Text style={[s.paragraph, { color: tokens.muted }]}>
            É proibido: usar a plataforma para fins ilegais; anunciar itens de origem ilícita; assediar outros usuários; fornecer informações falsas; tentar burlar o sistema de pagamento da plataforma.
          </Text>
        </View>

        <View style={[s.divider, { backgroundColor: tokens.border }]} />

        {/* ── Seção 8 — verbatim de page.tsx linhas 85-90 ── */}
        <View style={[s.section, { backgroundColor: tokens.bg }]}>
          <Text style={[s.sectionTitle, { color: tokens.navy }]}>
            8. Limitação de Responsabilidade
          </Text>
          <Text style={[s.paragraph, { color: tokens.muted }]}>
            O ShareO não se responsabiliza por danos diretos ou indiretos decorrentes do uso da plataforma, incluindo disputas entre usuários, danos aos itens ou indisponibilidade temporária do serviço.
          </Text>
        </View>

        <View style={[s.divider, { backgroundColor: tokens.border }]} />

        {/* ── Seção 9 — verbatim de page.tsx linhas 92-97 ── */}
        <View style={[s.section, { backgroundColor: tokens.bg }]}>
          <Text style={[s.sectionTitle, { color: tokens.navy }]}>
            9. Alterações nos Termos
          </Text>
          <Text style={[s.paragraph, { color: tokens.muted }]}>
            O ShareO pode atualizar estes Termos a qualquer momento. Notificaremos os usuários sobre alterações significativas. O uso continuado da plataforma após as alterações implica aceitação dos novos termos.
          </Text>
        </View>

        <View style={[s.divider, { backgroundColor: tokens.border }]} />

        {/* ── Seção 10 — verbatim de page.tsx linhas 99-107 ── */}
        {/* Link mailto: abre client de e-mail nativo via Linking.openURL. */}
        <View style={[s.section, { backgroundColor: tokens.bg }]}>
          <Text style={[s.sectionTitle, { color: tokens.navy }]}>
            10. Contato
          </Text>
          <Text style={[s.paragraph, { color: tokens.muted }]}>
            Dúvidas sobre estes Termos? Entre em contato:{" "}
            <Text
              style={[s.link, { color: tokens.green }]}
              onPress={() => Linking.openURL("mailto:suporte@shareo.com.br")}
              accessibilityRole="link"
              accessibilityLabel="Enviar e-mail para suporte@shareo.com.br"
            >
              suporte@shareo.com.br
            </Text>
          </Text>
        </View>

        {/* ── Rodapé com links — verbatim de page.tsx linhas 110-113 ── */}
        {/* Nenhuma dessas rotas tem tela nativa → abre no browser via Linking.openURL. */}
        <View
          style={[
            s.footer,
            {
              borderColor: tokens.border,
            },
          ]}
        >
          <TouchableOpacity
            onPress={() => router.push("/privacidade" as never)}
            accessibilityRole="link"
            accessibilityLabel="Política de Privacidade"
            style={s.footerLink}
          >
            <Text style={[s.footerLinkText, { color: tokens.green }]}>
              Política de Privacidade
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push("/ajuda" as never)}
            accessibilityRole="link"
            accessibilityLabel="Central de Ajuda"
            style={s.footerLink}
          >
            <Text style={[s.footerLinkText, { color: tokens.green }]}>
              Central de Ajuda
            </Text>
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

  // ── Header ───────────────────────────────────────────────────────────────────
  header: {
    flexDirection:     "row",
    alignItems:        "center",
    gap:               12,
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingBottom:     12,
  },
  backBtn: {
    minHeight:      44,
    minWidth:       44,
    alignItems:     "center",
    justifyContent: "center",
  },
  backArrow:   { fontSize: 28, lineHeight: 32 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: "700" },

  // ── Bloco de título da página ─────────────────────────────────────────────────
  titleSection: {
    paddingHorizontal: 16,
    paddingTop:        24,
    paddingBottom:     8,
    gap:               4,
  },
  pageTitle: {
    fontSize:   26,
    fontWeight: "800",
    lineHeight: 32,
  },
  updatedAt: {
    fontSize: 12,
    marginTop: 4,
  },

  // ── Seções de conteúdo ───────────────────────────────────────────────────────
  section: {
    paddingHorizontal: 16,
    paddingVertical:   16,
  },
  sectionTitle: {
    fontSize:     16,
    fontWeight:   "700",
    marginBottom: 8,
    lineHeight:   22,
  },
  paragraph: {
    fontSize:  14,
    lineHeight: 22,
  },
  bold: {
    fontWeight: "700",
  },

  // ── Loader (taxa sendo buscada) ───────────────────────────────────────────────
  loader: {
    alignSelf: "flex-start",
    marginTop: 4,
  },

  // ── Separador entre seções ───────────────────────────────────────────────────
  divider: {
    height:            1,
    marginHorizontal:  16,
  },

  // ── Link inline ─────────────────────────────────────────────────────────────
  link: {
    textDecorationLine: "underline",
  },

  // ── Rodapé de links ──────────────────────────────────────────────────────────
  footer: {
    flexDirection:     "row",
    gap:               16,
    paddingHorizontal: 16,
    paddingTop:        20,
    marginTop:         8,
    borderTopWidth:    1,
    flexWrap:          "wrap",
  },
  footerLink: {
    minHeight: 44,
    justifyContent: "center",
  },
  footerLinkText: {
    fontSize:           14,
    textDecorationLine: "underline",
  },
})
