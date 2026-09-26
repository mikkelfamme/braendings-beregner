# Testresultat · version 6

Kørt lokalt 26. september 2026.

## Automatiske tests

24 tests bestået uden fejl.

Kontrollerne dækker bl.a.:

- alle 12 fabriksprogrammer
- fast 7,0 kW × programtid × 0,50-model
- P2/P4-referenceberegningen
- tidsvægtning af skiftende elpriser
- manglende prisintervaller
- timevisning
- 72-timers billigste-start søgning og alternativ 06.30-21.30
- `price.total` fra Strømligning
- forecast-markering
- automatisk prisgrundlagsverificering
- `price.total = price.value + price.vat`
- `price.total` = summen af el, tillæg, systemtarif, nettarif, elafgift og distribution
- kontrol af produkt `nrgi_time`, netselskab `radius_c` og kundegruppe `c`
- ingen krav om `STROM_PRICE_BASIS_CONFIRMED`
- sikker fejltilstand ved 403/429, manglende credentials eller ændret tarif
- ingen API-nøgle i publiceret prisfil eller testlog

Den faktiske GitHub Action mod brugerens Strømligning-konto skal stadig køres efter upload for at bekræfte live-forbindelsen.
