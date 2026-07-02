# Hipoteses de Falha do Gradle — Build Android ShareO

**Contexto:** Build EAS `preview` falhou em 2026-06-03 com "Gradle build failed with unknown error".
**Investigacao:** Analise estatica da configuracao (sem acesso aos logs do servidor Expo).

---

## Hipoteses ordenadas por probabilidade

### H1 — ALTA: `react-native-css-interop` nao instalada (NativeWind 4.x)

**Probabilidade: Alta**

**O que foi encontrado:**
- `nativewind@4.2.4` esta instalado e declarado no `package.json`.
- NativeWind 4.x tem como dependencia obrigatoria `react-native-css-interop@0.2.4`.
- Ao listar `apps/mobile/node_modules/`, o pacote `react-native-css-interop` **nao existe**.
- O pacote `nativewind` usa internamente `react-native-css-interop` para injetar estilos na nova arquitetura.

**Sintoma esperado:**
Gradle falha ao tentar compilar os bindings nativos do `react-native-css-interop`, que e importado pelo NativeWind mas nao esta listado como dependencia direta do projeto, podendo ter sido omitido pelo gerenciador de pacotes.

**Correcao:**
Adicionar `react-native-css-interop` explicitamente como dependencia direta:

```bash
cd apps/mobile
npx expo install react-native-css-interop
```

Versao esperada: `0.2.4` (a que o NativeWind 4.2.4 declara).

---

### H2 — ALTA: Nova Arquitetura (`newArchEnabled: true`) com modulos incompativeis

**Probabilidade: Alta**

**O que foi encontrado:**
- `app.json` tem `"newArchEnabled": true` — ativa a Nova Arquitetura (Fabric + TurboModules) do React Native.
- Modulos verificados e a presenca de `codegenConfig` (requisito para Nova Arquitetura):

| Modulo | Versao | codegenConfig | Compativel com Nova Arch |
|---|---|---|---|
| `react-native-gesture-handler` | 2.28.0 | Sim | Sim |
| `react-native-screens` | 4.16.0 | Sim | Sim |
| `react-native-reanimated` | 3.16.7 | Sim | Sim |
| `@react-native-community/datetimepicker` | 9.1.0 | Sim | Sim |
| `expo-notifications` | 0.32.17 | Nao | Requer verificacao |
| `expo-location` | 19.0.8 | Nao | Requer verificacao |
| `expo-camera` | 17.0.10 | Nao | Requer verificacao |
| `expo-secure-store` | 15.0.8 | Nao | Requer verificacao |

Os modulos Expo (expo-*) usam o sistema `expo-modules-core` que tem sua propria camada de compatibilidade com a Nova Arquitetura, nao o `codegenConfig` padrao. As versoes pinadas (`~17.0.10`, `~19.0.8`, etc.) sao as versoes suportadas pelo SDK 54 e devem ser compativeis.

**Risco:** Se o Expo SDK 54.0.34 tiver algum bug de compatibilidade com `newArchEnabled: true` + alguma combinacao desses modulos, o build falharia.

**Mitigacao temporaria (se H1 nao resolver):**
Desabilitar temporariamente a Nova Arquitetura para isolar o problema:

```json
// apps/mobile/app.json
{
  "expo": {
    "newArchEnabled": false
  }
}
```

Reabilitar assim que o problema for identificado e resolvido.

---

### H3 — MEDIA: `expo-notifications` exige Firebase (google-services.json) que nao existe

**Probabilidade: Media**

**O que foi encontrado:**
- `expo-notifications@0.32.17` inclui `firebase-messaging:24.0.1` como dependencia Android.
- O arquivo `apps/mobile/google-services.json` **nao existe** no projeto.
- O FCM (Firebase Cloud Messaging) e necessario para push notifications em Android.

**Comportamento esperado:**
O plugin do `expo-notifications` pode gerar um projeto Android que tenta incluir o plugin Google Services no Gradle, mas falha por ausencia do `google-services.json`.

**Importante:** O EAS Build pode lidar com isso graciosamente se o `google-services.json` for configurado no painel Expo como asset de build, ou se o plugin de notificacoes for configurado para funcionar sem FCM (apenas notificacoes locais). Verificar nos logs do EAS se ha erro relacionado a `google-services`.

**Correcao:**
Opção A — Configurar FCM (push notifications completas):
1. Criar projeto no Firebase Console.
2. Adicionar app Android com package `com.shareo.app`.
3. Baixar `google-services.json` e colocar em `apps/mobile/`.
4. No painel EAS: Credentials > Android > adicionar `google-services.json`.

Opcao B — Simplificar para MVP (notificacoes locais apenas):
```json
// apps/mobile/app.json — remover o plugin de notifications por ora
// (comentado abaixo — SOMENTE se H1+H2 nao resolverem)
```

---

### H4 — MEDIA: Versao do Node incompativel com o ambiente EAS

**Probabilidade: Media-baixa**

**O que foi encontrado:**
- `eas.json` especifica `"node": "22.13.0"` em todos os perfis.
- EAS CLI `">= 16.0.0"`.
- O Expo SDK 54 e totalmente suportado com Node 22.x.

**Risco:** Node 22.13.0 e uma versao especifica — se o servidor EAS nao tiver exatamente essa versao disponivel no momento do build (2026-06-03), pode ter usado um fallback. Improvavel ser a causa raiz, mas vale verificar nos logs.

**Verificacao:** Nos logs do EAS (expo.dev > projeto > builds > build especifico), procurar pela linha `node --version` no inicio do build.

---

### H5 — BAIXA: Versao do `pnpm` ou lockfile incompativel no ambiente EAS

**Probabilidade: Baixa**

**O que foi encontrado:**
- O projeto usa `pnpm` como gerenciador de pacotes (rootdir usa `pnpm-lock.yaml`).
- O `apps/mobile/` e um subworkspace do monorepo.
- O EAS Build instala dependencias com `npm` por padrao, a nao ser que configurado de outra forma.

**Risco:** Se o EAS Build tentar usar o lockfile do pnpm mas instalar com npm, pode haver incompatibilidades de resolucao de dependencias (como a ausencia do `react-native-css-interop` descrita em H1).

**Verificacao:** O EAS CLI detecta automaticamente o gerenciador de pacotes pelo `pnpm-lock.yaml` na pasta do app. Verificar nos logs se usou `pnpm install` ou `npm install`.

---

### H6 — BAIXA: `babel.config.js` com `jsxImportSource: "nativewind"` incompativel

**Probabilidade: Baixa**

**O que foi encontrado:**
```js
// apps/mobile/babel.config.js (atual)
presets: [
  ["babel-preset-expo", { jsxImportSource: "nativewind" }],
]
```

O NativeWind 4.x recomenda essa configuracao para JSX automatico. Esta correto. Se a versao do `nativewind` instalada nao for compativel com o SDK 54, pode haver erros de transpilacao durante o bundle que Gradle reporta como erro generico.

---

## Plano de correcao recomendado

**Passo 1 — Corrigir H1 (dependencia faltante):**

```bash
cd apps/mobile
npx expo install react-native-css-interop
# Isso instala a versao correta compativel com o SDK 54
```

Verificar se `react-native-css-interop` apareceu no `node_modules` e no `package.json`.

**Passo 2 — Verificar TypeScript sem erros:**

```bash
cd apps/mobile
npx tsc --noEmit
```

**Passo 3 — Disparar novo build EAS e analisar logs:**

```bash
eas build --platform android --profile preview
```

Nos logs do EAS (expo.dev), procurar especificamente pela fase "Run gradlew" e pelo erro exato.
Se o erro persistir, identificar qual dos modulos em H2-H6 esta causando a falha.

**Passo 4 — Se necessario, testar com `newArchEnabled: false` (H2):**

Desabilitar temporariamente a Nova Arquitetura no `app.json` para isolar se o problema e de compatibilidade de modulos nativos.

---

## Notas adicionais de configuracao

### `eas.json` — configuracao atual (ja correta)

```json
{
  "cli": {
    "version": ">= 16.0.0",
    "appVersionSource": "remote"
  },
  "build": {
    "preview": {
      "android": { "buildType": "apk" },
      "distribution": "internal",
      "node": "22.13.0"
    },
    "production": {
      "android": { "buildType": "app-bundle" },
      "node": "22.13.0"
    }
  }
}
```

- `appVersionSource: remote` — versao gerenciada pelo EAS (evita conflito de `versionCode`).
- `buildType: apk` no preview — APK para instalacao direta sem Play Store.
- `buildType: app-bundle` no production — AAB obrigatorio para Play Store.

### `app.json` — verificacoes

- Package Android: `com.shareo.app` — correto.
- Scheme deep-link: `shareo` — necessario para retorno do checkout Mercado Pago.
- Permissoes Android declaradas: `CAMERA`, `ACCESS_COARSE_LOCATION`, `ACCESS_FINE_LOCATION` — corretas para as funcionalidades do app.
- `RECORD_AUDIO` declarado: necessario pelo plugin `expo-camera`; justificar no formulario Data Safety da Play.

---

*Documento de analise — Fase 1 da meta `docs/meta-app-android-build.md`.*
