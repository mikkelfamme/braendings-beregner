# Opdater til version 4

1. Udpak ZIP-filen.
2. Åbn mappen `GitHub-upload`.
3. I GitHub-repositoriet: Code -> Add file -> Upload files.
4. Upload INDHOLDET af `GitHub-upload`, så fx `index.html`, `src/` og `.github/` ligger i roden.
5. Commit til `main`.
6. Åbn Actions og vent på `Udgiv Braending`.
7. Når workflowet er grønt, genindlæs GitHub Pages-siden uden cache.

Eksisterende Strømligning Secrets/Variables genbruges. API-nøglen må aldrig uploades som fil.
