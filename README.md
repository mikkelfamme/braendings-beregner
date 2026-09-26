# Brænding

Mobilvenlig prisberegner til Cerama SC 100 med G20-20.

Version 4 bruger én fast energimodel for alle 12 fabriksprogrammer:

`7,0 kW × beregningsvarighed × 0,50 = estimeret kWh`

Elprisen kommer fra Strømligning via GitHub Actions. API-nøglen ligger kun som GitHub Secret og kommer aldrig ud til browseren.

## Funktioner

- elpris time for time øverst på alle sider
- viser mindst de næste 48 timer, når data findes, og op til ca. 7 døgn hvis feedet indeholder det
- beregn pris ud fra startdato, starttid og program
- P1-P12 fra Cerama-manualen
- billigste start i de næste 72 timer
- alternativ start mellem 06.30 og 21.30 og mindst 60 minutter fra bedste forslag
- lokal brændingshistorik på den enkelte telefon/browser

## Datakilder

- Cerama G20-20 manual v1.2, side 17-20
- Cerama SC 100 mærkeeffekt: 7,0 kW
- Strømligning API til elpriser
- Skutt: offentlig beregningsformel med adjustment factor
- Nabertherm TOP 100: 100 liter / 7,0 kW reference

Afkøling efter programslut er ikke tidsfastsat i Cerama-manualen og bliver derfor ikke opdigtet i appen.
