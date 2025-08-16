# Kleos Prediction Market Contracts

A simple Polymarket-style prediction market implementation with Factory + Market contracts.

## Architecture

```
MarketFactory (creates) → Market (has) → PositionTokens (YES/NO)
```

## Core Concepts

- **1 ETH = 1 YES + 1 NO token** (always)
- Users deposit ETH to mint equal amounts of YES and NO tokens
- Users can redeem paired tokens back to ETH before resolution
- After resolution, winning tokens can be claimed for ETH

## Contracts

### 1. PositionToken (`src/PositionToken.sol`)

- Simple ERC20-like token representing YES or NO positions
- Only the market contract can mint/burn tokens

### 2. Market (`src/Market.sol`)

- Individual prediction market with a question and end time
- Handles minting/redeeming position tokens
- Resolves to YES or NO outcome
- Allows winners to claim ETH

### 3. MarketFactory (`src/MarketFactory.sol`)

- Creates new markets
- Manages resolvers (who can create/resolve markets)
- Tracks all created markets

## Usage Example

```solidity
// 1. Deploy factory
MarketFactory factory = new MarketFactory();

// 2. Create a market (as resolver)
address marketAddr = factory.createMarket(
    "Will ETH reach $5000 by Dec 31, 2024?",
    30 days // duration
);
Market market = Market(marketAddr);

// 3. User deposits 1 ETH and gets 1 YES + 1 NO token
market.mintPositions{value: 1 ether}(1 ether);

// 4. User can trade tokens or redeem pairs back to ETH
market.redeemPositions(0.5 ether); // Redeem 0.5 YES + 0.5 NO → 0.5 ETH

// 5. After end time, resolver resolves market
market.resolve(Market.Outcome.Yes);

// 6. Winners claim ETH for their winning tokens
market.claim(); // YES holders get 1 ETH per token
```

## Key Features

- ✅ Automated market making (constant sum: YES + NO = 1 ETH)
- ✅ Permissionless trading of position tokens
- ✅ Time-based market expiration
- ✅ Simple resolution mechanism
- ✅ Fair payout system

## Security Considerations

⚠️ **This is a basic implementation for learning purposes. Not audited!**

- No oracle integration (manual resolution)
- No trading fees
- No slippage protection
- Basic access controls

## Testing

```bash
forge test
```

All tests pass:

- Market creation
- Position minting/redeeming
- Market resolution and claiming
- Resolver management

## Next Steps

1. Add automated oracles for resolution
2. Implement trading fees
3. Add AMM for price discovery
4. Add partial resolution outcomes
5. Implement dispute mechanisms
