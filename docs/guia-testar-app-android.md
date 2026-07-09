# Guia — Testar o App Android (ShareO)

**Data:** 2026-07-02 · **App:** `apps/mobile/` (Expo + React Native) · **Ambiente:** staging (não é produção)

> Este guia cobre como gerar um APK de teste e instalá-lo num aparelho Android real, fora da Play Store. O app já sai do estado read-only: reserva, paga (atrás de flag), anuncia, favorita e envia verificação de identidade.

---

## 1. Pré-requisitos (uma vez só)

Instalar a CLI do EAS e autenticar com a conta Expo do projeto:

```bash
npm install -g eas-cli
eas login
```

**Conta necessária:** a conta Expo dos fundadores, já associada ao projeto `shareo` (`projectId: 77b68688-0ceb-486f-8af7-a54ca55dbfb2`).

---

## 2. Configurar a variável de ambiente no EAS

No [painel do Expo](https://expo.dev) → projeto **shareo** → **Environment Variables**, confirmar que existe:

| Variável | Valor |
|---|---|
| `EXPO_PUBLIC_API_URL` | `https://staging.shareo.com.br` |

> O código já usa esse valor como default, mas configurar explicitamente no painel evita builds apontando para o lugar errado.

---

## 3. Disparar o build

```bash
cd apps/mobile
eas build --platform android --profile preview
```

- O perfil **`preview`** gera um **APK** — instalável diretamente, sem passar pela Play Store. É o formato certo para teste.
- O build roda no servidor da Expo e leva entre 10 e 15 minutos.
- Acompanhar pelo link exibido no terminal ou em `expo.dev/accounts/shareo/projects/shareo/builds`.

---

## 4. Instalar no celular

Ao concluir, a EAS fornece um **link** (ou QR code) para baixar o `.apk` direto no Android.

1. Baixar o `.apk` pelo link/QR code (ou transferir do PC para o celular).
2. Na primeira instalação, o Android vai pedir para habilitar **"Instalar apps de fontes desconhecidas"** — autorizar nas configurações.
3. Instalar normalmente.

---

## 5. Roteiro de testes

O app deixou de ser apenas leitura nesta sessão. Roteiro sugerido, na ordem:

| # | Fluxo | O que verificar |
|---|---|---|
| 1 | **Login / cadastro** | Autenticação funciona, token persiste |
| 2 | **Navegar itens** | Lista carrega, detalhe do item abre |
| 3 | **Reservar** | Escolher datas, calcular preço, criar reserva |
| 4 | **Pagar reserva** | Botão "Pagar reserva" mostra **"pagamento indisponível"** — **isso é esperado**, não é bug (flag do Mercado Pago está OFF por design) |
| 5 | **Anunciar item** | Criar anúncio com fotos, categoria, preço |
| 6 | **Favoritos** | Favoritar/desfavoritar um item, ver lista |
| 7 | **Verificação de identidade (KYC)** | Enviar documento + selfie |
| 8 | **Chat / mensagens** | Conversar com outro usuário |

---

## 6. Se o build falhar

A hipótese mais provável de falha de Gradle (dependência `react-native-css-interop` ausente) já foi corrigida no PR #160. Se ainda assim falhar:

1. Consultar [`docs/mobile-build-android-hipoteses-gradle.md`](mobile-build-android-hipoteses-gradle.md) — lista de hipóteses e como diagnosticar cada uma.
2. Ler os logs completos em `expo.dev` → aba do build → procurar a fase **"Run gradlew"**.

---

## Referências

- [`docs/mobile-build-android.md`](mobile-build-android.md) — guia operacional completo do build
- [`docs/mobile-build-android-hipoteses-gradle.md`](mobile-build-android-hipoteses-gradle.md) — hipóteses de falha do Gradle
- [`docs/mobile-play-checklist.md`](mobile-play-checklist.md) — checklist de submissão à Play Store (fase posterior, gated D4)

---

*Guia de teste — ShareO App Android. Ambiente staging, não produção.*
