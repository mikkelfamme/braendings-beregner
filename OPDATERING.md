# Opdatering til Brændings Beregner 7.0

1. Udpak ZIP-filen.
2. Åbn mappen `GitHub-upload`.
3. I GitHub: Code -> Add file -> Upload files.
4. Upload indholdet af `GitHub-upload` oven på de eksisterende filer.
5. Commit fx som `Opdater til Brændings Beregner 7`.
6. Gå til Actions -> Udgiv Braending og vent på grøn build + deploy.
7. Genindlæs appen på iPhone. Hvis den er gemt på hjemmeskærmen, luk appen helt og åbn den igen.

## Ændret
- Dato over elpriser vises nu robust som `dd.mm`, fx `26.09`.
- Titlen er ændret til `Brændings Beregner`.
- Ny funktion på fanen Billigst: vælg en dato og et program, og få dagens billigste start mellem 06.30 og 21.30.
- Kontrollen `Ved skift til vintertid` er fjernet fra brugerfladen. Appen bruger dansk tidszone og API'ets tidsstemplede prisintervaller automatisk.
