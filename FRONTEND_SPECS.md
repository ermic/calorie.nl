# Frontend specs

Detail-specificatie per laag — aanvullend op [FRONTEND_PLAN.md](FRONTEND_PLAN.md). Volgt dezelfde FSD-volgorde: `shared → entities → features → widgets → pages → app`. Eindigt met route-contracten, data-contracten, en open issues.

---

## 1. Design tokens

Primary = zacht oranje rond `#ec8a2e`. Aanvullende palette (uit plan): `#4fc3e8` (blauw), `#7ac74f` (groen), `#f5d547` (geel), `#ec8a2e` (oranje → dekt primary-500), `#d93a2c` (rood → dekt danger).

**`src/app/(frontend)/globals.css`** — Tailwind 4 `@theme inline`:

| Token | Waarde | Gebruik |
| --- | --- | --- |
| `--color-primary-50` | `#fff7ed` | achtergrond highlights |
| `--color-primary-100` | `#ffedd5` | chip-bg |
| `--color-primary-200` | `#fed7aa` | hover-bg subtle |
| `--color-primary-300` | `#fdba74` | — |
| `--color-primary-400` | `#fb923c` | — |
| `--color-primary-500` | `#ec8a2e` | primary accent (plan-seed) |
| `--color-primary-600` | `#d9721d` | Button bg |
| `--color-primary-700` | `#b45913` | Button hover |
| `--color-primary-800` | `#8f4616` | — |
| `--color-primary-900` | `#733817` | — |
| `--color-accent-blue` | `#4fc3e8` | secondary accent (info/water) |
| `--color-accent-green` | `#7ac74f` | success / protein-accent / lunch badge |
| `--color-accent-yellow` | `#f5d547` | warning / fat-accent / breakfast badge |
| `--color-danger` | `#d93a2c` | Delete, error, destructive |
| `--color-surface` | `#ffffff` | Card, Sheet |
| `--color-surface-muted` | `#faf7f2` | Page bg (warme off-white, past bij oranje) |
| `--color-ink` | `#1c1917` | body text |
| `--color-ink-muted` | `#78716c` | secondary text |
| `--radius-card` | `1rem` | Card, Sheet header |
| `--radius-pill` | `9999px` | Button, Badge, chips |
| `--shadow-card` | `0 1px 2px rgb(0 0 0 / .04), 0 4px 12px rgb(0 0 0 / .06)` | Card elevation |
| `--shadow-sheet` | `0 -8px 24px rgb(0 0 0 / .08)` | BottomSheet |
| `--safe-bottom` | `env(safe-area-inset-bottom)` | BottomNav padding |

`viewport.themeColor` in `layout.tsx` en `manifest.json theme_color` → `#ec8a2e` (was `#10b981`).

Body: `font-family: var(--font-geist-sans), system-ui, sans-serif;` (fixt review-plan #12).

---

## 2. `shared/ui` primitives

Elke primitive exporteert `{ Component, variants }` (CVA). Alle props typed met `VariantProps<typeof variants>`.

### `Button`
```ts
variant: 'primary' | 'secondary' | 'ghost' | 'danger'
size: 'sm' | 'md' | 'lg'
icon?: LucideIcon
iconPosition?: 'left' | 'right'
loading?: boolean // disabled + spinner
fullWidth?: boolean
```
- `primary`: `bg-primary-600 text-white hover:bg-primary-700`
- Pill shape (`rounded-full`), `min-h-11` (44px touch target) voor `md`.

### `IconButton`
`size: 'sm' | 'md' | 'lg'`, `variant: 'ghost' | 'solid' | 'danger'`. Alleen icon, `aria-label` verplicht.

### `Card`
`as?: 'div' | 'section' | 'article'`, `padded?: boolean` (default true), `interactive?: boolean` (hover-shadow, pointer).
Default: `bg-surface rounded-[--radius-card] shadow-[--shadow-card]`.

### `Input` / `Textarea`
Wrapper om native `<input>`. Props: `label`, `hint`, `error`, `prefix?` (bv. "g"), `suffix?`, alles geforward naar native. Integratie met RHF via `register`.

### `Select`
Native `<select>` gestyled. Voor complex (food search) gebruiken we `Combobox` los (zie features).

### `Sheet`
`side: 'bottom' | 'right'`, `open`, `onOpenChange`, `snapPoints?: number[]` (bottom only — bv. `[0.3, 0.7, 1]`). Swipe-to-dismiss, ESC, focus-trap. Render via portal in `document.body`.
Intern: `<SheetHeader>`, `<SheetBody>`, `<SheetFooter>`.

### `Dialog`
Centered modaal, `title`, `description`, `actions`. Voor confirm-dialogs (delete).

### `Tabs`
`value`, `onValueChange`, `<TabsList>`, `<TabsTrigger value>`, `<TabsContent value>`. Gebruikt in `/add-meal` voor foto/handmatig.

### `Badge`
`variant: 'neutral' | 'primary' | 'success' | 'warning' | 'danger'`, `size: 'sm' | 'md'`. Pill shape.

### `Avatar`
`src?`, `name` (voor initials fallback), `size: 'sm' | 'md' | 'lg'`.

### `ProgressRing`
SVG circle. Props: `value: number` (0–100), `size: number` (px), `stroke: number` (default 8), `label?: ReactNode` (midden), `color?: string` (default `--color-primary-500`). Gebruikt in `DayCaloriesRing`.

### `Skeleton`
`className` shorthand voor shimmer-pulse. `<Skeleton className="h-5 w-32" />`.

### `Toast`
Host in root layout: `<Toaster />`. Imperative API via `toast.success(msg)` / `toast.error(msg)`. Simpele eigen implementatie bovenop Redux `ui` slice (zie §4) — geen extra dep.

### `EmptyState`
`icon`, `title`, `description`, `action?`. Gebruikt in lege meals-list.

---

## 3. `shared/lib`

### `cn.ts`
```ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
```

### `format.ts`
```ts
export const formatDateShort = (d: Date | string) => // "di 12 mrt"
export const formatDateLong  = (d: Date | string) => // "dinsdag 12 maart 2024"
export const formatTime       = (d: Date | string) => // "14:32"
export const formatKcal       = (n: number)        => // "430 kcal"
export const formatMacro      = (g: number)        => // "30 g"
```
Alle via `date-fns` + `nl` locale.

### `api.ts`
Thin fetch wrapper om Payload REST:
```ts
export async function apiFetch<T>(
  path: string,
  init?: RequestInit & { params?: Record<string, string | number | boolean> },
): Promise<T>
```
- Prepend geen host (same-origin).
- `credentials: 'include'` standaard.
- Zet `Content-Type: application/json` voor body-requests, behalve FormData.
- Bij non-2xx: throw `ApiError { status, code, message, details }` — body wordt geparsed als JSON zodat Payload's `errors[]` array leesbaar is.

### `auth-guard.ts` (server-only)
```ts
export async function requireUser(): Promise<User> {
  const payload = await getPayload();
  const { user } = await payload.auth({ headers: await headers() });
  if (!user) redirect('/login');
  return user;
}
```
Gebruikt bovenaan elke beveiligde page.server-component.

---

## 4. Redux store (RTK)

**`src/shared/store/store.ts`**
```ts
export const makeStore = () => configureStore({
  reducer: {
    auth: authReducer,             // features/auth/model/slice.ts
    addMealPhoto: addMealPhotoReducer,
    addMealManual: addMealManualReducer,
    ui: uiReducer,                 // shared/store/ui-slice.ts
  },
});
export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
```

**`shared/store/hooks.ts`** — typed `useAppDispatch` + `useAppSelector`.

**`shared/store/ui-slice.ts`** — globale UI-state:
```ts
type UiState = {
  addMealSheetOpen: boolean;
  toasts: Array<{ id: string; type: 'success'|'error'|'info'; message: string }>;
};
```
Actions: `openAddMealSheet`, `closeAddMealSheet`, `pushToast`, `dismissToast`.

**Regel**: server-state (meals, user, foods) zit in react-query cache — NOOIT in Redux. Auth-slice bevat alleen UI-flags (bv. `loginFormError`), user-data komt uit `useCurrentUser` (react-query key `['me']`).

---

## 5. `entities/`

### `entities/meal/`

#### `ui/MealCard.tsx`
```ts
type Props = {
  meal: Meal & { items?: MealItem[] };
  variant?: 'compact' | 'full';
  onClick?: () => void;
};
```
- Compact: tijd + type-badge + totaal kcal (rechts).
- Full: + macro-mini-row (P/C/F) + eerste 2 items als tekst.
- Clickable wanneer `onClick`, anders `article`.

#### `ui/MealMacroRow.tsx`
```ts
type Props = { label: 'Eiwitten' | 'Koolhydraten' | 'Vetten' | 'Calorieën'; value: number; unit: 'g' | 'kcal'; icon?: LucideIcon };
```
Rij met checkmark-icon links, label, waarde rechts in pill-badge.

#### `ui/MealDonut.tsx`
Donut via `recharts.PieChart`. Props: `items: MealItem[]`, `size?: number`. Toont P/C/F als slices met kcal-contributie (`protein*4 + carbs*4 + fat*9`). Legend in grid onder donut. Totaal-kcal in midden.

#### `ui/MealTypeBadge.tsx`
`<Badge>` met `MEAL_TYPE_LABELS[type]`. Kleur per type (breakfast = amber, lunch = primary, dinner = indigo, snack = rose).

### `entities/day-log/`

#### `ui/DayCaloriesRing.tsx`
Props: `consumed: number`, `goal: number`, `size?: number`.
`<ProgressRing>` met `value = (consumed / goal) * 100`, midden-label toont `consumed` groot + `/ goal kcal` klein. Kleur omslag naar warning bij >100%, danger bij >120%.

#### `ui/DayLogCard.tsx`
Props: `dayLog: DayLog`, `totals: { calories, protein, carbs, fat }`.
Card met datum-header + ring mini + macro row. Klikbaar → `/meals?date=YYYY-MM-DD`.

### `entities/user/`

#### `ui/GoalProgress.tsx`
Props: `consumed: number`, `goal: number`. Horizontale progress-bar + "resterend: X kcal".

### `entities/food/`

#### `ui/FoodSearchItem.tsx`
Props: `food: Food`, `onSelect: () => void`. Eén rij: naam/brand + `caloriesPer100` + `source`-badge.

---

## 6. `features/`

### `features/auth/`

#### `api/useCurrentUser.ts`
```ts
useQuery({
  queryKey: ['me'],
  queryFn: () => apiFetch<User>('/api/users/me').then(r => r.user),
  staleTime: 60_000,
});
```

#### `api/useLogin.ts`
`useMutation` → `POST /api/users/login` `{ email, password }`. `onSuccess`: `invalidateQueries(['me'])` + `router.push('/')`.

#### `api/useRegister.ts`
`POST /api/users` → daarna `useLogin`. Validatie via zod (`z.string().email()`, `min(8)` password).

#### `api/useLogout.ts`
`POST /api/users/logout` → `queryClient.clear()` + `router.push('/login')`.

#### `ui/LoginForm.tsx`
RHF + `zodResolver`. Velden: email, password. Submit-error uit `useLogin().error`. Link naar register.

#### `ui/RegisterForm.tsx`
Velden: name, email, password, passwordConfirm. Client-side check `password === passwordConfirm`.

#### `model/slice.ts`
```ts
type AuthState = { lastRedirectPath?: string };
```
Minimaal — gebruikt om post-login terug te sturen naar waar user vandaan kwam.

### `features/add-meal-photo/`

Wizard-flow: `capture → analyzing → review → saved`.

#### `model/slice.ts`
```ts
type State =
  | { step: 'capture' }
  | { step: 'analyzing'; fileName: string }
  | { step: 'review'; analysis: PhotoAnalysis; photoDataUrl: string }
  | { step: 'saved'; mealId: string };
```
Actions: `startAnalyze(fileName)`, `analysisReady(analysis, photoDataUrl)`, `reset`, `saved(mealId)`.

#### `api/useAnalyzePhoto.ts`
`useMutation` → `POST /api/meals/analyze-photo` (FormData `photo`). Response: `PhotoAnalysis`. `onSuccess` dispatch `analysisReady`.

#### `api/useSaveMeal.ts`
`useMutation` die 3 calls doet (Payload heeft geen transaction-endpoint):
1. `POST /api/dayLogs` (upsert — eerst `find` op `date + user`, anders create).
2. `POST /api/meals` met `dayLog` id, `aiAnalyzed: true`, `aiConfidence`.
3. Voor elk item: `POST /api/mealItems` met `meal` id.

`onSuccess`: `invalidateQueries({ queryKey: ['meals'] })` + `['day-log', date]`.

#### `ui/PhotoCapture.tsx`
`<input type="file" accept="image/*" capture="environment">`. Preview via `URL.createObjectURL`. Submit → dispatch + mutate.

#### `ui/AnalyzeStep.tsx`
Loading state met progress-text ("Analyseren…"). Cancel knop reset slice.

#### `ui/ReviewStep.tsx`
- Confidence-banner: toon `analysis.confidence`; bij <0.7 warning "AI is onzeker — controleer waarden".
- Editable item-lijst (naam, gram, kcal, P/C/F) via RHF `useFieldArray`.
- Meal-type select (default op basis van tijd — ontbijt <11, lunch <15, diner <22, anders snack).
- "Bewaren" → `useSaveMeal` → op success `router.push(/meals/{id})`.

### `features/add-meal-manual/`

#### `model/slice.ts`
```ts
type State = {
  mealType: MealType;
  eatenAt: string; // ISO
  draftItems: Array<Omit<MealItem, 'id'|'meal'>>;
};
```

#### `api/useSearchFoods.ts`
Debounced `useQuery({ queryKey: ['foods', q], queryFn: apiFetch(...) })`. Lege query → geen fetch. Fallback naar Open Food Facts (`shared/api/openFoodFacts.ts`) als local-count < 3.

#### `api/useSaveMeal.ts`
Zelfde patroon als photo-feature; re-exporteer uit shared feature-helper om DRY te blijven (`features/_shared/save-meal.ts` — onder features-laag kan, want niet cross-feature import maar gedeelde utility).

#### `ui/ManualMealForm.tsx`
- Meal-type select, tijd-input (default `now`).
- `<FoodSearch>` combobox met debounce, resultaten als `<FoodSearchItem>`.
- Geselecteerd food → quick-add modaal voor portie-grootte → pushed naar `draftItems`.
- Lijst van draft-items met delete-icon.
- "Toevoegen" → save.

### `features/delete-meal/`

#### `api/useDeleteMeal.ts`
`DELETE /api/meals/:id`. `onSuccess`: `invalidateQueries(['meals'])` + redirect naar `/meals`.

#### `ui/DeleteMealButton.tsx`
Rendert `<IconButton variant="danger">` + `<Dialog>` confirm. Tekst: "Maaltijd verwijderen? Dit kan niet ongedaan gemaakt worden."

### `features/update-profile/`

#### `api/useUpdateProfile.ts`
`PATCH /api/users/:id`. Velden: name, weightKg, heightCm, birthDate, gender, activityLevel.

#### `ui/ProfileForm.tsx`
RHF. Toont afgeleide TDEE live met `calculateTDEE` als preview.

### `features/set-daily-goal/`

#### `api/useUpdateGoal.ts`
`PATCH /api/users/:id` met alleen `dailyCalorieGoal`. Optimistic update op `['me']`.

#### `ui/GoalForm.tsx`
Input met stepper (+/- 50). Hint: "Aanbevolen op basis van TDEE: {N} kcal".

---

## 7. `widgets/`

### `widgets/app-shell/`

#### `AppHeader.tsx`
Props:
```ts
{ title: string; back?: boolean; menu?: boolean; action?: ReactNode }
```
- `back`: `IconButton` met `ArrowLeft` → `router.back()`.
- `menu`: `IconButton` met `Menu` → opent `<Sheet side="right">` met nav-items (op mobile; op md+ nooit rendered).
- `action`: rechts (bv. delete-knop op meal-detail).
- Sticky, `backdrop-blur`, safe-area-top padding.

#### `BottomNav.tsx`
Vaste `<nav>` onderaan. 4 items: Home (`/`), Meals (`/meals`), **Plus** (groot, center, opent `AddMealSheet`), Profile (`/profile`). Actieve state via `usePathname()`. Op md+ verborgen, dan `SideNav`.

#### `SideNav.tsx`
Linker rail op md+: verticale icon-lijst. Zelfde routes.

#### `AddMealSheet.tsx`
`<Sheet side="bottom">` gestuurd door `ui.addMealSheetOpen`. Twee grote CTA-kaarten: "Foto" (`/add-meal?mode=photo`) en "Handmatig" (`/add-meal?mode=manual`). Bij klik sluiten sheet en navigeren.

### `widgets/today-overview/`
Server component. Props: `user: User`, `todayDate: string` (`YYYY-MM-DD`).
Haalt vandaag-dayLog + meals via payload.local API, berekent totalen (`sumMealItems` over alle items van alle meals), rendert:
- `<DayCaloriesRing consumed={totals.calories} goal={user.dailyCalorieGoal ?? calculateTDEE(user)} />`
- Macro-mini-row met P/C/F.
- CTA naar `/add-meal`.

### `widgets/recent-meals/`
Server component. Props: `userId: string`, `limit?: number` (default 5).
Haalt recente meals + hun items. Rendert horizontale scroll met `<MealCard variant="full">`. Klikt naar `/meals/[id]`.

### `widgets/weekly-trend/`
Server component. Props: `userId: string`.
Haalt 7 laatste dayLogs (sorteer op date desc, limit 7, reverse voor chart). Rendert `recharts.LineChart` met dagen op X, kcal op Y. Overlay: horizontale line op `dailyCalorieGoal`.

### `widgets/pwa/`

#### `ServiceWorkerRegister.tsx`
Client component. `useEffect` → `navigator.serviceWorker.register('/sw.js')`. Stil bij failure (alleen `console.error`).

#### `InstallPrompt.tsx`
Client component. Luistert `beforeinstallprompt`, bewaart event, toont dismissible banner: "Installeer Calorie Tracker als app". Bij accept → `e.prompt()`. Dismiss-state in `localStorage` (key `pwa-install-dismissed`).

---

## 8. `pages/`

Elke page is 1 bestand dat:
1. `await requireUser()` (server).
2. Optioneel server-data prefetchen.
3. Widgets samenstelt.

Voorbeeld `pages/dashboard/index.tsx`:
```tsx
export async function DashboardPage() {
  const user = await requireUser();
  const today = new Date().toISOString().slice(0, 10);
  return (
    <>
      <AppHeader title={`Hallo ${user.name ?? 'daar'}`} menu />
      <main className="flex-1 pb-24 px-4 space-y-6">
        <TodayOverview user={user} todayDate={today} />
        <RecentMeals userId={user.id} />
        <WeeklyTrend userId={user.id} />
      </main>
    </>
  );
}
```

Analoog voor `meals-list` (filter op date-range), `meal-detail` (by id), `add-meal` (Tabs photo/manual), `login`/`register` (geen guard), `profile`.

---

## 9. `app/(frontend)/`

### `layout.tsx`
```tsx
<html lang="nl" className={`${geistSans.variable} ${geistMono.variable}`}>
  <body className="min-h-screen flex flex-col bg-surface-muted text-ink">
    <Providers>
      {children}
      <ServiceWorkerRegister />
      <Toaster />
    </Providers>
  </body>
</html>
```
`BottomNav` wordt NIET in root-layout gemount — want dan verschijnt hij ook op `/login`. In plaats daarvan een subroute-layout `(frontend)/(app)/layout.tsx` met guard + BottomNav, en `(frontend)/(auth)/layout.tsx` zonder.

### `providers.tsx`
```tsx
'use client';
const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000 } } });
const store = makeStore();
export function Providers({ children }: { children: ReactNode }) {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </Provider>
  );
}
```
`makeStore()` wordt per-request aangeroepen in Next-server-context, maar omdat `Providers` een client component is, draait hij maar 1x per browser-tab (module-scope). Voor SSR-hydration van Redux-state (niet nodig hier, want alle server-data zit in react-query of props) — geen extra zorgen.

---

## 10. Route-contracten

| Route | Layout | Guard | Server-data |
| --- | --- | --- | --- |
| `/login` | `(auth)` | nee | geen |
| `/register` | `(auth)` | nee | geen |
| `/` | `(app)` | `requireUser` | user + today-dayLog + recent-meals + weekly-dayLogs |
| `/meals` | `(app)` | `requireUser` | meals (paginated, filter `?date=`, `?range=`) |
| `/meals/[id]` | `(app)` | `requireUser` | meal + items (ownership check impliciet via access-control) |
| `/add-meal` | `(app)` | `requireUser` | geen (pure client-wizard) |
| `/profile` | `(app)` | `requireUser` | user (uit `me`) |
| `/~offline` | — | nee | statisch |

---

## 11. Data-contracten (REST payloads)

### Create meal (photo-flow, client-side)
```ts
// 1. Ensure dayLog
POST /api/dayLogs  body: { date: '2026-04-24' }
  → 201 { doc: DayLog }  // user wordt server-side geforceerd

// 2. Create meal
POST /api/meals  body: {
  dayLog: string,        // dayLog.id
  eatenAt: string,       // ISO
  mealType: 'BREAKFAST'|'LUNCH'|'DINNER'|'SNACK',
  aiAnalyzed: true,
  aiConfidence: number,
}
  → 201 { doc: Meal }

// 3. Create items (N×)
POST /api/mealItems  body: {
  meal: string,
  name: string, quantity: number, unit: string,
  calories: number, protein: number, carbs: number, fat: number,
}
```

DayLog-upsert: eerst `GET /api/dayLogs?where[date][equals]=YYYY-MM-DD&limit=1`, gebruik `docs[0]` anders POST. Gebruik helper `getOrCreateDayLog(date)` in `features/_shared/`.

### Analyze photo
```ts
POST /api/meals/analyze-photo
  Content-Type: multipart/form-data
  body: photo: File
  → { analysis: PhotoAnalysis }
```
(Bestaat al, afgerond door review-PR 4.)

---

## 12. Formulier-validatie (zod-schemas)

`shared/lib/schemas.ts`:
```ts
export const LoginSchema = z.object({
  email: z.string().email('Ongeldig e-mailadres'),
  password: z.string().min(1, 'Verplicht'),
});

export const RegisterSchema = LoginSchema.extend({
  name: z.string().min(1, 'Verplicht').optional(),
  password: z.string().min(8, 'Minimaal 8 tekens'),
  passwordConfirm: z.string(),
}).refine(d => d.password === d.passwordConfirm, {
  message: 'Wachtwoorden komen niet overeen', path: ['passwordConfirm'],
});

export const MealItemSchema = z.object({
  name: z.string().min(1),
  quantity: z.number().positive(),
  unit: z.string().min(1),
  calories: z.number().nonnegative(),
  protein: z.number().nonnegative().default(0),
  carbs: z.number().nonnegative().default(0),
  fat: z.number().nonnegative().default(0),
});

export const SaveMealSchema = z.object({
  mealType: z.enum(['BREAKFAST','LUNCH','DINNER','SNACK']),
  eatenAt: z.string(),
  items: z.array(MealItemSchema).min(1, 'Minstens 1 item'),
});

export const ProfileSchema = z.object({
  name: z.string().optional(),
  weightKg: z.number().positive().max(500).optional(),
  heightCm: z.number().positive().max(250).optional(),
  birthDate: z.string().optional(),
  gender: z.enum(['MALE','FEMALE','OTHER']).optional(),
  activityLevel: z.enum(['SEDENTARY','LIGHT','MODERATE','ACTIVE','VERY_ACTIVE']).optional(),
  dailyCalorieGoal: z.number().positive().max(10000).optional(),
});
```

---

## 13. Accessibility

- Alle `IconButton` verplicht `aria-label`.
- Focus-visible ring via Tailwind `focus-visible:ring-2 ring-primary-500 ring-offset-2`.
- `ProgressRing` `role="img"` + `aria-label="X van Y kcal"`.
- Forms: elk `<Input>` een `<Label>`, errors via `aria-describedby`.
- `BottomNav` `role="navigation"`, actieve tab `aria-current="page"`.
- Sheet/Dialog: focus-trap, ESC-close, return-focus naar trigger.

---

## 14. Performance

- Server components waar mogelijk (widgets die data lezen).
- `next/dynamic` + `ssr: false` voor `recharts`-bevattende widgets (chart-libs zijn groot en niet nodig op server).
- `<Image>` van Next voor meal-foto's (`photoUrl` is optioneel nu, later).
- react-query `staleTime: 30_000` default, `dashboard`-queries 60s.

---

## 15. Error handling

- Root-layout `error.tsx` met generieke fallback ("Er ging iets mis. Probeer opnieuw.").
- Per segment `error.tsx` waar zinvol (meal-detail: "Maaltijd niet gevonden" + link naar `/meals`).
- Client mutations → toast via `pushToast({ type: 'error', message })`.
- 401 response in `apiFetch` → redirect naar `/login`.

---

## 16. Open issues / beslissingen

1. **Chart library**: `recharts` in plan; check React 19 peer-dep warnings bij `pnpm add`. Fallback `visx`.
2. **Food-search fallback**: Open Food Facts gebruiken bij lege local-search? → Voorstel: ja, maar alleen bij >3 chars query en local-count < 3; cachen in `Foods` collection na selectie (persist voor volgende searches).
3. **Photo opslag**: `photoUrl` op `Meals` is nu alleen een veld. Uploaden naar Payload's media (nieuwe collection) of S3 is out-of-scope v1 — we slaan foto nu niet op, alleen de analyse.
4. **Welcome-screen**: screenshot toont een welkomstscherm; wij gebruiken `/login` als instap — geen aparte welcome-slide. Als gewenst later `widgets/welcome-carousel` voor eerste-keer-users.
5. **DayLog-upsert**: client-side 2 calls is niet atomisch. Acceptabel (idempotent per datum), maar bij parallelle creates mogelijk duplicates. Unieke index `(user, date)` op DayLogs bestaat al → 2e call faalt, catch → refetch en gebruik bestaande.
6. **TDEE-fallback voor goal**: `dailyCalorieGoal` default 2000 in schema. Als user profiel invult → suggestie tonen om goal op TDEE te zetten (één klik).
