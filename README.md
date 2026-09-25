# Brænding - GitHub-udgave 2.0

Statisk familieapp til beregning af keramikbrændingers elpris. Ingen Vercel, server, database eller login. Alle med linket kan bruge appen. Historik og egne programændringer gemmes kun i den enkelte browser, ikke i GitHub. Der er ingen automatisk synkronisering.

## Udgivelse

1. Settings > Pages > Build and deployment > Source: GitHub Actions.
2. Upload indholdet af denne mappe til repositoryets rod. index.html og .github/workflows/pages.yml skal ligge direkte på de stier.
3. Fanen Actions: se workflowet Udgiv Braending. build og deploy skal blive grønne.
4. Settings > Pages viser det faktiske app-link.

Ingen API-nøgle er nødvendig til første udgivelse. Beregneren begynder med manuel pris og tomt forbrug. Test med 1 kWh og 2 kr./kWh: resultatet skal blive 2,00 kr.

## Privatliv og begrænsninger

Siden er offentlig. Koden indeholder ikke en API-nøgle. Noter og eksportfiler skal ikke uploades til repositoryet. Eksport indeholder op til 40 gemte beregninger. Der er ikke import, fælles login, automatisk historiksynkronisering, pushbeskeder, offline-service-worker eller ovnstyring i denne udgave.

Programtider er fra den tidligere uploadede G20-20-manual side 17. Egne kWh-tal skal indtastes. Uden tidsprofil fordeles forbruget jævnt, og starttidsoptimeringen er et estimat. Appen stopper en samlet beregning ved manglende priser. P4 må ikke bruges til lertøj.

## API - senere trin

scripts/update-prices.mjs er forberedt, men IKKE testet mod Mikkels konkrete API-adgang. Den forudsætter et prices-array med date inklusive tidszone og price.total. Et andet format kræver tilpasning. API-kald, header, interval og samlet pris inklusive moms/tariffer skal verificeres, før STROM_VERIFIED sættes til true.

Opret senere i Settings > Secrets and variables > Actions:

Secrets: STROM_API_KEY og STROM_API_URL. URL er jeres verificerede endpoint uden nøglen. Kun HTTPS til stromligning.dk/api/prices accepteres. Den kan bruge {date}, {start} og {end}, hvis API-parametrene understøtter det. Start/end dækker dansk midnat fra to dage tilbage til to dage frem.

Variables: STROM_AUTH_HEADER (verificeret headernavn), STROM_AUTH_PREFIX (kun hvis nødvendigt), STROM_INTERVAL_MINUTES (15 eller 60) og STROM_VERIFIED (true først efter kontrol). Indsæt ikke noget endnu blot for at få et grønt workflow.

STROM_VERIFIED betyder, at price.total er kontrolleret som den samlede variable pris i DKK/kWh inkl. moms, ikke kun spotpris. Appen lægger ikke moms til igen. Faste abonnementer er ikke med.

Efter aktivering forsøges prisopdatering hver time. Planlagte Actions kan blive forsinket eller deaktiveret efter GitHubs inaktivitetsregler. Appen viser hentetid. Hvis opdatering fejler, stopper workflowet; den sidst udgivne side bliver stående. Der er ikke et permanent prisarkiv: kun de intervaller, det aktuelle verificerede API-kald returnerer, er tilgængelige.

## Udvikling

Node 22 eller nyere. Ingen npm-afhængigheder. npm test kører motorens test, npm run build genererer index.html og dist/. Rediger src/, ikke den genererede index.html.

GitHub-dokumentation:
https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages

Prisdata krediteres Strømligning i brugerfladen. API-adapterens format og kontoens gældende vilkår skal kontrolleres inden aktivering:
https://stromligning.dk/artikler/elpris-api
https://stromligning.dk/api/docs/
