# NEVO-autocomplete specs — typeahead op item-naam

Detail-specificatie voor een live-suggestie typeahead op het naamveld van [MealItemEditor](src/entities/meal/ui/MealItemEditor.tsx). Elke (debounced) keystroke vraagt suggesties op uit de `nutrientcontent`-microservice; bij selectie worden naam, `nevoCode` en geschaalde macro's ingevuld.

Volgt FSD-volgorde zoals [NEVO_ANALYSIS_SPECS.md](NEVO_ANALYSIS_SPECS.md): `shared → entities → app/api`. Geen feature-laag nodig — de typeahead is een editor-affordance van de meal-entity en wordt door zowel de photo- als manual-flow geconsumeerd.

---

## 1. Doelen & non-doelen

**Doel**
- Tijdens het typen van een ingrediëntnaam direct kandidaten uit NEVO laten zien (top 8, NL-namen).
- Selectie vult naam + `nevoCode` + geschaalde kcal/eiwit/koolh./vet uit de NEVO-tabel.
- `quantity`-aanpassing rescaled de macro's lineair (geen extra round-trip) zolang de NEVO-baseline bekend is.
- Reset-knop zet handmatig bewerkte macro's terug naar de NEVO-waarden voor de huidige `quantity`.
- Werkt identiek in beide add-meal-flows (photo + manual) zonder hun parent-componenten aan te passen.
- Save-pad blijft ongewijzigd: per-100g cache leeft alleen in de editor-state; alleen `name/quantity/macros` worden gepost.

**Non-doel**
- Een generieke Combobox-primitive in `shared/ui` (alleen bouwen wanneer een tweede consumer concreet is).
- Server-side fuzzy/synonym-matching met Gemini-fallback — dat woont in `/api/nevo/match` voor de photo-pipeline, hier blijven we bij directe full-text NEVO-search.
- Suggesties uit Open Food Facts of de lokale `foods`-collectie (die blijven achter `/api/foods/search` voor de manual-flow's `FoodSearch`).

---

## 2. Architectuur

```
                ┌────────── browser ──────────┐
                │                             │
  keystroke ──► useNevoSearch (debounce 250ms, q≥2)
                │   ↓ GET /api/nevo/search?q= │
                ├──────────────────────────────┼──► 127.0.0.1:5555  GET /foods?q=&lang=nl&limit=8
                │   ↑ { results: [{nevoCode, nameNl, foodGroupNl}] }
                │                             │
  pick ───────► useNevoLookup (mutation)
                │   ↓ POST /api/nevo/calculate│
                ├──────────────────────────────┼──► 127.0.0.1:5555  POST /calculate + GET /foods/{code}
                │   ↑ { items: [{kcal, protein_g, carbs_g, fat_g}] }
                │                             │
                └─► onChange-patch met name + nevoCode + macros
```

Hergebruikt `/api/nevo/calculate` (bestaande proxy) zodat we geen tweede macro-pad introduceren. Alleen `/api/nevo/search` is nieuw — een dunne proxy op `searchFoodsCached()` uit [shared/api/nutrientcontent.ts](src/shared/api/nutrientcontent.ts).

---

## 3. Datamodel

We hergebruiken `nevoCode?: number` op [EditableMealItem](src/entities/meal/model/types.ts) (bestaat al sinds de NEVO-pipeline) en voegen één optioneel veld toe.

### 3.1 [EditableMealItem.nevoPer100g](src/entities/meal/model/types.ts) (nieuw)

```ts
export type NevoPer100g = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};
```

Wordt gezet zodra de gebruiker een suggestie heeft gekozen en de lookup is geslaagd. Driver voor:
- **quantity-rescale**: bij elke `quantity`-keystroke schalen we macro's lineair `per100g * quantity / 100`.
- **reset**: de RefreshCw-knop in de editor brengt `calories/protein/carbs/fat` terug naar `scale(per100g, quantity)` — handig nadat de gebruiker handmatig heeft gerommeld en weer naar de baseline wil.

`nevoPer100g` leeft alleen in de editor-state. De save-route ([src/app/api/meals/save](src/app/api/meals/save)) krijgt enkel `name/quantity/unit/calories/protein/carbs/fat` en weet niets van per-100g — geen DB-migratie nodig.

### 3.2 Suggestion-type (nieuw, in `entities/meal/api`)

```ts
export type NevoSuggestion = {
  nevoCode: number;
  nameNl: string;
  foodGroupNl: string;
};
```

---

## 4. Routes

### 4.1 [src/app/api/nevo/search/route.ts](src/app/api/nevo/search/route.ts) (nieuw)

```
GET /api/nevo/search?q=<string>&limit=<1..20>
```

- `runtime = 'nodejs'`
- Auth: Payload-sessie (zelfde patroon als `/api/nevo/match`). 401 zonder user.
- Validatie: `q` getrimd, lengte 2..100 → buiten bereik = `200 { results: [] }` (geen 4xx, voorkomt typeahead-flicker bij wissen).
- `limit` clamped 1..20, default 8.
- Body: `{ results: NevoSuggestion[] }`.
- Errors:
  - 503 `{ error: 'NEVO_UNAVAILABLE' }` bij `NutrientContentError`.
  - 500 bij onverwachte exceptions.
- Geen rate-limiting in v1 — `searchFoodsCached` (10min TTL, 200 entries) absorbeert herhaalde queries van dezelfde user.

### 4.2 Hergebruik `/api/nevo/calculate`

Bij selectie roepen we de bestaande `POST /api/nevo/calculate` aan met één item: `{ nevoCode, grams: max(item.quantity, 1) }`. Geen wijzigingen aan die route.

---

## 5. Hooks

### 5.1 [src/entities/meal/api/useNevoSearch.ts](src/entities/meal/api/useNevoSearch.ts) (nieuw)

```ts
useNevoSearch(query: string)
  → useQuery({ queryKey: ['nevo','search', q], staleTime: 5*60_000, retry: 0,
              placeholderData: keepPreviousData, enabled: q.length >= 2 })
```

Caller doet de debounce (zie 6.1). Hook zelf is "dom" — gegeven `query` direct fetchen.

### 5.2 [src/entities/meal/api/useNevoLookup.ts](src/entities/meal/api/useNevoLookup.ts) (nieuw)

```ts
useNevoLookup()
  → useMutation<NevoPer100g, Error, { nevoCode }>
```

Roept altijd `/api/nevo/calculate` aan met `grams=100` en geeft per-100g-macro's terug. De editor cached die in `EditableMealItem.nevoPer100g` en doet quantity-rescaling lineair op de client — geen tweede round-trip per keystroke. Geen retries (zou de ervaren latency verdubbelen).

---

## 6. UI

### 6.1 [src/entities/meal/ui/NevoNameAutocomplete.tsx](src/entities/meal/ui/NevoNameAutocomplete.tsx) (nieuw)

Gecontroleerde component. Props:

```ts
type Props = {
  value: string;
  onChange: (next: string) => void;       // pure tekst-edit (gebruiker typt)
  onPick: (s: NevoSuggestion) => void;    // gebruiker kiest een suggestie
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
};
```

**Gedrag**
- Interne state: `debounced` (250ms achter `value` aan), `open` (boolean), `activeIndex` (number).
- Toont een dropdown wanneer `open && results.length > 0`. Sluit bij blur (met 100ms grace voor klik), Escape, of selectie.
- Pijltjes ↑/↓ verplaatsen `activeIndex`; Enter selecteert; Tab sluit zonder selectie.
- Loading-spinner in de `suffix` van de Input zolang `isFetching`.
- Lege query of <2 tekens → geen dropdown, geen request (gestuurd door `enabled` in de hook).
- Dropdown rendert NL-naam + kleine `food_group_nl` als secundaire tekst.
- ARIA: `role="combobox"` op input, `aria-expanded`, `aria-controls`, `aria-activedescendant`. Lijst krijgt `role="listbox"`, items `role="option"` met `aria-selected`.

**Niet inbegrepen**
- Geen virtualisatie (max 8 items).
- Geen keyboard `Home`/`End`/`PageDown` shortcuts.
- Geen "geen resultaten"-melding in de dropdown — bij 0 hits collapsed de popover (consistent met een rustige UI tijdens snel typen).

### 6.2 [src/entities/meal/ui/MealItemEditor.tsx](src/entities/meal/ui/MealItemEditor.tsx) (refactor)

Vervang de naam-`<Input>` door `<NevoNameAutocomplete>` en intercept de `quantity`-onChange. Drie paden voor name-input:

1. **Vrij typen** — `onPick` niet aangeroepen → `onChange({ clientId, name })`. `nevoCode` en `nevoPer100g` blijven staan (bewust: een typo na een eerdere pick mag de match niet verliezen voordat de gebruiker actief iets anders kiest).
2. **Suggestie kiezen** — `onPick(suggestion)` → eerst `onChange({ name, nevoCode })`, daarna `useNevoLookup.mutate({ nevoCode })` met `grams=100`. Op success patcht de editor `nevoPer100g` + `scale(per100g, quantity)`. Als `quantity` nog 0 was, wordt hij naar 100g gezet zodat de macro's niet 0 zijn.
3. **Quantity-keystroke** — `onChange({ quantity, ...scale(nevoPer100g, quantity) })` indien `nevoPer100g` aanwezig; anders alleen `quantity`. Lineaire schaling, geen network-roundtrip.

**Reset-knop** (RefreshCw-icoon, alleen zichtbaar als `nevoPer100g` is gezet). Click → `onChange({ ...scale(nevoPer100g, quantity) })`. Brengt `calories/protein/carbs/fat` terug naar de NEVO-baseline; `quantity`/`name`/`nevoCode` blijven staan.

**Foutpaden**
- Search 401 (sessie verlopen) — dropdown blijft leeg, geen alert (de globale auth-flow handled dit elders al).
- Search 503 — idem; we crashen de editor niet voor een fall-through op een veld dat ook handmatig werkt.
- Calculate 422/503 op pick — name+nevoCode blijven staan; `nevoPer100g` wordt niet gezet, dus geen rescale en geen reset-knop. Acceptabele degradatie: gebruiker vult zelf in.

---

## 7. Bestandslijst

**Nieuw**
- `src/app/api/nevo/search/route.ts`
- `src/entities/meal/api/useNevoSearch.ts`
- `src/entities/meal/api/useNevoLookup.ts`
- `src/entities/meal/ui/NevoNameAutocomplete.tsx`
- `NEVO_AUTOCOMPLETE_SPECS.md` (dit document)

**Aangepast**
- `src/entities/meal/ui/MealItemEditor.tsx` — naamveld vervangen door autocomplete.
- `src/entities/meal/index.ts` — geen verplichte export-changes; alleen indien we `NevoSuggestion` extern willen exposen (V2).

---

## 8. Open follow-ups (V2+)

- Match de typed-text tegen de eerder gekozen NEVO-naam: bij significante divergentie → `nevoCode` + `nevoPer100g` clearen zodat een half-overlappende naam niet onbedoeld blijft schalen.
- Eigen "manual"-suggestie-bron toevoegen die ook lokale `foods` (Payload-collectie) en OFF-barcodes meeweegt — vergt dan wel een `Combobox`-primitive in `shared/ui`.
- Per-100g cache persistent maken (bv. opslaan op `MealItem` in de DB) zodat reset/rescale ook werkt na herladen van een opgeslagen maaltijd.
