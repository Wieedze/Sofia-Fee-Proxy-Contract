# Sofia Fee Proxy Contract

Smart contract proxy for Intuition MultiVault with fee collection for the Sofia application.

## Overview

The SofiaFeeProxy contract acts as a proxy between Sofia users and the Intuition MultiVault contract. It collects fees on transactions (atom/triple creation and deposits) and forwards them to a fee recipient address.

## Fee Structure

All fees are applied **per deposit** (added on top of the deposit amount):

| Fee Type | Amount |
|----------|--------|
| Fixed fee | 0.1 TRUST per deposit |
| Percentage fee | 5% of deposit amount |

Fees apply to:
- `deposit()` - direct deposits
- `createAtoms()` - deposits made during atom creation
- `createTriples()` - deposits made during triple creation

### Example

For a 10 TRUST deposit:
- Fixed fee: 0.1 TRUST
- Percentage fee: 0.5 TRUST (5% of 10)
- **Total Sofia fee: 0.6 TRUST**
- **User sends: 10.6 TRUST**
- **Deposited to MultiVault: 10 TRUST**

Note: MultiVault may apply its own internal fees on deposits.

## Deployed Contract

| Network | Address |
|---------|---------|
| Intuition Mainnet | `0x26F81d723Ad1648194FAA4b7E235105Fd1212c6c` |

## Installation

```bash
npm install
```

## Build

```bash
npx hardhat compile
```

## Test

```bash
npm test
```

## Deployment

```bash
# Testnet
npm run deploy:testnet

# Mainnet
npm run deploy:mainnet
```

## Admin Functions

Only whitelisted admins can call these functions:

- `setDepositFixedFee(uint256)` - Update deposit fixed fee
- `setDepositPercentageFee(uint256)` - Update deposit percentage (base 10000)
- `setFeeRecipient(address)` - Update fee recipient
- `setWhitelistedAdmin(address, bool)` - Add/remove admins

## License

MIT
