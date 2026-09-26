# Testresultat version 4

- 21 automatiske tests bestået lokalt.
- Alle 12 fabriksprogrammer kan bygges med én fast 50 %-model.
- P2 og P4 giver samlet 56,58 kWh i modellen.
- Prisberegning med skiftende 15-minutters intervaller testes ved overlap-integration.
- Timevisningen aggregerer 15-minutters intervaller til komplette timer.
- Manglende prisdata giver ikke et falsk totalbeløb.
- Billigste-start-funktionen søger 72 timer og kræver alternativ mellem 06.30 og 21.30, mindst 60 minutter fra bedste forslag.
- API-adaptertests bekræfter, at nøglen ikke publiceres.

Ikke testet her: brugerens konkrete Strømligning-konto eller live GitHub Actions-kørsel.
