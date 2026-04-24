# Frontend/PWA opzet — plan

## Context
`feature/setup` levert Payload 3.84 + Next 16 + React 19 + Tailwind 4 + Serwist + Gemini-vision. De backend is er (collections, access-control via `CODE_REVIEW_PLAN.md`), maar de frontend is leeg: alleen een home-pagina met een link naar `/admin`. De [screenshot](./) van de inspiratie-app is richtinggevend voor sfeer en IA, niet voor style 1:1. Doel van dit plan: een mobile-first PWA opbouwen met **FSD-architectuur** en **Tailwind 4**, in kleine PR's.

---

## Uitgangspunten

- **Mobile-first, app-feel**: bottom nav, safe-area-insets, grote touch targets, afgeronde cards, zacht oranje als primary (eigen vormentaal — niet 1:1 de screenshot). dit zijn de overige primary kleuren #4fc3e8; #7ac74f; #f5d547; #ec8a2e; #d93a2c;
- **Stack**: Tailwind 4, RHF + zod (forms), **Redux Toolkit** (client-UI-state), **@tanstack/react-query** (server-state), date-fns, lucide-react, Serwist (PWA). Geen zustand (verwijderen uit `package.json`). Charts: `recharts` toevoegen (check op React 19; anders `visx`).
- **FSD-discipline**: alleen naar beneden importeren (`app → pages → widgets → features → entities → shared`). Geen cross-imports op gelijk niveau; elke slice krijgt een `index.ts` als public API.
- **Data**:
  - Read (server) via `shared/lib/payload.ts` (local API, `overrideAccess: false`) → server components in `pages/*`.
  - Write (client) via `shared/lib/api.ts` wrapper om Payload REST (`credentials: 'include'`), met react-query mutations in `features/*/api/`.
  - Client-UI-state (wizard-step, sheet-open, filters) via RTK-slice (`features/*/model/slice.ts`).
- **Nederlands als default**. Datums via date-fns met `nl` locale.
- **`/admin` blijft ongewijzigd** — dat is Payload's eigen UI.

---

## Doel-routes (`src/app/(frontend)/`)

- `/login`, `/register`
- `/` — dashboard (today overview, recent meals, weekly trend)
- `/meals` — geschiedenis
- `/meals/[id]` — meal-detail (results: macros donut/bar + items)
- `/add-meal?mode=photo|manual`
- `/profile`
- `/~offline` — Serwist offline fallback

Alle frontend-routes achter een server-guard die `payload.auth({ headers })` doet en redirect naar `/login` bij geen user.

---

## FSD-indeling (concreet)

### `shared/`
- **`ui/`** primitives met `class-variance-authority` + `cn` helper:
  `Button`, `IconButton`, `Card`, `Input`, `Label`, `Textarea`, `Select`,
  `Sheet` (bottom-sheet + side-drawer), `Dialog`, `Tabs`, `Badge`, `Avatar`,
  `ProgressRing`, `Skeleton`, `Toast`, `EmptyState`.
- **`lib/`**: `cn.ts`, `format.ts` (NL datum/kcal/macro), `api.ts` (fetch-wrapper), bestaand `payload.ts`.
- **`config/`**: design-tokens export (kleuren/radius/spacing) synchroon met Tailwind theme.
- **`store/`**: RTK `store.ts` + `rootReducer.ts`, `hooks.ts` (`useAppDispatch`, `useAppSelector`).
- **`api/`**: bestaand `gemini.ts`, `openFoodFacts.ts`.

### `entities/`
- **`meal/`**: `model/` bestaat al (`sumMealItems`, `MEAL_TYPE_LABELS`). Toevoegen:
  - `ui/MealCard.tsx` — compact kaartje (tijd, type, kcal, macro-mini).
  - `ui/MealMacroRow.tsx` — ✓ icon + label + waarde.
  - `ui/MealDonut.tsx` — macros-verdeling donut.
  - `ui/MealTypeBadge.tsx`.
- **`day-log/`**: `ui/DayCaloriesRing.tsx` (kcal vs goal), `ui/DayLogCard.tsx`.
- **`user/`**: `model/calculations.ts` (bestaat), `ui/UserAvatar.tsx`, `ui/GoalProgress.tsx`.
- **`food/`**: `ui/FoodSearchItem.tsx`.

### `features/`
- **`auth/`**: `api/useCurrentUser`, `api/useLogin`, `api/useRegister`, `api/useLogout`; `ui/LoginForm`, `ui/RegisterForm`, `ui/LogoutButton`; `model/slice.ts` (alleen UI flags, geen user-data — die zit in react-query cache).
- **`add-meal-photo/`**: `ui/PhotoCapture`, `ui/AnalyzeStep`, `ui/ReviewStep`; `api/useAnalyzePhoto`, `api/useSaveMeal`; `model/slice.ts` (wizard-step, opgevangen analyse).
- **`add-meal-manual/`**: `ui/ManualMealForm`, `ui/FoodSearch`; `api/useSearchFoods`, `api/useSaveMeal`; `model/slice.ts` (draft items).
- **`delete-meal/`**: `ui/DeleteMealButton` + confirm dialog; `api/useDeleteMeal`.
- **`update-profile/`**: `ui/ProfileForm`; `api/useUpdateProfile`.
- **`set-daily-goal/`**: `ui/GoalForm`; `api/useUpdateGoal`.
- Bestaande `analyze-photo/` blijft (server-side helper voor API-route).

### `widgets/`
- **`app-shell/`**: `AppHeader` (back/menu/title/action), `BottomNav` (Home/Meals/+/Profile), `SideNav` (md+). Plus-knop opent `AddMealSheet` met keuze foto/handmatig.
- **`today-overview/`**: grote `DayCaloriesRing` + macro-mini-stats + "resterend"-hint op basis van `dailyCalorieGoal` (fallback `calculateTDEE`).
- **`recent-meals/`**: horizontale scroll met `MealCard`.
- **`weekly-trend/`**: line chart som-kcal per `DayLog`, laatste 7 dagen.
- **`pwa/`**: `ServiceWorkerRegister`, `InstallPrompt`.

### `pages/` (FSD page-layer, route-composities)
`dashboard`, `meals-list`, `meal-detail`, `add-meal`, `login`, `register`, `profile`. Elke page importeert alleen `widgets` + layout-plakwerk.

### `app/(frontend)/`
- `layout.tsx` mount `<Providers>` (Redux + QueryClient), `<ServiceWorkerRegister>`, `<BottomNav>` (buiten auth-routes).
- `providers.tsx` (client component): `<Provider store>` + `<QueryClientProvider>` + devtools in dev.
- Server-guard helper `requireUser()` in `shared/lib/auth-guard.ts` die in server-pages boven aan wordt aangeroepen.

---

## Design tokens (Tailwind 4)

In `globals.css` via `@theme inline`:

- `--color-primary-{50..900}`
- `--color-surface`, `--color-surface-muted`, `--color-ink`, `--color-ink-muted`, `--color-danger`
- `--radius-card` = `1rem`, `--radius-pill` = `9999px`
- `--shadow-card` zachte schaduw (bv. `0 1px 2px rgb(0 0 0 / 0.04), 0 4px 12px rgb(0 0 0 / 0.06)`)
- Dark-mode tokens dummy (niet enabled in v1).
- **Fix Arial-body** (review-plan issue #12) meteen in PR A.

---

## Store-layout (Redux Toolkit)

`src/shared/store/store.ts`:
```ts
export const store = configureStore({
  reducer: {
    auth: authReducer,
    addMealPhoto: addMealPhotoReducer,
    addMealManual: addMealManualReducer,
    ui: uiReducer, // global bottom-sheet, toast queue
  },
});
```
Slices wonen in hun feature (`features/<name>/model/slice.ts`), niet in `shared/store/`. Shared `store.ts` combineert ze. Server-state gaat NOOIT in Redux — altijd react-query.

---

## Uitvoering — kleine PR's

1. **PR A — Foundations**
   `pnpm add @reduxjs/toolkit react-redux recharts class-variance-authority` + `pnpm remove zustand`.
   - Design-tokens in `globals.css` + Arial-fix.
   - `shared/ui/*` primitives (Button/Card/Input/Sheet/Dialog/…).
   - `shared/lib/cn.ts`, `shared/lib/format.ts`, `shared/lib/api.ts`.
   - `shared/store/` + `providers.tsx` (Redux + QueryClient).

2. **PR B — App-shell + PWA register**
   - `widgets/app-shell/*` (AppHeader, BottomNav, SideNav, AddMealSheet).
   - `widgets/pwa/ServiceWorkerRegister` gemount in root layout (review #7).
   - Iconen-script `scripts/gen-icons.ts` → `public/icons/icon-192.png`/`icon-512.png`/`apple-touch`.
   - `~offline/page.tsx` fallback.

3. **PR C — Auth**
   - `features/auth/*` (login, register, logout, useCurrentUser).
   - `/login`, `/register`.
   - `shared/lib/auth-guard.ts` (`requireUser()`), toegepast in alle andere pages.

4. **PR D — Dashboard + entities/meal ui**
   - `entities/meal/ui/*` (MealCard, MealMacroRow, MealDonut, MealTypeBadge).
   - `entities/day-log/ui/*` (DayCaloriesRing, DayLogCard).
   - `widgets/today-overview`, `widgets/recent-meals`, `widgets/weekly-trend`.
   - `pages/dashboard` + `/` route.

5. **PR E — Add meal (photo)**
   - `features/add-meal-photo/*` (RTK wizard-slice, PhotoCapture/AnalyzeStep/ReviewStep).
   - `/add-meal?mode=photo`.

6. **PR F — Add meal (manual) + Foods search**
   - `features/add-meal-manual/*` + `entities/food/ui`.
   - `/add-meal?mode=manual` (zelfde route, andere wizard).

7. **PR G — Meals list & detail**
   - `pages/meals-list` + `/meals`.
   - `pages/meal-detail` + `/meals/[id]` (macros donut, items, description, delete).
   - `features/delete-meal`.

8. **PR H — Profile + goals**
   - `features/update-profile`, `features/set-daily-goal`.
   - `pages/profile` + `/profile`.

9. **PR I — PWA polish**
   - `widgets/pwa/InstallPrompt` (beforeinstallprompt listener + dismiss).
   - Manifest-shortcuts verificatie, offline-cache tuning.

---

## Verificatie (per PR, handmatig)

- Mobile Chrome DevTools (iPhone 14-profile) voor elke page.
- Lighthouse PWA-audit na PR B en PR I (installability, service-worker, offline).
- Access-control smoke na PR C–G: 2 users, user B ziet user A's meals niet in `/meals`, `/meals/:id` van A → 404, direct Payload REST POST met `user: <A>` wordt overschreven.
- `pnpm build` groen zonder `GEMINI_API_KEY` (dankzij review-fix #4).
- `pnpm lint` blijft schoon (ESLint + FSD-laag-regel volgt uit conventie, niet uit lint).

---

## Bewust niet nu

- Dark mode (tokens wel klaargezet).
- i18n/EN-vertaling (alles NL inline).
- Barcode-scanner, social login, push notifications.
- Test framework (zie `CODE_REVIEW_PLAN.md` out-of-scope).
- RTK Query — react-query blijft voor server state.

---

## Volgorde t.o.v. `CODE_REVIEW_PLAN.md`

Frontend-werk kan parallel met review-PR's, maar:
- **PR A van dit plan** mag pas merge-n nadat review-PR 1 (build-stability) binnen is.
- **PR C (auth)** heeft baat bij review-PR 2 (access-control) — liefst eerst merge.
- **PR E (photo)** bouwt op review-PR 4 (upload-validatie + resize).
