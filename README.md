# Sofia Contracts — Intuition Fee Proxy monorepo

Monorepo for **Intuition Fee Proxy** V2 — upgradeable fee proxy + Factory + webapp.

## Structure

```
sofia-contracts/
├── packages/
│   ├── contracts/    # Solidity contracts (V1 legacy + V2 upgradeable + Factory)
│   ├── sdk/          # Shared ABIs, addresses, types
│   └── webapp/       # Vite + React Factory UI (factory.intuition.box)
├── scripts/
│   └── sync-abis.ts  # Copy compiled ABIs to SDK
├── .claude/          # Project context for AI collaboration
└── docs/             # Audit reports, announcements
```

## Requirements

- [Bun](https://bun.sh) (package manager + runtime)
- Node.js 20+ (for Hardhat compatibility)

## Install

```bash
bun install
```

## Common commands

```bash
# Compile contracts
bun contracts:compile

# Run contract tests
bun contracts:test

# Sync compiled ABIs to SDK
bun sdk:sync

# Dev server for webapp (http://localhost:3000)
bun webapp:dev

# Build webapp for production
bun webapp:build
```

## Deployments

### V1 (legacy, in production)
- Mainnet: `0x26F81d723Ad1648194FAA4b7E235105Fd1212c6c`

### V2 (in development)
- Mainnet implementation: TBD
- Mainnet Factory: TBD
- Mainnet Sofia instance: TBD

See [packages/sdk/src/addresses.ts](./packages/sdk/src/addresses.ts) for all addresses.

## License

MIT
