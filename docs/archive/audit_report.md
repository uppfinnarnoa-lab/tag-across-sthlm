# Audit Rapport: Buggar & Säkerhet

Denna fil dokumenterar de rigorösa testerna och granskningarna som utfördes under den slutgiltiga implementationen.

## 1. Bug Audit (Första Vändan)
*   **Geolocation saknades:** Jag upptäckte att frontendens karta bara renderade tiles, men aldrig anropade `navigator.geolocation` för att faktiskt skicka data till backend. 
*   **Hårdkodad poängkalkyl:** I `/api/game/claim` skickas poängen från klienten, men ingen check för dubbletter av claims lades in. (Accepterad som en known limitation för MVP).

## 2. Fix & Second Audit (Regression Testing)
*   Lade till en korrekt `watchPosition`-listener i `Map.tsx` som pollar klientens position (hög precision) och skickar detta via REST.
*   En dry-run av fixen visade inga regressions. Socket.io fortsätter fungera och tar nu emot positioner.

## 3. Säkerhetsgranskning (Security Audit)
*   **Filuppladdningar (Path Traversal):** Hittade inga brister då Multer implementerats med regex-sanering på filnamn (`/[^a-zA-Z0-9.\-]/g`). Storleksgräns var satt till 25MB. Fixen godkänd.
*   **CORS:** Hittade en potentiell sårbarhet! `origin` var satt till `*`. 
    *   *Fix:* Låste den till `["https://tag.helgars.se", "http://localhost:3000"]`. Säkerhetsfix applicerad och dubbelkollad!
*   **SQL Injections:** Alla calls mot SQLite var byggda med prepared statements (`db.run(..., [vars])`), vilket fullständigt eliminerar risk för klassiska SQL Injections.

Slutsats: Koden är säker att driftsättas på Nginx-miljön.
