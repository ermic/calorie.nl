# Follow-ups — post v1

Consolidatie van alle openstaande punten uit de senior-reviews van PR D t/m PR I. Gegroepeerd per categorie, met prioriteit (P0/P1/P2/P3), inschatting (S < 2u / M 2-6u / L > 6u), context, aanpak en acceptatie-criteria.

Prioriteiten:
- **P0** = vereist voorafgaand aan publieke / multi-user uitrol
- **P1** = echte bug of UX-issue, liefst binnen volgende release
- **P2** = polish, aangenaam voor eindgebruiker
- **P3** = toekomst, alleen wanneer concreet nodig

---

## Security & correctheid

### 1. `eatenAt` bounds-clamp op save
- **P1 · S**
- **Waar**: [src/app/api/meals/save/route.ts](src/app/api/meals/save/route.ts)
- **Probleem**: Zod accepteert elke ISO-datum. Een client kan `eatenAt: "2099-01-01"` submitten → DayLog voor jaar 2099. Geen cross-user leak, wel vervuilde data en mogelijk ongewenste "toekomst-maaltijden" in de lijst.
- **Aanpak**: zod-refine clamp op `[now − 30 d, now + 1 d]`. Bij overschrijding → 400 met NL-tekst. Bestaande client gebruikt altijd `new Date().toISOString()` dus geen UX-regressie.
- **Acceptatie**:
  - POST `/api/meals/save` met `eatenAt=2099-01-01T00:00:00Z` → 400.
  - POST met `eatenAt=<nu>` of ontbrekend → 200.
  - POST met `eatenAt=<1 week geleden>` → 200 (backfill toegestaan).

### 2. Atomic credit-decrement voor AI-analyse
- **P1 · M**
- **Waar**: [src/app/api/meals/analyze-photo/route.ts](src/app/api/meals/analyze-photo/route.ts)
- **Probleem**: Twee tabs kunnen samen `credits=1` lezen → beide Gemini-calls → beide decrementen naar 0. User krijgt twee analyses voor één credit.
- **Aanpak**:
  - Optie A: atomic `UPDATE users SET ai_photo_credits = ai_photo_credits − 1 WHERE id=$1 AND ai_photo_credits > 0 RETURNING ai_photo_credits` via Payload's `db` raw-query, vóór de Gemini-call. Bij 0-rijen → 429.
  - Optie B: decrementen vóór Gemini-call, bij Gemini-failure de credit terug-bumpen (moeilijker: Gemini kan in Running-state timeoute).
  - Voorkeur: **A** — accepteer dat user 1 credit kwijt is bij Gemini-error (al dempt onze 503-mapping dat).
- **Acceptatie**:
  - Simuleer 2 parallelle POSTs met `credits=1` (concurrency via `Promise.all` in test) → precies 1 returnt 200, ander 429.
  - Credits na race = 0.
  - Test: admin bypass werkt nog.

### 3. MIME-byte sniffing in photo-upload
- **P1 · S**
- **Waar**: [src/app/api/meals/analyze-photo/route.ts](src/app/api/meals/analyze-photo/route.ts)
- **Probleem**: Alleen `file.type` (browser-supplied) wordt gecontroleerd. Een attacker kan arbitrary bytes uploaden met `Content-Type: image/jpeg`. Gemini zal het gewoon weigeren, maar tussentijds buffert Next de 4 MB in memory — DoS-amplifier bij veel parallelle uploads.
- **Aanpak**:
  - Early-reject op `Content-Length` header (hard cap 4 MB) vóór `req.formData()`.
  - Na parse: sniff eerste bytes (`FF D8 FF` = JPEG, `89 50 4E 47` = PNG). Niet-matchende bytes → 400.
- **Acceptatie**:
  - Upload van `.txt` met `Content-Type: image/jpeg` → 400 "Ongeldig beeldformaat".
  - Upload van 10 MB file → 413 zonder memory te bufferen.
  - Normale JPEG/PNG → 200 zoals voorheen.

### 4. `/meals/[id]` admin-privacy
- **P2 · S** (of **P3** — mogelijk geen probleem)
- **Waar**: [src/views/meal-detail/MealDetailPage.tsx](src/views/meal-detail/MealDetailPage.tsx), [src/shared/payload/hooks.ts](src/shared/payload/hooks.ts)
- **Probleem**: Admin kan via directe URL-enumeratie (`/meals/<id>`) any user's meal-detail openen. In de UI zijn geen vindpaden — admin heeft geen indexering van andermans meal-ids — maar het werkt wel.
- **Aanpak**: Beslis expliciet:
  - Accepteren: documenteer in [CLAUDE.md](CLAUDE.md) dat admin-rol = "debug-toegang tot alle data"; laat URL-enum werken.
  - Dichten: in `MealDetailPage` een `meal.user.id === user.id`-check toevoegen ná `findByID`, onafhankelijk van access-rule. Admin ziet dan via `/admin` CMS, niet via frontend.
- **Acceptatie**: afhankelijk van keuze. Standpunt schrijven in CLAUDE.md of PrivacyPolicy.md.

---

## UX & state-sync

### 5. `router.refresh()` scope — cross-route RSC-invalidatie
- **P1 · M**
- **Waar**: [src/features/update-profile/ui/ProfileForm.tsx](src/features/update-profile/ui/ProfileForm.tsx), [src/features/set-daily-goal/ui/GoalForm.tsx](src/features/set-daily-goal/ui/GoalForm.tsx)
- **Probleem**: Na het opslaan van het calorie-doel op `/profile` blijft de dashboard-ring stale tot user actief naar `/` navigeert. `router.refresh()` is route-local in Next App Router.
- **Aanpak**:
  - Vervang de client-side `apiFetch` PATCH door een **server action** per feature:
    - `updateProfileAction(patch)` in `features/update-profile/api/actions.ts` met `'use server'` + `revalidatePath('/', 'layout')` bovenaan.
    - Idem voor `setDailyGoalAction`.
  - Client blijft `useMutation({ mutationFn: serverAction })` gebruiken — zelfde UX, maar cache voor alle server-components invalidated.
- **Acceptatie**:
  - Scenario: save goal op `/profile` → direct navigeren naar `/` via BottomNav → DayCaloriesRing toont nieuwe goal (geen F5 nodig).
  - `useCurrentUser` react-query invalidation blijft intact.
  - Access-control: server-action doet `payload.auth({ headers })` zelf → geen user-id van client trusten.

### 6. Back-button / unsaved-changes warning in wizards
- **P2 · S**
- **Waar**: [src/features/add-meal-photo/ui/AddMealPhotoFlow.tsx](src/features/add-meal-photo/ui/AddMealPhotoFlow.tsx), [src/features/add-meal-manual/ui/ManualMealForm.tsx](src/features/add-meal-manual/ui/ManualMealForm.tsx)
- **Probleem**: Browser back midden in een review-step verlaat de flow zonder waarschuwing; user verliest items.
- **Aanpak**:
  - `beforeunload`-handler registreren zodra `items.length > 0 && !save.isSuccess`.
  - Soft back binnen SPA: luisteren op `router.events` (of `popstate`) en een confirm-Dialog tonen.
  - Alternatief: bij save-success expliciet `wizardReset` → dan skip warning.
- **Acceptatie**: Review-step met items → browser back → bevestig-dialog. Annuleer laat items staan.

### 7. Empty-state CTA op /meals (gedaan) + vergelijkbare CTAs elders
- **P2 · S**
- **Waar**: [src/app/(frontend)/(app)/add-meal/page.tsx](src/app/\(frontend\)/\(app\)/add-meal/page.tsx) (als default mode 'manual' geen items heeft), [src/widgets/recent-meals/RecentMeals.tsx](src/widgets/recent-meals/RecentMeals.tsx) (EmptyState zonder actie)
- **Probleem**: RecentMeals op dashboard met 0 meals → tekstueel empty-state, geen knop. User moet de FAB ontdekken.
- **Aanpak**: Voeg `action={<Link to /add-meal>}` toe aan de EmptyState in RecentMeals.

### 8. `not-found.tsx` in `(app)` route-group
- **P2 · S**
- **Waar**: [src/app/(frontend)/(app)/](src/app/\(frontend\)/\(app\))
- **Probleem**: `/meals/999` voor een niet-eigen meal roept `notFound()` → toont Next's default 404 chrome, niet de AppShell. Verwarrend.
- **Aanpak**: `src/app/(frontend)/(app)/not-found.tsx` met `<AppHeader title="Niet gevonden">` + tekst + link naar `/meals`.
- **Acceptatie**: `/meals/999999` → AppShell layout + "Maaltijd niet gevonden" copy + "Terug naar maaltijden"-link.

### 9. iOS install-hint
- **P2 · S**
- **Waar**: [src/widgets/pwa/InstallPrompt.tsx](src/widgets/pwa/InstallPrompt.tsx)
- **Probleem**: iOS Safari vuurt geen `beforeinstallprompt`. Huidige InstallPrompt verschijnt nooit op iOS.
- **Aanpak**:
  - Detect iOS + `!navigator.standalone` → toon een vierde variant van de prompt: "Gebruik Deel → Zet op beginscherm" met een share-icoon + screenshot.
  - Zelfde 14-daagse snooze-mechaniek.
- **Acceptatie**: iOS Safari (via DevTools device-emulator of echt device) → card met hint. Chrome Android nog steeds normale prompt.

### 10. MealDonut discrepantie-uitleg
- **P3 · S**
- **Waar**: [src/entities/meal/ui/MealDonut.tsx](src/entities/meal/ui/MealDonut.tsx)
- **Probleem**: Center toont kcal-uit-macro's (`protein*4 + carbs*4 + fat*9`). Als user handmatig kcal heeft aangepast, kan dat afwijken van wat onder op de card staat ("Totaal 520 kcal" vs donut-center "490 kcal").
- **Aanpak**: Tooltip op donut — "Berekend uit macro's (Atwater-factoren)". Low-priority: geen echte bug, meer transparantie.

---

## Performance

### 11. Transactional meal-save + parallelle item-create
- **P1 · M**
- **Waar**: [src/app/api/meals/save/route.ts](src/app/api/meals/save/route.ts)
- **Probleem**: Items worden sequentieel aangemaakt (10 items = 10 round-trips + 10 `verifyMealBelongsToUser`-hooks met elk een `findByID`). Ruim 20 queries per save. Als item 5 faalt, persisten de eerste 4 + de meal — partial state.
- **Aanpak**:
  - Wrap in Payload-transactie: `await payload.db.beginTransaction()` → `try { create meal + Promise.all(items) } finally { commit/rollback }`.
  - `Promise.all` voor de items parallel.
- **Acceptatie**:
  - 10-item save: p95 < 500 ms (was ~1-2 s).
  - Simuleer één item met ongeldig `calories=-1` → hele save rollback, geen partial meal in DB.

### 12. AbortController-timeout in `apiFetch`
- **P1 · S**
- **Waar**: [src/shared/lib/api.ts](src/shared/lib/api.ts)
- **Probleem**: Als Gemini 30s hangt, hangt de client-fetch mee. `route.ts maxDuration=30` kapt server-side af maar de client weet van niks → spinner blijft oneindig.
- **Aanpak**:
  - `apiFetch` signature uitbreiden met `timeoutMs?: number` (default 35_000). Interne `AbortController` → fetch gets `signal`.
  - Timeout → gooi `ApiError(408, 'De server reageert niet. Probeer opnieuw.')`.
- **Acceptatie**:
  - Mock een hangende `/api/meals/analyze-photo` → client krijgt na 35s een nette error, spinner stopt.
  - `useAnalyzePhoto` en vergelijkbare mutations krijgen `ApiError` binnen in hun `onError`.

### 13. `/meals` lange-termijn paginering (buiten "Laad meer")
- **P3 · M**
- **Waar**: [src/views/meals-list/MealsList.tsx](src/views/meals-list/MealsList.tsx), [src/app/api/meals/route.ts](src/app/api/meals/route.ts)
- **Probleem**: "Laad meer" werkt per 30, maar offset-gebaseerd kan rare dingen doen bij concurrent toevoegingen (nieuwe meal tussen twee page-fetches → dubbele weergave of gat).
- **Aanpak**: cursor-based paginering met `?before=<eatenAt>&beforeId=<id>` om stable ordering te krijgen bij gelijke timestamps. Kant-en-klare libs of handmatig.
- **Acceptatie**: Tijdens "Laad meer" een nieuwe meal via /add-meal → geen dubbele of ontbrekende entries in de lijst.

---

## DX & refactor

### 14. `groupItemsByMeal` helper extract
- **P2 · S**
- **Waar**: [src/widgets/recent-meals/RecentMeals.tsx](src/widgets/recent-meals/RecentMeals.tsx), [src/widgets/weekly-trend/WeeklyTrend.tsx](src/widgets/weekly-trend/WeeklyTrend.tsx), [src/views/meals-list/fetch-meals.ts](src/views/meals-list/fetch-meals.ts)
- **Probleem**: Dezelfde reduce-op-map logica in 3 plekken.
- **Aanpak**: Functie in `src/entities/meal/lib/group-items.ts`:
  ```ts
  export function groupItemsByMeal(items: MealItem[]): Map<number, MealItem[]>
  ```
  Importeer vanuit de drie consumers.
- **Acceptatie**: Lint clean, geen gedragsverschil, drie call-sites gebruiken de helper.

### 15. `CURRENT_USER_QUERY_KEY` naar `shared/query-keys`
- **P3 · S**
- **Waar**: [src/features/auth/api/useCurrentUser.ts](src/features/auth/api/useCurrentUser.ts), [src/features/add-meal-photo/api/useSaveMeal.ts](src/features/add-meal-photo/api/useSaveMeal.ts) (etc.)
- **Probleem**: Feature-to-feature constant-import (`features/delete-meal` → `features/auth`). Tolereerbaar nu, maar groeit bij meer features.
- **Aanpak**: `src/shared/query-keys.ts` met `export const ME = ['me'] as const;`. Features importeren daarvandaan.

### 16. Duplicate `parseDecimal` / number helpers tests
- **P3 · S**
- **Waar**: [src/shared/lib/number.ts](src/shared/lib/number.ts)
- **Probleem**: Geen tests. Bij toekomstige wijzigingen (andere locales) makkelijk regressie.
- **Aanpak**: Jest/Vitest setup zit niet in de repo — dus eerst test-framework kiezen. Dan per helper een handvol cases: komma/punt/lege/negatieve/NaN.

---

## Internationalization

### 17. `User.timezone` veld voor multi-TZ support
- **P3 · L**
- **Waar**: [src/collections/Users.ts](src/collections/Users.ts), [src/widgets/today-overview/TodayOverview.tsx](src/widgets/today-overview/TodayOverview.tsx), [src/widgets/weekly-trend/WeeklyTrend.tsx](src/widgets/weekly-trend/WeeklyTrend.tsx), [src/app/api/meals/save/route.ts](src/app/api/meals/save/route.ts)
- **Probleem**: Alle dag-bucketing gebruikt server-local (Europe/Amsterdam). Een user in Los Angeles ziet "vandaag" 9u verschoven.
- **Aanpak**:
  - Voeg `timezone: string` toe aan Users collection met zod-valid IANA-tz-check in beforeValidate.
  - Registreer `Intl.DateTimeFormat().resolvedOptions().timeZone` bij register en toon in ProfileForm.
  - Vervang alle `startOfDay(new Date())` door `date-fns-tz` `zonedTimeToUtc(startOfDay(utcToZonedTime(now, tz)), tz)`.
  - Migratie voor bestaande users: default naar `Europe/Amsterdam`.
- **Acceptatie**:
  - User in NY ziet /meals van hun lokale dagen.
  - DST-transitie werkt correct (23 h / 25 h buckets).

### 18. i18n / English vertaling
- **P3 · L**
- **Waar**: alle UI-copy
- **Probleem**: Alles hardcoded NL.
- **Aanpak**: `next-intl` of `next-i18next`. Start met NL + EN namespaces. Copy-keys invoeren in een iteratie.

---

## Niet-functioneel / tooling

### 19. E2E / integratie-tests
- **P1 · L**
- **Probleem**: Geen tests. De reviews hebben edge-cases blootgelegd (komma-input, TZ-bugs, access-control) die pas in productie zichtbaar worden.
- **Aanpak**:
  - Playwright voor smoke flows: login → add-meal (beide modes) → dashboard update → delete → profile-edit.
  - Payload test-utils voor access-control unit-tests (user B kan niet user A's meal patchen).
- **Acceptatie**: CI draait tests; een regressie op access-control breekt de build.

### 20. Lighthouse PWA-audit in CI
- **P2 · M**
- **Probleem**: Handmatig checken; geen baseline.
- **Aanpak**: `@lhci/cli` in GitHub Actions workflow. Budget voor LCP < 2.5s, Performance > 80, PWA installable.

---

## Auth-roadmap (fase 1–5)

### 21. Multi-instance rate-limits via Redis
- **P1 · M** — vereist zodra de app op meer dan één worker / pod draait
- **Waar**: alle in-memory `Map<string, number[]>`-tellers in
  - [src/app/api/auth/change-password/route.ts](src/app/api/auth/change-password/route.ts) — `failedVerifies`
  - [src/app/api/auth/change-email/route.ts](src/app/api/auth/change-email/route.ts) — `failedVerifies` + `successfulStarts`
  - [src/app/api/auth/account/delete/route.ts](src/app/api/auth/account/delete/route.ts) — `failedVerifies`
  - [src/app/api/auth/verify-email/resend/route.ts](src/app/api/auth/verify-email/resend/route.ts) — `recentSends`
  - [src/app/api/auth/passkey/login/options/route.ts](src/app/api/auth/passkey/login/options/route.ts) — `recentHits`
- **Probleem**: elke worker/pod heeft een eigen Map. Een aanvaller die N workers raakt krijgt N× de limiet.
- **Aanpak**: abstracte `RateLimiter` interface (`hit(key) → ok|wait_seconds`); in-memory voor single-instance, Redis-backed voor multi-instance. Eén plek de implementatie kiezen via env.
- **Acceptatie**: bestaande tests groen + integratie-test bewijst dat tellers gedeeld worden over twee servers (mock).

### 22. Last-method-guard race tussen parallelle DELETEs
- **P2 · S**
- **Waar**: [src/app/api/auth/providers/[provider]/route.ts](src/app/api/auth/providers/\[provider\]/route.ts), [src/app/api/auth/passkey/credentials/[id]/route.ts](src/app/api/auth/passkey/credentials/\[id\]/route.ts)
- **Probleem**: twee parallelle DELETEs (één voor Google, één voor passkey) bij user met `hasPassword=false` kunnen beide door de guard glippen → user heeft 1 methode over (i.p.v. 0, geen permanent-lock), maar welke wint is non-deterministic.
- **Aanpak**: advisory lock per user-id (`pg_advisory_xact_lock`) binnen een transactie, of `SELECT ... FOR UPDATE` op de users-rij vooraf.
- **Acceptatie**: race-test stuurt twee DELETEs gelijktijdig; precies één slaagt (200), de ander krijgt 409 met last-method-melding.

### 23. Unique partial index op `(user_id, kind)` voor change-email
- **P2 · S**
- **Waar**: [src/collections/EmailVerifications.ts](src/collections/EmailVerifications.ts), [src/app/api/auth/change-email/route.ts](src/app/api/auth/change-email/route.ts)
- **Probleem**: twee parallelle change-email-aanvragen kunnen beide 2 tokens (`change-confirm` + `change-revoke`) inserten — de tweede aanvraag's tokens worden weggegooid bij de eerste confirm-click, maar zijn tot die tijd "verloren in DB".
- **Aanpak**: `CREATE UNIQUE INDEX ... ON email_verifications (user_id, kind) WHERE kind IN ('change-confirm', 'change-revoke')` + `INSERT ... ON CONFLICT (user_id, kind) DO UPDATE SET ...` in de change-email-route.
- **Acceptatie**: parallelle POSTs leveren altijd precies 1 confirm + 1 revoke per user op.

### 24. Token uit URL halen voor confirm/revoke-links
- **P3 · M**
- **Waar**: alle mail-templates ([verifyEmail.ts](src/shared/email/verifyEmail.ts), [changeEmailConfirm.ts](src/shared/email/changeEmailConfirm.ts), [changeEmailNotice.ts](src/shared/email/changeEmailNotice.ts), [resetPassword.ts](src/shared/email/resetPassword.ts))
- **Probleem**: tokens lekken via Referer-header bij doorklikken en blijven in browser-history.
- **Aanpak**: intermediate page met POST-form (token in body i.p.v. URL), of fragment-token (`#token=…`) die niet in Referer wordt meegestuurd.
- **Acceptatie**: na klik op verify-link is de token niet zichtbaar in DevTools network → Referer-header op `/login`.

### 25. GDPR-cleanup `foods.createdBy` bij user-delete
- **P3 · S** (P0 als compliance-audit nodig is)
- **Waar**: [src/app/api/auth/account/delete/route.ts](src/app/api/auth/account/delete/route.ts)
- **Probleem**: na delete blijft `foods.createdBy = NULL` staan, maar de `name` van de food kan nog herleidbare info bevatten ("Henk's chili"). Strict-GDPR: persoonsgegeven over een verwijderde user.
- **Aanpak**: in de delete-transactie ook `UPDATE foods SET name = '[Verwijderde gebruiker]', brand = NULL WHERE created_by_id = $userId` vóór de user-delete (de `SET NULL` op `created_by_id` blijft).
- **Acceptatie**: na delete bevat geen enkele `food`-rij nog herleidbare info naar de verwijderde user.

### 26. `afterDelete`-hook met expliciete cascade-collection-lijst
- **P2 · M**
- **Waar**: [src/app/api/auth/account/delete/route.ts](src/app/api/auth/account/delete/route.ts), [src/collections/Users.ts](src/collections/Users.ts)
- **Probleem**: cascade-keten in de delete-route is fragile. Als ooit een nieuwe user-eigendom-collection wordt toegevoegd (foto-uploads, recepten, …) moet die handmatig in de keten. Geen mechanisme dat dit afdwingt.
- **Aanpak**: `afterDelete`-hook op Users die een per-collection-lijst loopt; nieuwe collection toevoegen = één regel + bijbehorende test. Alternatief: lijst genereren uit collection-config (filter op relations naar `users`).
- **Acceptatie**: cascade-smoketest dekt elke collection met user-relatie + faalt automatisch wanneer een nieuwe collection geen entry heeft.

### 27. Hardcoded hook-defaults vervangen door gedeelde helper
- **P2 · S**
- **Waar**: [src/collections/Users.ts](src/collections/Users.ts) — `lockPrivilegedFieldsOnSelfWrite`, [src/shared/lib/account-linking.ts](src/shared/lib/account-linking.ts) — OAuth-create
- **Probleem**: `lockPrivilegedFieldsOnSelfWrite` zet `plan/aiPhotoCredits/creditsResetAt/role` als impliciete defaults bij anonCreate; OAuth-create leunt erop. Refactor van de hook (extra check op `req.context`) breekt OAuth-create stilzwijgend. Bovendien dwingt dit een `as any`-cast af in account-linking omdat Payload's strict types deze velden expecten.
- **Aanpak**: `defaultUserFields()` exporteren uit `Users.ts`; gebruiken in de hook én expliciet meegeven in OAuth-create. Smoketest-`as any`-casts kunnen weg.
- **Acceptatie**: account-linking compileert zonder `as any`; OAuth-create genereert dezelfde defaults als anonCreate.

### 28. `PASSKEY_LOGIN_COOKIE`-constant duplicatie
- **P3 · S**
- **Waar**: [src/app/api/auth/passkey/login/options/route.ts](src/app/api/auth/passkey/login/options/route.ts), [src/app/api/auth/passkey/login/verify/route.ts](src/app/api/auth/passkey/login/verify/route.ts)
- **Aanpak**: verplaatsen naar [src/shared/lib/webauthn.ts](src/shared/lib/webauthn.ts), beide routes importeren.

### 29. Happy-path Google OAuth e2e met `oauth2-mock-server`
- **P2 · L**
- **Waar**: [tests/e2e/auth/google-oauth.spec.ts](tests/e2e/auth/google-oauth.spec.ts) — dekt alleen error-paths.
- **Probleem**: geen end-to-end coverage voor de full code-exchange + linking-flow. Een Google-API-breaking-change wordt pas in productie zichtbaar.
- **Aanpak**: `oauth2-mock-server` op vast port + Playwright `webServer.env`-override voor `GOOGLE_CLIENT_ID`/`SECRET`/`REDIRECT_URI`. arctic's `Google` class accepteert custom URLs niet — vervang door directe `fetch` of een wrapper die de mock-URL gebruikt.
- **Acceptatie**: Playwright doet UI-flow → mock-Google → callback → ingelogd op `/`. Idem voor `intent=link` en `account_exists_login_first`.

### 30. Full register→login passkey e2e
- **P2 · L**
- **Waar**: [tests/e2e/auth/passkey.spec.ts](tests/e2e/auth/passkey.spec.ts) — dekt alleen API-routes.
- **Aanpak**: Chrome DevTools Protocol via Playwright CDP-session: `WebAuthn.enable` + `WebAuthn.addVirtualAuthenticator`. UI-flow: registreer passkey op `/profile` → logout → login via PasskeyLoginButton → ingelogd op `/`. Patroon staat in [AUTH_SPECS.md §11.2](AUTH_SPECS.md).
- **Acceptatie**: virtual authenticator overleeft register + login + delete-credential cycle.

### 31. Mail-bombing-limit feature-test (change-email)
- **P3 · M**
- **Waar**: [src/app/api/auth/change-email/route.ts](src/app/api/auth/change-email/route.ts) (`STARTS_LIMIT = 3`)
- **Probleem**: geen e2e die bewijst dat de 4e succesvolle aanvraag binnen 15 min een 429 geeft. Vereist 6 echte SMTP-mails of een SMTP-mock.
- **Aanpak**: Mailpit als test-SMTP + dedicated test-user; rate-limit-state resetbaar via een test-only endpoint (gated op `NODE_ENV !== 'production'`).
- **Acceptatie**: 4 successieve POSTs binnen 15 min → 1, 2, 3 = 200; 4 = 429.

### 32. Confirm/revoke-tokens via mail-mock
- **P2 · M** — vereist voor #29, #30 en aparte volledige e-mail-flow tests
- **Waar**: [tests/e2e/auth/change-email.spec.ts](tests/e2e/auth/change-email.spec.ts), verify-email-flow
- **Probleem**: plain tokens worden alleen in mails verstuurd, niet in API-responses; tests kunnen het confirm-pad niet doorlopen.
- **Aanpak**: test-only mail-mock (Mailpit, REST-API) die verstuurde mails vasthoudt + uitleest in test-context. Of stub `payload.sendEmail` in test-modus.
- **Acceptatie**: e2e doet register → leest verify-mail uit mock → klikt link → user is verified.

---

## Volgorde-suggestie

Als eerstvolgende release (~1 dag):
1. `eatenAt` bounds-clamp (§1)
2. Atomic credits (§2)
3. MIME sniffing (§3)
4. AbortController timeout (§12)
5. `router.refresh` → server-actions (§5)

Release daarna:
6. Transactional save (§11)
7. `not-found.tsx` (§8)
8. iOS install-hint (§9)
9. E2E-setup basis (§19)

Auth-hardening voor multi-user uitrol (P0/P1):
10. Multi-instance rate-limit via Redis (§21)
11. Last-method-guard race (§22) — zodra OAuth+passkey breed gebruikt wordt
12. Unique partial index op change-email tokens (§23)
13. Hook-defaults helper (§27) — quick win, lost ook `as any`-casts op
14. afterDelete-hook met cascade-lijst (§26) — vóór nieuwe user-eigendom-collections worden toegevoegd

Test-infrastructuur (P2):
15. Mail-mock (§32) → unlocks Google OAuth e2e (§29) + passkey e2e (§30) + change-email feature-test (§31)

Rest zodra concreet nodig.
