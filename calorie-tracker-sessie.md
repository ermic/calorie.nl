# Calorie Tracker PWA - Projectplan & Starter

> Sessie-export: volledige context, keuzes en code voor de calorie-tracker PWA.
> Gebruik dit document als referentie bij het verder bouwen in VS Code.

## Inhoudsopgave

- [Projectbeschrijving](#projectbeschrijving)
- [Tech stack & keuzes](#tech-stack--keuzes)
- [Architectuur (FSD + Payload)](#architectuur-fsd--payload)
- [Setup instructies](#setup-instructies)
- [Hosting: nginx subdomeinen](#hosting-nginx-subdomeinen)
- [Bestanden](#bestanden)
  - [package.json](#packagejson)
  - [.env.example](#envexample)
  - [next.config.mjs](#nextconfigmjs)
  - [public/manifest.json](#publicmanifestjson)
  - [src/payload.config.ts](#srcpayloadconfigts)
  - [src/collections/Users.ts](#srccollectionsuserts)
  - [src/collections/Foods.ts](#srccollectionsfoodts)
  - [src/collections/DayLogs.ts](#srccollectionsdaylogst)
  - [src/collections/Meals.ts](#srccollectionsmealst)
  - [src/collections/MealItems.ts](#srccollectionsmealitemst)
  - [src/shared/lib/payload.ts](#srcsharedlibpayloadts)
  - [src/shared/api/gemini.ts](#srcsharedapigeminits)
  - [src/shared/api/openFoodFacts.ts](#srcsharedapiopenfoodfactsts)
  - [src/entities/user/model/calculations.ts](#srcentitiesusermodelcalculationsts)
  - [src/entities/meal/model/types.ts](#srcentitiesmealmodeltypests)
  - [src/features/analyze-photo/model/analyze.ts](#srcfeaturesanalyze-photomodelanalyzets)
  - [src/app/api/meals/analyze-photo/route.ts](#srcappapimealsanalyze-photoroutets)
- [Belangrijke design-keuzes](#belangrijke-design-keuzes)
- [Vervolgstappen](#vervolgstappen)

---

## Projectbeschrijving

PWA voor het bijhouden van dagelijkse calorieën. De gebruiker kan elke dag
bijhouden wat hij heeft gegeten. Het is mogelijk om foto's te maken en door
AI de calorieën te laten tellen. De AI moet in eerste instantie gratis zijn.
Betaalde accounts krijgen meer AI foto-credits.

Onderhoud en admin gebeuren via Payload CMS (ingebouwd admin-panel op
`/admin`), zodat we geen eigen CRUD-schermen hoeven te bouwen voor de data.

## Tech stack & keuzes

| Onderdeel | Keuze | Reden |
|-----------|-------|-------|
| Framework | Next.js 16 (App Router) + React 19 | Moderne React, server actions |
| Taal | TypeScript | Type-veiligheid, betere DX |
| Frontend-architectuur | Feature-Sliced Design (FSD) | Schaalbaar, voorkomt circulaire deps |
| Backend / CMS | Payload 3 | Admin UI, auth, REST/GraphQL, type-safety — geen custom CRUD |
| Database | PostgreSQL + `@payloadcms/db-postgres` | Payload's officiële adapter, migraties ingebouwd |
| Auth | Payload built-in auth | Geen NextAuth nodig, direct werkend met users-collectie |
| AI (foto) | Google Gemini 1.5 Flash | Gratis tier (1500 req/dag, 15/min), goede vision |
| Voedingsdatabase | Open Food Facts API | Gratis, miljoenen producten, barcode support |
| PWA | `@serwist/next` | Actief onderhouden Workbox-wrapper, werkt met App Router |
| Styling | TailwindCSS v4 | Snel, klein bundle, config-loos |
| State/data | TanStack Query + Zustand | Server state + client state |

**MVP focus**: Uitgebreide voedingsdatabase + mooie UI/UX. Admin wordt
out-of-the-box door Payload geleverd.

## Architectuur (FSD + Payload)

Payload draait *in* dezelfde Next.js app. Het neemt twee route-groepen in
beslag: `app/(payload)/admin/...` (admin UI) en `app/(payload)/api/...`
(REST + GraphQL). De user-facing PWA leeft in `app/(frontend)/...` en volgt
Feature-Sliced Design.

```
src/
├── app/
│   ├── (frontend)/          # User-facing PWA pagina's (FSD-compositie)
│   │   ├── layout.tsx
│   │   ├── page.tsx         # Dashboard
│   │   └── ...              # dagboek, add-meal, etc.
│   ├── (payload)/           # Payload admin + auto-gegenereerde API
│   │   ├── admin/...
│   │   └── api/...
│   └── api/                 # Custom non-Payload routes
│       └── meals/analyze-photo/route.ts
├── collections/             # Payload collections (data model)
│   ├── Users.ts
│   ├── Foods.ts
│   ├── DayLogs.ts
│   ├── Meals.ts
│   └── MealItems.ts
├── payload.config.ts        # Payload config: db, collections, admin
├── payload-types.ts         # Auto-gegenereerd via `pnpm payload generate:types`
├── pages/                   # FSD pages layer (compose widgets)
├── widgets/                 # FSD widgets (DagboekLijst, FotoUploader)
├── features/                # FSD features (analyze-photo, add-meal)
├── entities/                # FSD entities (User, Meal calculations/types)
└── shared/                  # FSD shared
    ├── api/
    │   ├── gemini.ts
    │   └── openFoodFacts.ts
    ├── lib/
    │   └── payload.ts       # getPayload() helper voor Local API
    └── ui/
```

### FSD kernregel

Een laag mag alleen importeren van lagen eronder.
`features` mag `entities` en `shared` gebruiken, maar niet andere `features`
of `widgets`. Elke slice heeft structuur `model/`, `ui/`, `api/`, `index.ts`.

### Payload lagen (van boven naar beneden)

```
┌──────────────────────────────────────────────────────────┐
│ app/(frontend)  │ FSD gecomponeerde pagina's            │
├──────────────────────────────────────────────────────────┤
│ app/(payload)   │ Payload admin + REST/GraphQL API      │
├──────────────────────────────────────────────────────────┤
│ collections/    │ Users, Foods, DayLogs, Meals, etc.    │
├──────────────────────────────────────────────────────────┤
│ payload.config  │ DB adapter, plugins, globale config   │
├──────────────────────────────────────────────────────────┤
│ Postgres        │ @payloadcms/db-postgres (Drizzle)     │
└──────────────────────────────────────────────────────────┘

Externe APIs:
- Gemini Vision API (foto → calorieën, gratis tier → paid meer)
- Open Food Facts (barcode scanner, miljoenen producten)
```

## Setup instructies

### 1. Scaffold project

```bash
pnpm create payload-app@latest . -t blank --use-pnpm
```

Kies tijdens de interactieve prompts:
- Database: **PostgreSQL**
- Connection string: `postgresql://countcalories:<pw>@localhost:5432/countcalories`

### 2. Postgres database (al aanwezig op server)

```sql
CREATE USER countcalories WITH PASSWORD '<sterk-wachtwoord>';
CREATE DATABASE countcalories OWNER countcalories;
\q
```

### 3. Environment variabelen

```bash
cp .env.example .env
```

Vul in:
- `DATABASE_URI`: Postgres connection string
- `PAYLOAD_SECRET`: `openssl rand -base64 32`
- `GEMINI_API_KEY`: gratis via <https://aistudio.google.com/app/apikey>

### 4. Dependencies + database

```bash
pnpm install
pnpm payload migrate:create init    # maak initiële migratie
pnpm payload migrate                # voer uit tegen de DB
pnpm payload generate:types         # genereer payload-types.ts
```

### 5. Eerste admin user

Start de dev server en open `http://devcc.erikdeboer.nl/admin`. Payload vraagt
om een eerste admin-user aan te maken.

### 6. Run dev server

```bash
pnpm dev
```

> **Gotcha**: bij de *eerste* cold request op `/admin` krijg je soms een leeg
> scherm — de compile van de Payload admin chunks duurt 10-15s en Next.js
> streamt output voordat de compile klaar is. Eén hard-refresh (Ctrl+Shift+R)
> en het werkt. Herhaalt zich niet binnen dezelfde dev-sessie.
>
> Dev draait bewust op **webpack** (niet Turbopack) omdat Payload 3 + Turbopack
> nog niet stabiel zijn op Next.js 16.2.4.

## Hosting: nginx subdomeinen

- **Development**: `devcc.erikdeboer.nl` → `http://127.0.0.1:3001` (`pnpm dev`)
- **Productie**: `countcalories.erikdeboer.nl` → `http://127.0.0.1:3000` (`pnpm start`)

DNS: zorg dat beide subdomeinen naar dit server-IP wijzen. TLS regelen via
certbot na de eerste HTTP-deploy.

---

## Bestanden

### package.json

Payload scaffolt een werkende `package.json` — daarna breiden we uit met
FSD-dependencies.

```jsonc
{
  "name": "countcalories",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "next dev -p 3001",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "payload": "payload",
    "generate:types": "payload generate:types",
    "migrate": "payload migrate",
    "migrate:create": "payload migrate:create"
  },
  "dependencies": {
    "payload": "^3.84.1",
    "@payloadcms/db-postgres": "^3.84.1",
    "@payloadcms/next": "^3.84.1",
    "@payloadcms/richtext-lexical": "^3.84.1",
    "@payloadcms/ui": "^3.84.1",
    "@google/generative-ai": "^0.21.0",
    "@hookform/resolvers": "^3.9.1",
    "@tanstack/react-query": "^5.59.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.1",
    "date-fns": "^4.1.0",
    "lucide-react": "^0.460.0",
    "next": "16.2.4",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-hook-form": "^7.53.0",
    "tailwind-merge": "^2.5.4",
    "zod": "^3.23.8",
    "zustand": "^5.0.1",
    "@serwist/next": "^9.0.0",
    "serwist": "^9.0.0"
  },
  "devDependencies": {
    "@types/node": "^22",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "autoprefixer": "^10.4.20",
    "eslint": "^9",
    "eslint-config-next": "16.2.4",
    "postcss": "^8.4.49",
    "tailwindcss": "^4",
    "@tailwindcss/postcss": "^4",
    "typescript": "^5"
  }
}
```

### .env.example

```env
# Payload
DATABASE_URI="postgresql://countcalories:password@localhost:5432/countcalories"
PAYLOAD_SECRET="genereer-met-openssl-rand-base64-32"

# Publieke URL (voor admin cookies en email links)
NEXT_PUBLIC_SERVER_URL="http://devcc.erikdeboer.nl"

# Google Gemini (voor foto-analyse) — https://aistudio.google.com/app/apikey
GEMINI_API_KEY=""

# Optioneel: voor betaalde accounts later
# STRIPE_SECRET_KEY=""
# STRIPE_WEBHOOK_SECRET=""
```

### next.config.mjs

```js
import withSerwistInit from '@serwist/next';

const withSerwist = withSerwistInit({
  swSrc: 'src/app/sw.ts',
  swDest: 'public/sw.js',
  disable: process.env.NODE_ENV === 'development',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.openfoodfacts.org' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '5mb', // voor foto-uploads
    },
  },
};

export default withSerwist(nextConfig);
```

### public/manifest.json

```json
{
  "name": "Calorie Tracker",
  "short_name": "Calories",
  "description": "Houd je dagelijkse calorieën bij, ook met AI foto-herkenning",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#10b981",
  "orientation": "portrait",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ],
  "shortcuts": [
    {
      "name": "Foto toevoegen",
      "short_name": "Foto",
      "description": "Analyseer je maaltijd met AI",
      "url": "/add-meal?mode=photo"
    }
  ]
}
```

### src/payload.config.ts

```ts
import { buildConfig } from 'payload';
import { postgresAdapter } from '@payloadcms/db-postgres';
import { lexicalEditor } from '@payloadcms/richtext-lexical';
import path from 'path';
import { fileURLToPath } from 'url';

import { Users } from './collections/Users';
import { Foods } from './collections/Foods';
import { DayLogs } from './collections/DayLogs';
import { Meals } from './collections/Meals';
import { MealItems } from './collections/MealItems';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Users, Foods, DayLogs, Meals, MealItems],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URI || '',
    },
  }),
  serverURL: process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3001',
});
```

### src/collections/Users.ts

```ts
import type { CollectionConfig } from 'payload';

export const Users: CollectionConfig = {
  slug: 'users',
  auth: true, // email+password auth out-of-the-box
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'name', 'plan', 'aiPhotoCredits'],
  },
  fields: [
    { name: 'name', type: 'text' },

    // Subscription
    {
      name: 'plan',
      type: 'select',
      options: [
        { label: 'Free', value: 'FREE' },
        { label: 'Premium', value: 'PREMIUM' },
        { label: 'Pro', value: 'PRO' },
      ],
      defaultValue: 'FREE',
      required: true,
    },
    { name: 'aiPhotoCredits', type: 'number', defaultValue: 5, required: true },
    { name: 'creditsResetAt', type: 'date', defaultValue: () => new Date() },

    // Profiel voor calorie-berekening
    { name: 'dailyCalorieGoal', type: 'number', defaultValue: 2000 },
    { name: 'weightKg', type: 'number' },
    { name: 'heightCm', type: 'number' },
    { name: 'birthDate', type: 'date' },
    {
      name: 'gender',
      type: 'select',
      options: [
        { label: 'Man', value: 'MALE' },
        { label: 'Vrouw', value: 'FEMALE' },
        { label: 'Anders', value: 'OTHER' },
      ],
    },
    {
      name: 'activityLevel',
      type: 'select',
      options: [
        { label: 'Weinig beweging', value: 'SEDENTARY' },
        { label: 'Licht actief', value: 'LIGHT' },
        { label: 'Matig actief', value: 'MODERATE' },
        { label: 'Actief', value: 'ACTIVE' },
        { label: 'Zeer actief', value: 'VERY_ACTIVE' },
      ],
      defaultValue: 'MODERATE',
    },
  ],
};
```

### src/collections/Foods.ts

```ts
import type { CollectionConfig } from 'payload';

export const Foods: CollectionConfig = {
  slug: 'foods',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'brand', 'caloriesPer100', 'source', 'verified'],
  },
  access: {
    read: () => true, // iedereen kan voedingsmiddelen lezen
  },
  fields: [
    { name: 'barcode', type: 'text', unique: true, index: true },
    { name: 'name', type: 'text', required: true, index: true },
    { name: 'brand', type: 'text' },

    // Per 100g / 100ml
    { name: 'caloriesPer100', type: 'number', required: true },
    { name: 'proteinPer100', type: 'number', defaultValue: 0 },
    { name: 'carbsPer100', type: 'number', defaultValue: 0 },
    { name: 'fatPer100', type: 'number', defaultValue: 0 },
    { name: 'fiberPer100', type: 'number', defaultValue: 0 },
    { name: 'sugarPer100', type: 'number', defaultValue: 0 },

    { name: 'servingSize', type: 'number' },
    { name: 'servingUnit', type: 'text' },

    {
      name: 'source',
      type: 'select',
      options: [
        { label: 'User', value: 'USER' },
        { label: 'Open Food Facts', value: 'OPEN_FOOD_FACTS' },
        { label: 'AI Generated', value: 'AI_GENERATED' },
        { label: 'Verified', value: 'VERIFIED' },
      ],
      defaultValue: 'USER',
      required: true,
    },
    { name: 'verified', type: 'checkbox', defaultValue: false },
  ],
};
```

### src/collections/DayLogs.ts

```ts
import type { CollectionConfig, Access } from 'payload';

const ownOnly: Access = ({ req: { user } }) => {
  if (!user) return false;
  return { user: { equals: user.id } };
};

export const DayLogs: CollectionConfig = {
  slug: 'dayLogs',
  admin: {
    useAsTitle: 'date',
    defaultColumns: ['date', 'user', 'totalCalories'],
  },
  access: {
    read: ownOnly,
    update: ownOnly,
    delete: ownOnly,
  },
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
    },
    { name: 'date', type: 'date', required: true, index: true },

    // Aggregaten (berekend via hooks, voor snelheid)
    { name: 'totalCalories', type: 'number', defaultValue: 0 },
    { name: 'totalProtein', type: 'number', defaultValue: 0 },
    { name: 'totalCarbs', type: 'number', defaultValue: 0 },
    { name: 'totalFat', type: 'number', defaultValue: 0 },

    { name: 'note', type: 'textarea' },
  ],
  indexes: [{ fields: ['user', 'date'], unique: true }],
};
```

### src/collections/Meals.ts

```ts
import type { CollectionConfig, Access } from 'payload';

const ownOnly: Access = ({ req: { user } }) => {
  if (!user) return false;
  return { user: { equals: user.id } };
};

export const Meals: CollectionConfig = {
  slug: 'meals',
  admin: {
    useAsTitle: 'mealType',
    defaultColumns: ['mealType', 'eatenAt', 'user', 'aiAnalyzed'],
  },
  access: {
    read: ownOnly,
    update: ownOnly,
    delete: ownOnly,
  },
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
    },
    {
      name: 'dayLog',
      type: 'relationship',
      relationTo: 'dayLogs',
      required: true,
    },
    { name: 'eatenAt', type: 'date', defaultValue: () => new Date() },
    {
      name: 'mealType',
      type: 'select',
      options: [
        { label: 'Ontbijt', value: 'BREAKFAST' },
        { label: 'Lunch', value: 'LUNCH' },
        { label: 'Diner', value: 'DINNER' },
        { label: 'Tussendoor', value: 'SNACK' },
      ],
      required: true,
    },
    { name: 'photoUrl', type: 'text' },
    { name: 'aiAnalyzed', type: 'checkbox', defaultValue: false },
    { name: 'aiConfidence', type: 'number' },
  ],
};
```

### src/collections/MealItems.ts

```ts
import type { CollectionConfig, Access } from 'payload';

const ownOnly: Access = ({ req: { user } }) => {
  if (!user) return false;
  return true; // filtering gaat via meal.user; eventueel nog strakker
};

export const MealItems: CollectionConfig = {
  slug: 'mealItems',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'quantity', 'unit', 'calories'],
  },
  access: {
    read: ownOnly,
    update: ownOnly,
    delete: ownOnly,
  },
  fields: [
    { name: 'meal', type: 'relationship', relationTo: 'meals', required: true },
    { name: 'food', type: 'relationship', relationTo: 'foods' },

    { name: 'name', type: 'text', required: true },
    { name: 'quantity', type: 'number', required: true },
    { name: 'unit', type: 'text', required: true },

    // Nutritie per deze portie (niet per 100g)
    { name: 'calories', type: 'number', required: true },
    { name: 'protein', type: 'number', defaultValue: 0 },
    { name: 'carbs', type: 'number', defaultValue: 0 },
    { name: 'fat', type: 'number', defaultValue: 0 },
    { name: 'fiber', type: 'number', defaultValue: 0 },
    { name: 'sugar', type: 'number', defaultValue: 0 },
  ],
};
```

### src/shared/lib/payload.ts

```ts
import { getPayload as _getPayload } from 'payload';
import config from '@/payload.config';

/**
 * Payload Local API client — server-side gebruik.
 * Payload cached de instance intern op basis van de config module.
 */
export const getPayload = async () => _getPayload({ config });
```

### src/shared/api/gemini.ts

```ts
import { GoogleGenerativeAI } from '@google/generative-ai';

if (!process.env.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is niet geconfigureerd');
}

export const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// gemini-1.5-flash is gratis en snel, perfect voor foto-analyse
export const visionModel = genAI.getGenerativeModel({
  model: 'gemini-1.5-flash',
  generationConfig: {
    temperature: 0.2,
    responseMimeType: 'application/json',
  },
});
```

### src/shared/api/openFoodFacts.ts

```ts
/**
 * Open Food Facts API client
 * Gratis, geen API key nodig, miljoenen producten
 * Docs: https://wiki.openfoodfacts.org/API
 */

const OFF_BASE = 'https://world.openfoodfacts.org';

export interface OFFProduct {
  code: string;
  product_name?: string;
  brands?: string;
  nutriments?: {
    'energy-kcal_100g'?: number;
    proteins_100g?: number;
    carbohydrates_100g?: number;
    fat_100g?: number;
    fiber_100g?: number;
    sugars_100g?: number;
  };
  serving_quantity?: number;
  serving_size?: string;
  image_url?: string;
}

export interface OFFSearchResult {
  products: OFFProduct[];
  count: number;
}

export async function getProductByBarcode(barcode: string): Promise<OFFProduct | null> {
  try {
    const res = await fetch(`${OFF_BASE}/api/v2/product/${barcode}.json`, {
      next: { revalidate: 60 * 60 * 24 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.status === 1 ? data.product : null;
  } catch (err) {
    console.error('OFF barcode lookup failed:', err);
    return null;
  }
}

export async function searchProducts(query: string, pageSize = 20): Promise<OFFSearchResult> {
  try {
    const params = new URLSearchParams({
      search_terms: query,
      page_size: String(pageSize),
      fields: 'code,product_name,brands,nutriments,serving_quantity,serving_size,image_url',
      json: '1',
    });
    const res = await fetch(`${OFF_BASE}/cgi/search.pl?${params}`, {
      next: { revalidate: 60 * 60 },
    });
    if (!res.ok) return { products: [], count: 0 };
    const data = await res.json();
    return { products: data.products ?? [], count: data.count ?? 0 };
  } catch (err) {
    console.error('OFF search failed:', err);
    return { products: [], count: 0 };
  }
}

export function normalizeOFFProduct(p: OFFProduct) {
  const n = p.nutriments ?? {};
  return {
    barcode: p.code,
    name: p.product_name ?? 'Onbekend product',
    brand: p.brands ?? null,
    caloriesPer100: n['energy-kcal_100g'] ?? 0,
    proteinPer100: n.proteins_100g ?? 0,
    carbsPer100: n.carbohydrates_100g ?? 0,
    fatPer100: n.fat_100g ?? 0,
    fiberPer100: n.fiber_100g ?? 0,
    sugarPer100: n.sugars_100g ?? 0,
    servingSize: p.serving_quantity ?? null,
    servingUnit: p.serving_size ?? null,
  };
}
```

### src/entities/user/model/calculations.ts

```ts
import type { User } from '@/payload-types';

export type { User };

export type Gender = NonNullable<User['gender']>;
export type ActivityLevel = NonNullable<User['activityLevel']>;

/**
 * Bereken basale metabolisme (BMR) met Mifflin-St Jeor formule
 */
export function calculateBMR(params: {
  weightKg: number;
  heightCm: number;
  age: number;
  gender: Gender;
}): number {
  const { weightKg, heightCm, age, gender } = params;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return gender === 'MALE' ? base + 5 : base - 161;
}

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  SEDENTARY: 1.2,
  LIGHT: 1.375,
  MODERATE: 1.55,
  ACTIVE: 1.725,
  VERY_ACTIVE: 1.9,
};

/**
 * Bereken de dagelijkse calorie-behoefte (TDEE)
 */
export function calculateTDEE(
  user: Pick<User, 'weightKg' | 'heightCm' | 'birthDate' | 'gender' | 'activityLevel'>
): number | null {
  if (!user.weightKg || !user.heightCm || !user.birthDate || !user.gender || !user.activityLevel) {
    return null;
  }
  const age = new Date().getFullYear() - new Date(user.birthDate).getFullYear();
  const bmr = calculateBMR({
    weightKg: user.weightKg,
    heightCm: user.heightCm,
    age,
    gender: user.gender,
  });
  return Math.round(bmr * ACTIVITY_MULTIPLIERS[user.activityLevel]);
}

/**
 * Hoeveel AI foto-credits per dag voor een plan?
 */
export function getDailyAICredits(plan: User['plan']): number {
  switch (plan) {
    case 'FREE':
      return 5;
    case 'PREMIUM':
      return 50;
    case 'PRO':
      return 500;
    default:
      return 5;
  }
}
```

### src/entities/meal/model/types.ts

```ts
import type { Meal, MealItem } from '@/payload-types';

export type MealType = NonNullable<Meal['mealType']>;
export type { Meal, MealItem };

/**
 * Som de nutrienten van alle items in een maaltijd op
 */
export function sumMealItems(items: MealItem[]) {
  return items.reduce(
    (acc, item) => ({
      calories: acc.calories + (item.calories ?? 0),
      protein: acc.protein + (item.protein ?? 0),
      carbs: acc.carbs + (item.carbs ?? 0),
      fat: acc.fat + (item.fat ?? 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
}

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  BREAKFAST: 'Ontbijt',
  LUNCH: 'Lunch',
  DINNER: 'Diner',
  SNACK: 'Tussendoor',
};
```

### src/features/analyze-photo/model/analyze.ts

```ts
import { visionModel } from '@/shared/api/gemini';
import { z } from 'zod';

const AnalysisSchema = z.object({
  confidence: z.number().min(0).max(1),
  items: z.array(
    z.object({
      name: z.string(),
      estimatedGrams: z.number(),
      calories: z.number(),
      protein: z.number(),
      carbs: z.number(),
      fat: z.number(),
    })
  ),
  notes: z.string().optional(),
});

export type PhotoAnalysis = z.infer<typeof AnalysisSchema>;

const SYSTEM_PROMPT = `Je bent een voedingsexpert die foto's van maaltijden analyseert voor een calorie-tracker app.

Analyseer de foto en identificeer alle zichtbare voedingsmiddelen. Voor elk item:
1. Geef een duidelijke Nederlandse naam
2. Schat de portiegrootte in gram (wees realistisch, gebruik zichtbare referenties zoals borden/bestek)
3. Bereken calorieën, eiwitten, koolhydraten en vetten voor die portie

Geef ook een confidence score (0-1):
- 1.0 = zeker, duidelijk herkenbaar standaardgerecht
- 0.7 = redelijk zeker, enige aanname over ingrediënten
- 0.4 = lage zekerheid, veel aannames
- < 0.3 = raad de gebruiker aan handmatig in te voeren

Antwoord ALLEEN met geldige JSON in dit formaat:
{
  "confidence": 0.8,
  "items": [
    { "name": "Gegrilde kipfilet", "estimatedGrams": 150, "calories": 248, "protein": 46, "carbs": 0, "fat": 5 }
  ],
  "notes": "Optionele toelichting voor onzekerheden"
}`;

export async function analyzePhoto(
  imageBase64: string,
  mimeType: 'image/jpeg' | 'image/png' = 'image/jpeg'
): Promise<PhotoAnalysis> {
  const result = await visionModel.generateContent([
    SYSTEM_PROMPT,
    { inlineData: { data: imageBase64, mimeType } },
  ]);

  const text = result.response.text();
  try {
    const parsed = JSON.parse(text);
    return AnalysisSchema.parse(parsed);
  } catch (err) {
    console.error('Failed to parse Gemini response:', text, err);
    throw new Error('AI-analyse gaf geen geldig resultaat. Probeer een andere foto.');
  }
}
```

### src/app/api/meals/analyze-photo/route.ts

```ts
import { NextRequest, NextResponse } from 'next/server';
import { headers as nextHeaders } from 'next/headers';
import { getPayload } from '@/shared/lib/payload';
import { analyzePhoto } from '@/features/analyze-photo/model/analyze';
import { getDailyAICredits } from '@/entities/user/model/calculations';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const payload = await getPayload();

  // 1. Auth check — Payload leest de auth-cookie
  const { user } = await payload.auth({ headers: await nextHeaders() });
  if (!user) {
    return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });
  }

  // 2. Credit check + reset per dag
  const now = new Date();
  const lastReset = user.creditsResetAt ? new Date(user.creditsResetAt) : new Date(0);
  const isNewDay = now.toDateString() !== lastReset.toDateString();

  let credits = user.aiPhotoCredits ?? 0;
  if (isNewDay) {
    credits = getDailyAICredits(user.plan);
    await payload.update({
      collection: 'users',
      id: user.id,
      data: { aiPhotoCredits: credits, creditsResetAt: now.toISOString() },
    });
  }

  if (credits <= 0) {
    return NextResponse.json(
      { error: 'Geen AI-credits meer vandaag', upgradeRequired: user.plan === 'FREE' },
      { status: 429 }
    );
  }

  // 3. Parse multipart form data
  const formData = await req.formData();
  const file = formData.get('photo') as File | null;
  if (!file) {
    return NextResponse.json({ error: 'Geen foto meegestuurd' }, { status: 400 });
  }
  if (file.size > 4 * 1024 * 1024) {
    return NextResponse.json({ error: 'Foto te groot (max 4MB)' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const base64 = buffer.toString('base64');
  const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';

  // 4. Analyseer
  try {
    const analysis = await analyzePhoto(base64, mimeType);

    // 5. Trek credit af (alleen bij succes)
    await payload.update({
      collection: 'users',
      id: user.id,
      data: { aiPhotoCredits: credits - 1 },
    });

    return NextResponse.json({ analysis, creditsRemaining: credits - 1 });
  } catch (err) {
    console.error('Photo analysis failed:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Analyse mislukt' },
      { status: 500 }
    );
  }
}
```

---

## Belangrijke design-keuzes

### 1. Payload vervangt Prisma + NextAuth + admin UI

Payload geeft ons drie dingen in één: een type-safe data laag over Postgres,
email+password auth en een admin-panel. Voor een app met hobby/onderhoud-gebruik
scheelt dat weken bouwen. De frontend gebruikt de **Local API**
(`payload.find()`, `payload.create()`) in server components en server actions,
wat net zo snel is als directe DB-queries omdat het in-process draait.

### 2. Gemini 1.5 Flash in plaats van Pro

Flash is gratis (1500 req/dag, 15/min) en voor foto-herkenning even goed. Pro
heb je pas nodig bij zeer complexe reasoning. De prompt dwingt JSON-output af
en vraagt om een `confidence` score, zodat je in de UI kunt waarschuwen bij
onzekere analyses.

### 3. Credit-systeem als User-velden

Credits leven op de `users` collectie (`aiPhotoCredits`, `creditsResetAt`).
Bij de eerste request van een nieuwe dag worden credits gereset naar het
plan-maximum. Upgrades naar betaald = veld-waarde aanpassen, geen
architectuur-verandering.

Credits per plan: `FREE` 5/dag · `PREMIUM` 50/dag · `PRO` 500/dag.

### 4. Food database als cache over Open Food Facts

1. Eerste check: eigen `foods` collectie (barcodes + user-added)
2. Barcode niet gevonden: Open Food Facts API → cache in eigen collectie
3. Tekst-zoek: zoek in eigen DB + OFF tegelijk, toon samengevoegd
4. AI-analyse: genereert tijdelijke items, user kan opslaan als `foods`

### 5. FSD alleen voor de frontend

Payload en zijn collections zitten *onder* de FSD-lagen — ze zijn het
"infra"-fundament. FSD regelt hoe de PWA-code zelf gestructureerd is:
`features/analyze-photo` mag `shared/lib/payload` gebruiken, maar Payload
weet niks van FSD.

### 6. Credits worden alleen afgetrokken bij succes

In `analyze-photo/route.ts` wordt de credit pas afgetrokken *na* een
geslaagde Gemini-call. Zo verliest een gebruiker geen credit door een
technische fout.

---

## Vervolgstappen

Wat er nog gebouwd moet worden (volgorde van aanpak):

1. **PWA icons genereren** (192x192, 512x512) → `public/icons/`.
   Bv. via <https://realfavicongenerator.net>.
2. **`widgets/PhotoUploader`** component die `/api/meals/analyze-photo` aanroept.
   Gebruik `<input type="file" accept="image/*" capture="environment">`.
3. **`widgets/DayLogView`** dagboek-scherm dat meals per `mealType` groepeert,
   met totaal-calorieën bovenaan.
4. **Barcode-scanner** via [`@zxing/browser`](https://github.com/zxing-js/browser).
5. **DayLog aggregaten bijwerken** via Payload `afterChange` hooks op `mealItems`.
6. **Seed Foods** met populaire Nederlandse producten (brood, zuivel, groenten).
7. **Stripe integratie** voor PREMIUM/PRO upgrades (via Payload webhook endpoint).
8. **Offline support** met TanStack Query persistentie naar IndexedDB.

### Handige VS Code extensions

- **ESLint** (dbaeumer.vscode-eslint)
- **Tailwind CSS IntelliSense** (bradlc.vscode-tailwindcss)
- **Error Lens** (usernamehw.errorlens)
- **Prettier** (esbenp.prettier-vscode)

### Nuttige links

- Next.js App Router docs: <https://nextjs.org/docs/app>
- Payload 3 docs: <https://payloadcms.com/docs>
- Payload Postgres adapter: <https://payloadcms.com/docs/database/postgres>
- Gemini API key: <https://aistudio.google.com/app/apikey>
- Gemini vision docs: <https://ai.google.dev/gemini-api/docs/vision>
- Open Food Facts API: <https://wiki.openfoodfacts.org/API>
- FSD docs: <https://feature-sliced.design/docs>
- Serwist (PWA): <https://serwist.pages.dev>
