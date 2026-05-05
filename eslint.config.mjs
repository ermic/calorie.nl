import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Sta '_'-prefix toe voor bewust-ongebruikte args/vars (bv. een
  // verplichte signature-parameter). Voorkomt dat we per-locatie
  // eslint-disable-comments moeten strooien.
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
        },
      ],
    },
  },
  // Migrations zijn auto-gegenereerd door 'payload migrate:create' met
  // een vaste destructure-signature ({ db, payload, req }). De meeste
  // migrations gebruiken alleen 'db' — geen zin in handmatige rename
  // bij elke nieuwe migration.
  {
    files: ["src/migrations/**/*.ts"],
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
