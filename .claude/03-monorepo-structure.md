# Structure monorepo — Bun workspaces + Vite

## Stack

- **Bun** comme package manager et workspace manager
- **Vite + React 18 + TypeScript** pour la webapp
- **Hardhat + TypeScript** pour les contrats (conservé)
- **SDK partagé** : ABIs + addresses + types générés

## Arborescence cible

```
sofia-fee-proxy/                          # Root (renommer ? à décider)
├── package.json                          # Bun workspaces
├── bun.lockb
├── tsconfig.base.json                    # Config TS partagée
├── .gitignore
├── .claude/                              # Ce dossier
├── docs/
│   ├── AUDIT_V2.md
│   └── V2_ANNOUNCEMENT.md
│
├── packages/
│   ├── contracts/                        # Hardhat
│   │   ├── src/
│   │   │   ├── SofiaFeeProxy.sol         # V1 (conservé pour référence)
│   │   │   ├── SofiaFeeProxyV2.sol       # V2 (nouveau)
│   │   │   ├── SofiaFeeProxyFactory.sol  # Factory (nouveau)
│   │   │   ├── interfaces/
│   │   │   │   ├── IEthMultiVault.sol
│   │   │   │   └── ISofiaFeeProxyV2.sol  # Nouveau
│   │   │   ├── libraries/
│   │   │   │   └── Errors.sol            # Étendu
│   │   │   └── test/
│   │   │       └── MockMultiVault.sol
│   │   ├── test/
│   │   │   ├── SofiaFeeProxy.test.ts     # V1 (garder)
│   │   │   ├── SofiaFeeProxyV2.test.ts   # Nouveau
│   │   │   └── SofiaFeeProxyFactory.test.ts  # Nouveau
│   │   ├── scripts/
│   │   │   ├── deploy-v2-impl.ts
│   │   │   ├── deploy-v2-factory.ts
│   │   │   ├── deploy-v2-instance.ts
│   │   │   └── upgrade-v2-instance.ts
│   │   ├── hardhat.config.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   ├── sdk/                              # Partage contrats ↔ webapp
│   │   ├── src/
│   │   │   ├── abis/                     # Copiés automatiquement
│   │   │   │   ├── SofiaFeeProxyV2.json
│   │   │   │   └── SofiaFeeProxyFactory.json
│   │   │   ├── addresses.ts              # Par chain
│   │   │   ├── types.ts                  # Types partagés
│   │   │   └── index.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── webapp/                           # Vite + React
│       ├── src/
│       │   ├── App.tsx
│       │   ├── main.tsx
│       │   ├── pages/
│       │   │   ├── Home.tsx
│       │   │   ├── Deploy.tsx
│       │   │   ├── MyProxies.tsx
│       │   │   └── ProxyDetail.tsx
│       │   ├── components/
│       │   │   ├── DeployForm.tsx
│       │   │   ├── ProxyCard.tsx
│       │   │   ├── WithdrawModal.tsx
│       │   │   └── ConnectWallet.tsx
│       │   ├── hooks/
│       │   │   ├── useDeployProxy.ts
│       │   │   ├── useMyProxies.ts
│       │   │   └── useProxyStats.ts
│       │   └── lib/
│       │       ├── wagmi.ts
│       │       └── chains.ts
│       ├── index.html
│       ├── vite.config.ts
│       ├── tsconfig.json
│       └── package.json
```

## Config root

**package.json** :
```json
{
  "name": "sofia-fee-proxy",
  "private": true,
  "workspaces": ["packages/*"],
  "scripts": {
    "contracts:compile": "bun --cwd packages/contracts run compile",
    "contracts:test": "bun --cwd packages/contracts run test",
    "sdk:build": "bun --cwd packages/sdk run build",
    "webapp:dev": "bun --cwd packages/webapp run dev",
    "webapp:build": "bun --cwd packages/webapp run build",
    "sync:abis": "bun scripts/sync-abis.ts"
  }
}
```

## Synchronisation ABIs

Script `scripts/sync-abis.ts` qui après compile Hardhat :
1. Lit `packages/contracts/artifacts/src/*.sol/*.json`
2. Extrait le champ `abi`
3. Écrit dans `packages/sdk/src/abis/*.json`
4. Regenère `packages/sdk/src/index.ts` avec les exports

Hook post-compile dans Hardhat pour automatiser.

## Dépendances workspace

**packages/webapp/package.json** :
```json
{
  "dependencies": {
    "@sofia/sdk": "workspace:*",
    "react": "^18.3.0",
    "wagmi": "^2.x",
    "viem": "^2.x",
    "@rainbow-me/rainbowkit": "^2.x",
    "@tanstack/react-query": "^5.x",
    "react-router-dom": "^6.x"
  }
}
```

## Migration depuis sofia-contracts actuel

**Plan de migration** :
1. Créer un nouveau dossier `sofia-fee-proxy/` à côté
2. `git init` + importer l'historique depuis `sofia-contracts` si possible
3. Bouger tout le code actuel dans `packages/contracts/`
4. Créer `packages/sdk/` vide
5. Créer `packages/webapp/` avec Vite scaffolding
6. Tester que `bun contracts:compile` et `bun contracts:test` fonctionnent
7. Commit initial, push

**Alternative** : restructurer `sofia-contracts/` in-place sans changer d'URL repo.

## Questions de migration

- **Nom du repo final** : `sofia-fee-proxy` ? `sofia-contracts` ? Autre ?
- **Historique git** : conserver tel quel ou repartir de zéro ?
- **Webapp dans ce monorepo** ou dans `sofia-core/` ?

→ À valider avant la restructuration.
