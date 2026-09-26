# Testresultat - Brændings Beregner 7.0.0

- 28 automatiske Node-tests bestået.
- Alle 12 fabriksprogrammer bygger med samme energimodel.
- Prisparser bruger `price.total` og bevarer forecast-markering.
- Datoformatet er gjort robust til `dd.mm` med nul-foranstillede tal.
- Den nye dagsoptimering søger kun starter fra 06.30 til 21.30 på den valgte danske kalenderdato.
- Manglende prisdækning giver ikke et opdigtet prisforslag.
- JavaScript-syntaks er valideret efter build.
- Build til GitHub Pages er gennemført lokalt uden credentials i outputtet.
