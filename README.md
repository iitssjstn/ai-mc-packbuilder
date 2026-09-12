# AI Minecraft Server Pack Builder

Eén Next.js-app (net als novapers.nl en breinplek.nl) waarmee gebruikers via
een AI-chat een compleet, downloadbaar Minecraft **Java Edition**
serverpakket laten samenstellen (plugins/mods, configuratie, branding) —
geen hosting, alleen pack-generatie.

## Architectuur

```
Gebruiker → Next.js (App Router: pagina's + API-routes in één app)
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
  AIProviderPool     Compatibility/       SQLite (Prisma)
  (Anthropic/         Dependency/
   OpenAI/Google,     Conflict Engine
   met failover)             │
                              ▼
                       PackGeneratorService
                       (synchroon in de
                        API-route, geen
                        aparte worker/Redis)
```

Kernprincipe: de AI doet uitsluitend voorstellen als gestructureerd JSON.
De backend-logica (in `src/services/`) valideert dat plan tegen de echte
registry (Minecraft-versie, server software, plugin/mod-compatibiliteit,
dependencies, conflicts) voordat er ook maar één bestand wordt aangeraakt.
De AI schrijft nooit rechtstreeks bestanden en voert nooit shell-commands uit.

**Bewuste keuze t.o.v. een eerdere Express+worker-versie van dit project:**
pack-generatie draait nu synchroon in de `POST /api/packs/[id]/generate`
route — geen Redis/BullMQ/apart workerproces meer. Dat past bij de eenvoud
van de novapers/breinplek-stack. Trade-off: de request blijft "hangen"
zolang een pack genereert (doorgaans enkele seconden). Zet de reverse-proxy
timeout (Nginx Proxy Manager) op minstens 120s voor deze route.

## Projectstructuur

```
/src/app            Next.js App Router — pagina's (builder, packs, account, admin)
/src/app/api         API-routes (auth, ai, minecraft, packs, admin, health)
/src/services        Alle kernlogica: AI-providerpool, compatibility/dependency/
                      conflict-engine, pack-generator, auth, registry, branding
/src/lib             Gedeelde utilities: prisma, env, sessies, rate-limiting,
                      path/URL/image-veiligheid
/src/components      UI-componenten
/prisma              Database-schema
/deploy              VPS-deploy-snippet (GitHub als build-context)
```

## Deployen via GitHub (zelfde patroon als novapers.nl / breinplek.nl)

Docker bouwt rechtstreeks vanaf de GitHub-repo — geen upload naar de VPS,
geen Actions, geen GHCR. De enige stap die bij jou blijft: `git push`.

**SQLite: geen aparte database, geen wachtwoord, geen secrets.** De
database is gewoon een bestand in de data-map van de container. Het
JWT-secret en de encryptiesleutel genereert de app zelf bij de eerste
start en bewaart ze in diezelfde map — je hoeft nergens iets voor in te
vullen of aan te maken.

**`deploy/docker-compose.vps.yml`** — plak het onder `services:` in je
gedeelde `~/npm/docker-compose.yml`, naast novapers/breinplek. Vul alleen
`APP_URL` in.

```bash
cd ~/npm
docker compose build --no-cache ai-mc-packbuilder
docker compose up -d
docker system prune -f
```

Stel in Nginx Proxy Manager een proxy host in naar `ai-mc-packbuilder:3000`
(timeout ≥120s — pack-generatie loopt synchroon in de request).

## Installatie via Docker (lokaal)

```bash
docker compose up -d --build
```

Dat is letterlijk alles. Open **http://localhost:3000** — de rest
(owner-setup, AI-provider-keys, plugin-versies, packs) gaat volledig via
de website.

## Installatie (lokaal, zonder Docker)

Ook hier geen configuratie nodig — SQLite en de auto-gegenereerde secrets
werken hetzelfde als in Docker, met `./data` als standaardmap.

```bash
npm install
npx prisma db push
npm run seed     # vult starter-plugins (met placeholder download-URLs)
npm run dev      # http://localhost:3000
```

## Pack-flow (3 stappen)

1. `POST /api/packs` — maakt een DRAFT-pack van een bevestigd AI-plan
2. `POST /api/packs/[id]/logo` — optioneel, alleen mogelijk zolang de pack nog DRAFT is
3. `POST /api/packs/[id]/generate` — valideert alles opnieuw en genereert
   de ZIP **synchroon**; de response komt pas terug als het pack klaar
   (of mislukt) is.

## AI-providers

`AIProviderPool` probeert providers in de volgorde van `AI_PROVIDER_ORDER`,
met key-rotatie en cooldown bij rate-limits binnen elke provider.

**Keys beheer je via de website.** Ga naar **Admin → AI-providers**
(owner-only) om keys per provider te plakken/wissen en de volgorde aan te
passen — versleuteld (AES-256-GCM) opgeslagen in de database, wijzigingen
gelden meteen. Er is geen bootstrap-bestand meer nodig: maak eerst je
owner-account aan via **Account**, en stel daarna direct via **Admin** een
key in.

## Registry & echte downloads

De seed-data (`src/registry/seed.ts`) bevat 5 bekende plugins, maar
**zonder** echte download-URL of checksum. `PluginDownloadService` weigert
een plugin te bundelen zolang er geen `downloadUrl` + geverifieerde
`checksum` in de registry staat. Dit vul je volledig via de website in:
**Admin → Plugin-versie toevoegen** — alleen hosts uit de allowlist in
`PluginDownloadService.ts` worden geaccepteerd.

## Security-maatregelen (samenvatting)

- Wachtwoorden: bcrypt, 12 rounds
- Sessies: JWT in HttpOnly/SameSite=lax cookie (Secure in productie)
- Rate limiting: in-memory (geen Redis nodig — single-instance deploy)
- Pad-veiligheid: elke bestandsschrijfactie loopt door `safeResolve` +
  `assertNotSymlink` (ZIP Slip / path traversal / symlink-bescherming)
- Download-veiligheid: host-allowlist + DNS-check tegen private ranges
  (SSRF), SHA-256 checksum-verificatie vóór bundelen
- Downloads van packs: ownership-check server-side, geen voorspelbare URL's
- Secrets: JWT-secret en encryptiesleutel worden door de app zelf
  gegenereerd en in de data-volume bewaard — nergens handmatig aan te
  maken of te configureren. AI-provider-keys versleuteld in de database
  i.p.v. als env var — zie AI-providers hierboven
- Audit log: admin-acties gelogd, nooit wachtwoorden/tokens/keys

## Testen

```bash
npm test
```

**45 tests, 7 bestanden, allemaal groen** (geverifieerd in deze sessie):
- `pathSafety.test.ts`, `imageValidation.test.ts`, `urlSafety.test.ts`,
  `DependencyService.test.ts` — ongewijzigd overgezet
- `secrets.test.ts` — bestand-fallback, prioriteit bestand-boven-env-var,
  `DATABASE_URL`-opbouw uit losse velden
- `encryption.test.ts` — round-trip, willekeurige IV per keer, fout bij
  ontbrekende/te korte `ENCRYPTION_KEY`, fout bij verkeerde sleutel
- `AiSettingsService.test.ts` — database-waarde wint van env-fallback,
  gemaskeerde weergave lekt nooit de volledige key, wissen verwijdert de
  rij i.p.v. een lege waarde op te slaan

Let op: `npx prisma generate` en de Google Fonts-fetch tijdens `next build`
konden in de ontwikkelsandbox van deze sessie niet draaien (netwerk-
beperkingen van die sandbox — `binaries.prisma.sh` en
`fonts.googleapis.com` waren niet bereikbaar). Daarom gebruikt dit project
systeemfonts in plaats van `next/font/google` (geen build-time
netwerkafhankelijkheid, ook praktischer). De rest van de build is wel
geverifieerd: volledige TypeScript-compilatie en een geslaagde
`next build` (met build-time-placeholder env-variabelen, zoals ook in de
Dockerfile). Onderweg ook een echte bug gevonden: Vitest kent Next.js'
`@/*`-path-alias niet uit zichzelf — `vitest.config.ts` lost dat nu op.

## Status

Dit is een architectuur-omzetting van een eerdere Express+worker-versie
naar één Next.js-app. De kernlogica (compatibility/dependency/conflict-
engine, pack-generator, AI-providerpool, auth, registry, branding) is
vrijwel ongewijzigd overgenomen en opnieuw getest. Nog niet gedaan:
mod-registry-UI, S3/backup-verhaal, en de bredere testsuite voor
database-afhankelijke integratiepaden (compatibility/conflict/auth) —
zie de originele projectgeschiedenis voor de volledige status.
