// Stub voor `server-only` in Vitest (Node-runtime). De echte module gooit
// bij import; in tests willen we dat juist NIET — we toetsen server-side
// modules vanuit Node, niet uit een client-component.
export {};
