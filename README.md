# Sofia Fee Proxy Contract

Smart contract proxy for Intuition MultiVault with fee collection for the Sofia application.

## Overview

The SofiaFeeProxy contract acts as a proxy between Sofia users and the Intuition MultiVault contract. It collects fees on transactions (atom/triple creation and deposits) and forwards them to a fee recipient address.

## Fee Structure

| Operation | Fixed Fee | Percentage Fee |
|-----------|-----------|----------------|
| Create Atoms | 0 TRUST | 0% |
| Create Triples | 0 TRUST | 0% |
| Deposit | 0.1 TRUST | 5% |

### Example

For a 10 TRUST deposit:
- Fixed fee: 0.1 TRUST
- Percentage fee: 0.5 TRUST (5% of 10)
- **Total fee: 0.6 TRUST**
- User sends: 10.6 TRUST
- Deposited to MultiVault: 10 TRUST

## Deployed Contract

| Network | Address |
|---------|---------|
| Intuition Mainnet | `0x880E213224Ce5B6B8a01A21D4318819c67146533` |

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

- `setCreationFixedFee(uint256)` - Update creation fee
- `setDepositFixedFee(uint256)` - Update deposit fixed fee
- `setDepositPercentageFee(uint256)` - Update deposit percentage (base 10000)
- `setFeeRecipient(address)` - Update fee recipient
- `setWhitelistedAdmin(address, bool)` - Add/remove admins

## License

MIT
