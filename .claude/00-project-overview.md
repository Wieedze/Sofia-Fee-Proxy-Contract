# Vue d'ensemble — Sofia Fee Proxy

## Qu'est-ce que c'est ?

**SofiaFeeProxy** est un smart contract proxy pour **Intuition MultiVault** qui :
1. Collecte des frais (fixes + pourcentage) sur chaque opération
2. Forwarde les dépôts au MultiVault avec le bon montant
3. Transfère les frais à un recipient (Gnosis Safe)

C'est l'équivalent d'un "fee layer" devant MultiVault pour monétiser les interactions Sofia avec Intuition.

## Écosystème

- **Sofia** : projet qui utilise Intuition pour construire une couche de knowledge graph / signals
- **Intuition** : protocole de knowledge graph on-chain (MultiVault = contrat principal)
- **sofia-contracts** : ce repo (les smart contracts)
- **sofia-core** : autres apps Sofia (dashboard, explorer, mastra signals, etc.)

## Contrat V1 déployé

- **Adresse** : `0x26F81d723Ad1648194FAA4b7E235105Fd1212c6c`
- **Network** : Intuition Mainnet
- **MultiVault cible** : voir `hardhat.config.ts` / `.env`
- **Fee recipient** : `0x68c72d6c3d81B20D8F81e4E41BA2F373973141eD` (Gnosis Safe)

## Fee structure V1

| Type | Valeur | Description |
|------|--------|-------------|
| Fixe | 0.1 TRUST | Par dépôt |
| Pourcentage | 5% (500/10000) | Du montant déposé |

Exemple pour 10 TRUST déposés :
- Fixe : 0.1 TRUST
- % : 0.5 TRUST
- **Total fee Sofia : 0.6 TRUST**
- **User envoie : 10.6 TRUST**
- **Deposited to MultiVault : 10 TRUST**

## Fonctions exposées V1

- `createAtoms(receiver, data[], assets[], curveId)` — créer des atoms + deposit
- `createTriples(receiver, subjectIds[], predicateIds[], objectIds[], assets[], curveId)` — créer des triples + deposit
- `deposit(receiver, termId, curveId, minShares)` — dépôt direct
- `depositBatch(receiver, termIds[], curveIds[], assets[], minShares[])` — dépôts en batch

## Admin V1

- `setDepositFixedFee(uint256)`
- `setDepositPercentageFee(uint256)`
- `setFeeRecipient(address)`
- `setWhitelistedAdmin(address, bool)`

Modèle : `whitelistedAdmins[]` (multi-admin, pas Ownable).
