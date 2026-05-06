# Concentrische SVG-stripes om een gedeeld middelpunt

Recept voor parallelle lijnen die diagonaal binnenkomen, een ronde bocht
maken en daarna verticaal naar beneden lopen — waarbij alle bochten
**om hetzelfde imaginaire middelpunt** wrappen (alsof ze om een bal
gaan). Inner stripe heeft de kleinste straal, elke volgende stripe is
exact één `pitch` groter.

## Idee

Geef alle stripes hetzelfde middelpunt `C`. Stripe `i` krijgt straal
`R_i = R_0 + i * pitch`. Omdat de straal per stap met `pitch` toeneemt,
blijft de loodrechte afstand tussen opeenvolgende stripes overal gelijk
aan `pitch` — zowel op het diagonale stuk als op het verticale stuk als
op de boog zelf.

```
        \
         \
          \  diagonaal (45°)
           \
            \
             '·.        ← raakpunt op diagonaal
                ╲
                 ╲
                  )    ← arc met radius R_i om C
                 ╱
            ____'      ← raakpunt op verticale
           |
           |  vertical
           |
           v
```

## Parameters

```ts
type Config = {
  bendX: number;   // x-positie van inner verticale stripe
  bendY: number;   // y-niveau waar inner stripe gaat buigen
  cornerR: number; // straal van de inner stripe
  pitch: number;   // perpendiculaire spacing tussen stripes
};
```

Het gedeelde middelpunt is dan:

```
C = (bendX - cornerR, bendY + cornerR)
```

`bendX, bendY` definiëren waar de inner stripe (i=0) overgaat van
diagonaal naar verticaal; `cornerR` bepaalt de straal van die inner
boog.

## Raakpunten

Voor stripe `i` met straal `R_i = cornerR + i * pitch`:

- **Op de diagonaal (45°):** raakpunt zit linksboven C, op de loodlijn
  van C naar de diagonaal:

  ```
  T_diag = (C.x + R_i / √2, C.y - R_i / √2)
  ```

- **Op de verticale:** raakpunt zit recht naast C op afstand R:

  ```
  T_vert = (C.x + R_i, C.y)
  ```

  De verticale stripe loopt vervolgens naar beneden vanaf x = `C.x + R_i`.

## Startpunt op de diagonaal

Diagonaal heeft richting (1,1). Kies een `startY` ver boven de viewport
(bv. -400) en bereken `startX` zodat (startX, startY) op dezelfde
diagonaal ligt als T_diag:

```
startX = T_diag.x - (T_diag.y - startY)
```

## SVG-pad

Gebruik het `A` (arc) commando — geen Q-bezier — voor een echte
cirkelboog:

```
M startX,startY
L T_diag.x,T_diag.y
A R R 0 0 1 T_vert.x,T_vert.y
L endX,endY
```

De `0 0 1` staat voor: x-axis-rotation 0, large-arc-flag 0 (kleine boog,
< 180°), sweep-flag 1 (clockwise).

## TypeScript-implementatie

```ts
const SQ2 = Math.SQRT2;

function stripePath(c: Config, i: number, viewportH: number) {
  const cx = c.bendX - c.cornerR;
  const cy = c.bendY + c.cornerR;
  const r = c.cornerR + i * c.pitch;

  const tDiagX = cx + r / SQ2;
  const tDiagY = cy - r / SQ2;
  const tVertX = cx + r;
  const tVertY = cy;

  const startY = -400;
  const startX = tDiagX - (tDiagY - startY);
  const endY = viewportH + 400;

  return `M ${startX},${startY} L ${tDiagX},${tDiagY} A ${r} ${r} 0 0 1 ${tVertX},${tVertY} L ${tVertX},${endY}`;
}
```

## Animeren met stroke-dash

Voor "tekent zichzelf"-animatie, gebruik genormaliseerde pad-lengte:

```tsx
<path
  d={stripePath(config, i, vbH)}
  stroke={color}
  strokeWidth={config.stripeW}
  fill="none"
  pathLength={1}
  strokeDasharray="1 1"
  style={{
    animation: `landing-stripe-draw ${duration}s ease-out ${delay}s both`,
  }}
/>
```

Met keyframes:

```css
@keyframes landing-stripe-draw {
  from { stroke-dashoffset: 1; } /* gap dekt pad → onzichtbaar */
  to   { stroke-dashoffset: 0; } /* dash dekt pad → zichtbaar */
}

@keyframes landing-stripe-draw-reverse {
  from { stroke-dashoffset: -1; } /* tekent vanaf het eind */
  to   { stroke-dashoffset: 0; }
}
```

`pathLength={1}` zorgt dat de animatie consistent is, ongeacht de
werkelijke lengte van het pad.

## Tips

- **ViewBox in echte pixels:** meet de gerenderde grootte met
  `ResizeObserver` en zet `viewBox="0 0 width height"`. Dan zijn
  `stripeW`, `pitch` etc. echte schermpixels in plaats van schaalbare
  units.
- **Fade-out aan eind:** gebruik een `<mask>` met linear-gradient
  (white→black in de laatste 10% van de hoogte) op de `<g>` die de
  paths bevat.
- **Variërende boogsnelheid:** geef elke stripe een eigen `duration`
  (bv. `5 + i * 0.75`) en optioneel `delay`. Mix richting (forward /
  reverse) per index voor meer beweging.
