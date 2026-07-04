# Standardiserad Agentprocedur

För att säkerställa högsta kvalitet och konsekvens vid utvecklingen av "Tåg across Stockholm"-plattformen, MÅSTE alla agenter (AI-assistenter) strikt följa denna procedur.

## 1. Planering (Implementation Plan)
* Innan några kodändringar genomförs, ska en `.md` fil med en detaljerad implementationsplan skapas i mappen `docs/plans/`.
* Planen ska innehålla vilka filer som ska ändras, läggas till eller tas bort, samt arkitekturval.

## 2. Implementation
* Utför de kodändringar som beskrevs i planen.
* Följ projektets etablerade stil och arkitektur (Frontend i Vite/React, Backend i Node.js).
* Skriv ren och väldokumenterad kod.

## 3. Verifikation (Audit) & Dev Server
* Applikationen MÅSTE testas lokalt i en utvecklingsmiljö via Docker.
* Efter ändringar, starta om dev-servern med `docker-compose restart` (eller kör upp den med `docker-compose up -d --build` om den är nere).
* Verifiera att de implementerade funktionerna uppfyller kraven enligt specifikationen och fungerar i Docker-miljön innan vidare steg tas.
* Säkerställ att koden bygger utan fel.

## 4. Arkivering
* När ändringarna är verifierade, flytta/arkivera implementationsplanen (`.md`-filen) till `docs/archive/`.

## 5. Deployment och Dokumentation
* Generera ett kommando för hur ändringarna distribueras till Nginx-webbservern och leverera det till användaren i chatten.
* Uppdatera relevant dokumentation (exempelvis API-docs eller README) så att de speglar de nya ändringarna.

## 6. Git Push
* Samla alla ändringar i en commit.
* Kör `git add .`
* Kör `git commit -m "[Kort beskrivning av ändringen]"`
* Kör `git push`
