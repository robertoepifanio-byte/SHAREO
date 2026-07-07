# Build Android — ShareO Mobile

**App:** `apps/mobile/` — Expo SDK 54 + React Native 0.81
**Plataforma-alvo:** Android (iOS reservado para fase posterior)
**Formato de build:** APK para testes internos (`preview`), AAB para Play Store (`production`)

---

## 1. Pre-requisitos (uma vez por maquina)

### 1.1 Conta e CLI

| Requisito | Instrucao |
|---|---|
| Conta Expo (expo.dev) | Criar em https://expo.dev — associar ao projeto `shareo` (projectId `77b68688-0ceb-486f-8af7-a54ca55dbfb2`) |
| EAS CLI | `npm install -g eas-cli` (versao >= 16.0.0) |
| Login Expo | `eas login` — usar as credenciais dos fundadores |
| Node.js | >= 22.13.0 (conforme `eas.json`) |

### 1.2 Verificar o login

```bash
eas whoami
# Deve retornar o e-mail da conta Expo dos fundadores
```

---

## 2. Variaveis de ambiente no painel EAS

As variaveis abaixo devem ser configuradas em **expo.dev > projeto shareo > Environment Variables**, separadas por perfil:

| Variavel | Perfil `preview` (staging) | Perfil `production` |
|---|---|---|
| `EXPO_PUBLIC_API_URL` | `https://staging.shareo.com.br` | `https://shareo.com.br` (apos go-live) |
| `EXPO_PUBLIC_MP_PUBLIC_KEY` | Chave publica Mercado Pago sandbox | Chave publica Mercado Pago producao |
| `EXPO_PUBLIC_APP_NAME` | `ShareO (Staging)` | `ShareO` |

**Como configurar via CLI:**
```bash
eas env:create --scope project --name EXPO_PUBLIC_API_URL \
  --value "https://staging.shareo.com.br" \
  --visibility public \
  --environment preview
```

Ou via interface: expo.dev > projeto > Environment Variables > Create.

> Variaveis `EXPO_PUBLIC_*` sao embutidas no JavaScript da build (equivalente ao `NEXT_PUBLIC_*` do Next.js). Nunca colocar segredos nelas.

---

## 3. Disparar o build (APK para testes — perfil `preview`)

```bash
cd apps/mobile

# Build APK para instalacao direta em Android
eas build --platform android --profile preview
```

O EAS CLI ira:
1. Fazer upload do codigo-fonte para os servidores Expo.
2. Instalar dependencias e rodar o Gradle no servidor.
3. Assinar o APK com o keystore gerenciado pelo Expo.
4. Disponibilizar o link de download no terminal e em expo.dev.

**Tempo esperado:** 15-25 minutos (fila + build).

---

## 4. Instalar o APK num dispositivo Android

1. No Android: **Configuracoes > Seguranca** — habilitar "Fontes desconhecidas" (ou "Instalar aplicativos de fontes desconhecidas" no Android 8+).
2. Abrir o link de download gerado pelo EAS no navegador do dispositivo.
3. Baixar e instalar o `.apk`.
4. Abrir o app **ShareO** e fazer login com uma conta de teste do staging.

**Contas de teste disponiveis no staging:**
- `teste_pf_01@demo.shareo.com.br` / `Teste@2026`
- `admin@shareo.com.br` / `Admin@shareo2026`

---

## 5. Build de producao (AAB para Play Store — perfil `production`)

```bash
cd apps/mobile

# Build AAB (Android App Bundle) — formato obrigatorio pela Play Store
eas build --platform android --profile production
```

> **Gated D4:** nao usar o AAB de producao antes do sinal verde juridico.
> O perfil `production` aponta para `https://shareo.com.br` (dominio que so existe apos go-live).

---

## 6. Submeter para a Play Store

Apos o build de producao bem-sucedido:

```bash
# Submissao automatica (requer credenciais de servico do Google Play configuradas no EAS)
eas submit --platform android --latest
```

Ou manualmente: baixar o `.aab` em expo.dev e fazer upload no Google Play Console em
**Versoes > Testes internos > Criar nova versao**.

---

## 7. Caminho completo ate a Play Store

```
eas build --profile preview
  → APK → instalar em Android → validar fluxos de navegacao/login
      ↓  (apos D4 + Fase 2 completa — checkout MP funcionando)
eas build --profile production
  → AAB → Google Play Console → faixa de testes internos
      ↓  (apos validacao com testers internos)
      → faixa de testes fechados → aberta → producao
```

---

## 8. Keystore (assinatura do app)

O Expo gerencia o keystore automaticamente no EAS Build:
- A chave de assinatura fica nos servidores do Expo (nao precisa gerenciar localmente).
- O fingerprint SHA-1/SHA-256 fica disponivel em expo.dev > Credentials.
- **Nao perder o acesso a conta Expo** — sem o keystore nao e possivel publicar atualizacoes do mesmo app na Play Store.

Para fazer backup do keystore:
```bash
eas credentials --platform android
# Escolher a opcao: "Download existing keystore"
```

---

## 9. Resolucao de problemas

Ver `docs/mobile/mobile-build-android-hipoteses-gradle.md` para analise completa das hipoteses de falha do Gradle.

**Checklist antes de disparar o build:**

- [ ] `eas whoami` retorna a conta correta dos fundadores
- [ ] `EXPO_PUBLIC_API_URL` configurada no painel EAS para o perfil correto
- [ ] `npx tsc --noEmit` (dentro de `apps/mobile/`) sem erros
- [ ] Assets presentes: `assets/icon.png`, `assets/adaptive-icon.png`, `assets/splash.png`, `assets/notification-icon.png`
- [ ] `eas.json` tem `"appVersionSource": "remote"` (evita conflito de versao)
- [ ] Dependencia `react-native-css-interop` instalada (correcao documentada em `mobile-build-android-hipoteses-gradle.md`)

---

*Fase 1 do plano `docs/planos/meta-app-android-build.md`. O disparo do build e externo — requer acesso a conta Expo dos fundadores.*
