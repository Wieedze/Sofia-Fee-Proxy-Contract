# État actuel — V1 déployé

## Contrat V1 en production

- **Adresse** : `0x26F81d723Ad1648194FAA4b7E235105Fd1212c6c`
- **Network** : Intuition Mainnet
- **Fichier** : `src/SofiaFeeProxy.sol`
- **Immutable** : pas de proxy, pas d'upgrade path possible

## Problèmes identifiés sur V1

### 1. Receiver non validé (bug sécu)

Dans `createAtoms`, `createTriples`, `deposit`, `depositBatch`, le paramètre `receiver` n'est pas validé contre `msg.sender`. Un attaquant peut payer les fees mais rediriger les shares ailleurs — ou inversement, n'importe qui peut forger des transactions au nom d'un tiers.

Référence : **Fee-Proxy-Template#1** (issue GitHub).

### 2. 62 TRUST bloqués sur le contrat

Historique : de l'ETH a été envoyé directement au contrat via le `receive() external payable {}`, sans passer par les fonctions de dépôt. Le contrat n'a aucune fonction `withdraw` → les fonds sont **irrécupérables**.

**Causes possibles** :
- MultiVault a refund un surplus de `msg.value` via `.call` → capturé par `receive()`
- Un user a envoyé directement au contrat par erreur
- Un call qui a revert côté MultiVault mais après le `_transferFee` (mais non, `_transferFee` va vers `feeRecipient` pas vers le proxy)

Le plus probable : **refunds de MultiVault** sur des calls où `msg.value` > coût réel.

**Verdict** : pertes définitives. À mentionner dans l'article de communication V2.

### 3. Fee forwarding immédiat

`_transferFee()` envoie les fees au Gnosis Safe à chaque transaction :
- **+** : pas de fees bloquées
- **-** : coûteux en gas, et chaque tx peut revert si le Safe rejette l'appel
- **-** : pas de flexibilité (ex: accumulation de fees pour des opérations batch)

### 4. Pas d'upgrade path

Contrat immutable → impossible de fix sans redéploiement complet. Nouveau déploiement = changement d'adresse → frontend à mettre à jour + communication aux users.

## Ce qui fonctionne bien en V1 (à garder)

- Modèle `whitelistedAdmins[]` multi-admin (pas Ownable)
- Calcul des fees (fixed + percentage) + formule inverse pour `deposit(msg.value)`
- Events `FeesCollected`, `TransactionForwarded`, `MultiVaultSuccess` (utilisés par le dashboard)
- `MockMultiVault.sol` pour les tests

## Stack actuel

- **Solidity** : ^0.8.21
- **Hardhat** + TypeScript
- **ethers v6**
- **typechain-types** généré
- **Tests** : `test/SofiaFeeProxy.test.ts`
- **Scripts** : `deploy.ts`, `deploy-local.ts`, `deploy-local-debug.ts`

## Dashboard metrics (existant)

Plan défini dans [METRICS_DASHBOARD_PLAN.md](../METRICS_DASHBOARD_PLAN.md) :
- Total frais collectés (somme `FeesCollected.amount`)
- Nombre de transactions (count `TransactionForwarded`)
- Volume total déposé (somme `multiVaultValue`)

Les events V2 doivent rester compatibles pour ne pas casser le dashboard.
