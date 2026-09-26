# Opdater til version 6

1. Udpak ZIP-filen.
2. Åbn mappen `GitHub-upload`.
3. I GitHub-repositoriet: Code -> Add file -> Upload files.
4. Upload INDHOLDET af `GitHub-upload`, så `index.html`, `src/`, `scripts/` og `.github/` ligger i roden.
5. Commit til `main`.
6. Gå til Settings -> Secrets and variables -> Actions -> Variables.
7. `STROM_PRICE_BASIS_CONFIRMED` kan slettes. Version 6 bruger den ikke.
8. Behold `STROM_AUTH_HEADER`, `STROM_INTERVAL_MINUTES` og `STROM_PRICE_LABEL`.
9. Åbn Actions -> Udgiv Braending -> Run workflow.
10. Åbn `build -> Hent priser fra Stroemligning` og kontrollér, at prisgrundlaget verificeres automatisk.
11. Når workflowet er grønt, genindlæs GitHub Pages-siden uden cache.

Secrets `STROM_API_KEY` og `STROM_API_URL` skal blive stående og må aldrig uploades som filer.


## Version 6

Elprisoversigten er redesignet til iPhone: vandret swipe-graf, farvekodede søjler pr. time, kompakt dato/tid/pris, naturligt tidslabel som “Næste 6 døgn”, samt kort med aktuel pris og billigste time de næste 24 timer.
