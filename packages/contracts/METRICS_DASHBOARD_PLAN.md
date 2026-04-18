# Sofia Metrics Dashboard - Plan

## Objectif

Créer un outil pour visualiser les métriques du SofiaFeeProxy :
- Nombre de transactions
- Frais collectés
- Volume de dépôts
- Utilisateurs actifs

## Architecture

```
sofia-contracts/
├── dashboard/
│   ├── index.html          # Frontend simple (vanilla JS ou React)
│   ├── src/
│   │   ├── metrics.ts      # Logique de récupération des métriques
│   │   ├── charts.ts       # Visualisation (Chart.js)
│   │   └── utils.ts        # Helpers
│   └── package.json
└── scripts/
    └── fetch-metrics.ts    # Script CLI pour exporter les métriques
```

## Sources de données

### 1. Events du contrat (on-chain)

Le contrat émet ces events qu'on peut indexer :

```solidity
event FeesCollected(address indexed user, uint256 amount, string operation);
event TransactionForwarded(string operation, address indexed user, uint256 sofiaFee, uint256 multiVaultValue, uint256 totalReceived);
```

### 2. Méthodes de récupération

**Option A : Direct RPC (simple)**
- Utiliser `eth_getLogs` pour récupérer les events
- Filtrer par adresse du contrat et topics
- Avantage : Pas d'infra supplémentaire
- Inconvénient : Lent pour beaucoup de données

**Option B : Indexer (The Graph / Ponder)**
- Créer un subgraph pour indexer les events
- Requêtes GraphQL rapides
- Avantage : Performant, temps réel
- Inconvénient : Nécessite déploiement d'un indexer

**Option C : API Intuition Explorer**
- Utiliser l'API de l'explorer Intuition si disponible
- Endpoint : `https://explorer.intuition.systems/api`

## Métriques à afficher

### Résumé global
| Métrique | Source |
|----------|--------|
| Total frais collectés (TRUST) | Somme des `FeesCollected.amount` |
| Nombre total de transactions | Count des events `TransactionForwarded` |
| Volume total déposé | Somme des `multiVaultValue` |
| Nombre d'utilisateurs uniques | Count distinct des `user` |

### Par opération
| Opération | Transactions | Frais | Volume |
|-----------|--------------|-------|--------|
| createAtoms | count | sum | sum |
| createTriples | count | sum | sum |
| deposit | count | sum | sum |
| depositBatch | count | sum | sum |

### Tendances temporelles
- Frais par jour/semaine/mois
- Transactions par jour
- Nouveaux utilisateurs par jour

### Top utilisateurs
- Top 10 par volume
- Top 10 par nombre de transactions

## Implémentation - Phase 1 (Script CLI)

```typescript
// scripts/fetch-metrics.ts
import { createPublicClient, http, parseAbiItem } from 'viem'

const PROXY_ADDRESS = '0x26F81d723Ad1648194FAA4b7E235105Fd1212c6c'
const DEPLOY_BLOCK = 0 // À définir

async function fetchMetrics() {
  const client = createPublicClient({
    chain: intuitionMainnet,
    transport: http('https://rpc.intuition.systems')
  })

  // Récupérer tous les events FeesCollected
  const feesEvents = await client.getLogs({
    address: PROXY_ADDRESS,
    event: parseAbiItem('event FeesCollected(address indexed user, uint256 amount, string operation)'),
    fromBlock: BigInt(DEPLOY_BLOCK),
    toBlock: 'latest'
  })

  // Calculer les métriques
  const totalFees = feesEvents.reduce((sum, e) => sum + e.args.amount, 0n)
  const uniqueUsers = new Set(feesEvents.map(e => e.args.user))

  // Par opération
  const byOperation = {}
  for (const event of feesEvents) {
    const op = event.args.operation
    if (!byOperation[op]) byOperation[op] = { count: 0, fees: 0n }
    byOperation[op].count++
    byOperation[op].fees += event.args.amount
  }

  return {
    totalFees: formatEther(totalFees),
    totalTransactions: feesEvents.length,
    uniqueUsers: uniqueUsers.size,
    byOperation
  }
}
```

## Implémentation - Phase 2 (Dashboard Web)

### Stack recommandé
- **Frontend** : Next.js ou simple HTML + Vite
- **Charts** : Chart.js ou Recharts
- **Blockchain** : viem
- **Styling** : Tailwind CSS

### Écrans

1. **Overview**
   - Cards avec métriques clés
   - Graphique linéaire des frais dans le temps

2. **Transactions**
   - Tableau des transactions récentes
   - Filtres par opération, date, utilisateur

3. **Analytics**
   - Distribution par opération (pie chart)
   - Top utilisateurs (bar chart)
   - Tendances (line chart)

## Commandes à implémenter

```bash
# Afficher les métriques dans le terminal
npm run metrics

# Exporter en JSON
npm run metrics:export

# Lancer le dashboard web
npm run dashboard
```

## Prochaines étapes

1. [ ] Créer le script `fetch-metrics.ts`
2. [ ] Tester la récupération des events
3. [ ] Créer le dashboard basique
4. [ ] Ajouter les graphiques
5. [ ] (Optionnel) Déployer un indexer pour de meilleures performances

## Notes

- Le contrat a été déployé récemment, donc peu de données historiques
- L'event `FeesCollected` contient l'info principale pour les métriques
- Penser à paginer les requêtes `getLogs` si beaucoup de blocks
