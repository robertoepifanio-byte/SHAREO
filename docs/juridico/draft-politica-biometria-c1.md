# RASCUNHO — Adendo à Política de Privacidade: biometria da selfie (C1)

> **RASCUNHO GATED — não publicar.** Insumo para a advogada/DPO revisar antes de aplicar em `app/privacidade` (a publicação da Política revisada é condição 3 de go-live e só ocorre no go-live). Base: decisão jurídica **C1** (2026-06-30) — a selfie do KYC é dado pessoal sensível de natureza biométrica (LGPD art. 11) e o tratamento se apoia em **consentimento específico e destacado** (art. 11, II, "a").

**Data:** 2026-07-01 · **Versão do consentimento vinculada:** `biometric-v1.0` (`lib/legal-config.ts` → `BIOMETRIC_CONSENT_VERSION`). Alterar o texto do consentimento (`lib/legal/biometric-consent-text.ts`) exige bump dessa versão.

---

## Onde entra

Na Política de Privacidade (`app/privacidade`), como subseção dedicada dentro de "Dados que coletamos" / "Bases legais" (ao lado da subseção 4.1 do Mercado Pago, se ambas forem publicadas juntas). Não exige novo aceite dos **Termos** (`CONSENT_VERSION`), mas o texto do consentimento da selfie é versionado à parte.

## Texto proposto (subseção)

> **Selfie de verificação de identidade (dado biométrico).** Quando você opta por verificar a sua identidade, coletamos uma **selfie** (imagem do seu rosto). Tratamos essa imagem como **dado pessoal sensível de natureza biométrica** (LGPD art. 5º, II e art. 11), **exclusivamente** para a finalidade de **verificação da sua identidade** e prevenção a fraudes. A base legal é o seu **consentimento específico e destacado** (art. 11, II, "a" da LGPD), coletado por meio de um aviso próprio, separado do aceite destes Termos e desta Política, **no momento da coleta** da selfie — cujo texto integral é exibido a você naquele momento.
>
> Sua selfie fica armazenada em área privada e criptografada (região Brasil) e é acessível apenas ao servidor e a analistas autorizados da equipe de verificação; **nunca** é publicada no seu perfil, em anúncios ou a outros usuários, nem usada para marketing, reconhecimento facial em outras situações ou treinamento de modelos de inteligência artificial.
>
> Você pode **revogar** esse consentimento a qualquer momento, sem justificar, em **Meu Perfil → Documentos** ou pelo canal do Encarregado de Dados (**privacidade@shareo.com.br**); ao revogar, a imagem é apagada. Mantemos por até **5 anos** apenas o **registro de que você consentiu** (data, hora, versão do texto e IP), sem a imagem, como prova de cumprimento legal. Consulte a seção **Direitos do Titular** para os demais direitos.

## Notas para a advogada/DPO

- O texto **integral** do consentimento exibido na coleta está em `lib/legal/biometric-consent-text.ts` (11 parágrafos) — este adendo da Política é o **resumo** que remete a ele.
- A afirmação de retenção da **prova por 5 anos** (versão/hash/IP, sem a imagem) precisa bater com o RIPD (ver [`redline-ripd-biometria-c1.md`](redline-ripd-biometria-c1.md), risco F-09) e com o comportamento do código (`DELETE /api/users/me/biometric-consent` preserva `idSelfieConsent{Version,TextHash,Ip}`).
- O caminho de revogação citado ("Meu Perfil → Documentos") deve refletir a UI (botão de revogação implementado em `_IdVerification`, exibido só com a flag `biometricConsentRequired` ON).
- **CONSULTAR:** confirmar se o resumo acima é suficiente para a Política ou se o DPO quer o texto integral também publicado.

> Gated D4. Não aplicar em `app/privacidade` antes do sign-off + go-live.
