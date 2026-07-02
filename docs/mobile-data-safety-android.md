# Data Safety — Play Store (ShareO Android)

**Documento:** Mapa de permissoes e dados coletados pelo app ShareO para preenchimento
do formulario "Data Safety" da Google Play.
**Destinatario:** Product Owner (preenche o formulario no Google Play Console).
**Referencia de config:** `apps/mobile/app.json`

---

## 1. Permissoes declaradas no app

### Permissoes Android (`app.json` > `android.permissions`)

| Permissao | Para que e usada | Necessaria sem app aberto? |
|---|---|---|
| `android.permission.CAMERA` | Fotos de check-in/checkout de locacoes (estado do item na entrega e devolucao) | Nao |
| `android.permission.RECORD_AUDIO` | Declarada pelo plugin `expo-camera`; o app nao grava audio intencionalmente — avaliar remocao se o plugin permitir | Nao |
| `android.permission.ACCESS_COARSE_LOCATION` | Busca de itens por proximidade (localizacao aproximada da cidade) | Nao |
| `android.permission.ACCESS_FINE_LOCATION` | Localizacao precisa para exibir itens por distancia (metros/km) | Nao |

### Permissoes implicitas (via plugins Expo)

| Plugin | Permissao implicita | Contexto |
|---|---|---|
| `expo-image-picker` | Acesso a galeria de fotos (`READ_MEDIA_IMAGES`) | Upload de fotos do item (locadores) e perfil |
| `expo-notifications` | `POST_NOTIFICATIONS` (Android 13+) | Notificacoes push de status de reservas |

---

## 2. Dados coletados — mapa para formulario Data Safety

### 2.1 Dados pessoais coletados

| Categoria (Play Store) | Dado especifico | Para que e usado | Compartilhado com terceiros? |
|---|---|---|---|
| **Informacoes pessoais** > Nome | Nome completo | Identificacao na plataforma, exibido em perfis publicos | Nao |
| **Informacoes pessoais** > Endereco de e-mail | E-mail | Autenticacao, notificacoes transacionais | Nao (Resend processa envio — incluir como "provedor de servico") |
| **Informacoes pessoais** > Numero de telefone | Celular | Verificacao de identidade (OTP via SMS) | Nao (Zenvia processa SMS) |
| **Informacoes pessoais** > Numero de CPF | CPF | Verificacao de identidade e conformidade legal | Nao |
| **Informacoes pessoais** > Endereco fisico | Rua, numero, bairro, cidade, estado, CEP | Enderecos dos anuncios; perfil do usuario | Nao |
| **Informacoes financeiras** | Sem dados de pagamento no app | Pagamento via WebView do Mercado Pago (externo ao app) | Mercado Pago (PSP) |
| **Fotos e videos** | Fotos de itens, fotos de check-in/checkout | Documentar estado dos itens nas locacoes | Armazenadas no Supabase Storage |
| **Localizacao** > Localizacao aproximada | Latitude/longitude (bairro/cidade) | Busca de itens por proximidade | Nao |
| **Localizacao** > Localizacao precisa | Latitude/longitude precisos | Calcular distancia exata de itens | Nao |
| **Atividade no app** | Itens visualizados, reservas criadas, avaliacoes | Funcionalidade principal da plataforma | Nao |
| **IDs de dispositivo** | Expo Push Token | Envio de notificacoes push | Expo (para entrega de notificacoes) |

### 2.2 Dados que NAO sao coletados

- Dados de contatos (agenda do telefone).
- Historico de navegacao fora do app.
- Audio ou video (apesar de `RECORD_AUDIO` ser declarado — avaliar remocao).
- Dados de saude ou biometria (KYC biometrico e fase futura, nao implementado no MVP).
- Informacoes de pagamento (cartao, dados bancarios) — o app abre o checkout do Mercado Pago em WebView; os dados de pagamento ficam no ambiente do Mercado Pago.

---

## 3. Respostas sugeridas para o formulario Data Safety

### "O app coleta dados dos usuarios?"
Sim.

### "Todos os dados coletados sao criptografados durante a transmissao?"
Sim — toda comunicacao usa HTTPS/TLS. Dados em repouso no banco de dados sao gerenciados pelo Supabase (PostgreSQL na AWS sa-east-1).

### "Os usuarios podem solicitar exclusao dos dados?"
Sim — conforme LGPD; o site oferece formulario de exclusao de conta e dados (`/conta/excluir` quando implementado; endpoint `DELETE /api/users/me` existe no backend).

### Categorias de dados a declarar no formulario

**Marcar como coletados e processados pelo app:**

| Categoria Play Store | Subcategoria | Coletado | Compartilhado |
|---|---|---|---|
| Location | Approximate location | Sim | Nao |
| Location | Precise location | Sim | Nao |
| Personal info | Name | Sim | Nao |
| Personal info | Email address | Sim | Nao |
| Personal info | Phone number | Sim | Nao |
| Personal info | User IDs | Sim (ID interno) | Nao |
| Personal info | Address | Sim | Nao |
| Photos and videos | Photos | Sim | Nao |
| App activity | App interactions | Sim | Nao |
| App activity | In-app search history | Sim | Nao |
| Device or other IDs | Device or other IDs | Sim (push token) | Com Expo (servico de push) |

**Proposito dos dados:**
- Funcionalidade do app (a categoria principal para todos os dados acima).
- Prevencao de fraude/seguranca (CPF, verificacao de celular).
- Comunicacoes do desenvolvedor (e-mail, notificacoes push).

---

## 4. Justificativa de permissoes sensiveis

A Play Store pode exigir justificativa para permissoes de localizacao e camera.

**Localizacao:**
> O ShareO usa a localizacao do dispositivo para mostrar itens disponiveis para aluguel proximos ao usuario. A localizacao e usada apenas enquanto o app esta aberto e nao e armazenada de forma continua.

**Camera:**
> A camera e usada para registrar o estado fisico dos itens no momento da entrega (check-in) e devolucao (check-out), protegendo tanto o locador quanto o locatario em caso de disputas.

**Galeria de fotos:**
> O acesso a galeria permite que locadores adicionem fotos dos seus itens nos anuncios e que usuarios atualizem sua foto de perfil.

---

## 5. Pendencias antes de publicar na Play Store

- [ ] **Politica de Privacidade publica** — URL obrigatoria no listing. Depende do D4 (publicar `/privacidade` revisada com clausulas do Mercado Pago). Hoje a pagina existe em staging mas nao em producao.
- [ ] **Avaliar `RECORD_AUDIO`** — verificar se o plugin `expo-camera` permite remover essa permissao. Se nao for necessario para fotos, remover do `app.json` evita justificativa adicional na Play.
- [ ] **Firebase/FCM** — configurar `google-services.json` para habilitar notificacoes push (ver `mobile-build-android-hipoteses-gradle.md`, H3). Necessario para o Expo Push Token funcionar no Android 8+.
- [ ] **Prazo de retencao de dados** — definir com o time juridico antes de preencher o formulario Data Safety (LGPD exige prazo definido).
- [ ] **Classificacao de conteudo IARC** — preencher o questionario de classificacao etaria no Play Console. O ShareO e uma plataforma de aluguel geral — classificacao esperada: **Livre** (sem conteudo adulto, violencia ou jogos de azar).

---

*Documento: Fase 1 da meta `docs/meta-app-android-build.md`. Preenchimento efetivo do formulario Data Safety e responsabilidade do Product Owner no Google Play Console.*
