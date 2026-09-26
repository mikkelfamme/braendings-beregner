# Strømligning API

Appen bruger Strømligning til den samlede variable elpris. Kittec bruges ikke som elpris-API.

## GitHub Secret

Repository -> Settings -> Secrets and variables -> Actions -> Secrets:

- `STROM_API_KEY` = din API-nøgle
- `STROM_API_URL` = det fungerende GET `/api/prices`-kald fra Strømlignings Swagger, inklusive jeres prisområde, produkt/elaftale, netselskab/tarif, aggregation og eventuel forecast-parameter. Brug `{start}` og `{end}` som datopladsholdere i URL'en.

API-nøglen må ikke stå i URL'en.

## GitHub Variables

Repository -> Settings -> Secrets and variables -> Actions -> Variables:

- `STROM_AUTH_HEADER` = den header Strømligning kræver, fx `X-API-Key`
- `STROM_AUTH_PREFIX` = normalt tom, medmindre dokumentationen kræver fx `Bearer `
- `STROM_INTERVAL_MINUTES` = `15` eller `60`
- `STROM_PRICE_LABEL` = fx navnet på jeres elaftale
- `STROM_PRICE_BASIS_CONFIRMED` = `true` først når du har bekræftet, at `price.total` er DKK/kWh og indeholder den samlede variable pris inkl. moms og relevante tariffer/tillæg

Workflowet kører hver time. Hvis API-kaldet indeholder forecast-data, kan appen vise mere end de næste 48 timer og bruge disse til 72-timers optimeringen. Prognoser markeres i appen.

## Kontrol

Kør workflowet manuelt via Actions -> Udgiv Braending -> Run workflow. Appen skal derefter vise timepriser øverst. Hvis ikke, læs loggen for trinnet `Hent priser fra Stroemligning`.
