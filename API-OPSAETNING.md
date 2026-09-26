# Strømligning API · version 5

Appen bruger Strømligning til den samlede variable elpris. Version 5 verificerer automatisk prisgrundlaget i API-svaret og bruger altid `price.total`.

## GitHub Secrets

Repository -> Settings -> Secrets and variables -> Actions -> Secrets:

- `STROM_API_KEY` = din API-nøgle
- `STROM_API_URL` = GET `/api/prices`-kaldet med `{start}` og `{end}` som datopladsholdere

For jeres nuværende opsætning:

`https://stromligning.dk/api/prices?from={start}&to={end}&productId=nrgi_time&supplierId=radius_c&customerGroupId=c&forecast=true&aggregation=1h&aggregationMethod=mean`

API-nøglen må aldrig stå i URL'en eller i repository-filer.

## GitHub Variables

Repository -> Settings -> Secrets and variables -> Actions -> Variables:

- `STROM_AUTH_HEADER` = `X-API-Key`
- `STROM_INTERVAL_MINUTES` = `60`
- `STROM_PRICE_LABEL` = `NRGi Time · Radius C`
- `STROM_AUTH_PREFIX` = kan udelades/tømmes

`STROM_PRICE_BASIS_CONFIRMED` bruges ikke længere og kan slettes. Version 5 verificerer i stedet automatisk, at:

1. `price.total = price.value + price.vat`
2. `price.total` matcher summen af el, leverandørtillæg, systemtarif, nettarif, elafgift og distribution
3. enheden er `kr/kWh` eller `DKK/kWh`

Hvis den kontrol fejler, offentliggør appen ikke nye priser.

## Kontrol

Kør Actions -> Udgiv Braending -> Run workflow.

I `build -> Hent priser fra Stroemligning` skal loggen indeholde:

`Prisgrundlag verificeret automatisk: price.total matcher ...`

samt:

`Priser opdateret: ... intervaller.`
