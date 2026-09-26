# Brænding

Mobilvenlig prisberegner til Cerama SC 100 med G20-20.

Version 6 bruger én fast energimodel for alle 12 fabriksprogrammer:

`7,0 kW × beregningsvarighed × 0,50 = estimeret kWh`

Elprisen kommer fra Strømligning via GitHub Actions. Appen bruger `price.total` og verificerer automatisk, at totalen matcher moms og API'ets variable priskomponenter. API-nøglen ligger kun som GitHub Secret og kommer aldrig ud til browseren.

## Funktioner

- elpris time for time øverst på alle sider
- viser mindst de næste 48 timer, når data findes, og op til ca. 7 døgn hvis feedet indeholder det
- beregn pris ud fra startdato, starttid og program
- P1-P12 fra Cerama-manualen
- billigste start i de næste 72 timer
- alternativ start mellem 06.30 og 21.30 og mindst 60 minutter fra bedste forslag
- lokal brændingshistorik på den enkelte telefon/browser
- automatisk kontrol af Strømlignings fulde variable prisgrundlag

## Prisgrundlag

For NRGi Time / Radius C bruger appen `price.total` i kr/kWh. Det inkluderer den variable elpris, moms, leverandørtillæg, systemtarif, nettarif, elafgift og distribution. Faste abonnementer fordeles ikke på en brænding.

## Datakilder

- Cerama G20-20 manual v1.2, side 17-20
- Cerama SC 100 mærkeeffekt: 7,0 kW
- Strømligning API til elpriser
- Skutt: offentlig beregningsformel med adjustment factor
- Nabertherm TOP 100: 100 liter / 7,0 kW reference

Afkøling efter programslut er ikke tidsfastsat i Cerama-manualen og bliver derfor ikke opdigtet i appen.


### Elprisgraf

Version 6 viser de tilgængelige timepriser som et vandret søjlediagram. Prisniveauer: ≤1,00 kr./kWh grøn, 1,01–2,00 gul, 2,01–3,00 rød og >3,00 mørkerød. Prognosetimer markeres med P.
