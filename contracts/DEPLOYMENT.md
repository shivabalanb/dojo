# 🚀 Testnet Deployment Guide

## Prerequisites

- Foundry installed (`forge`, `cast`, `anvil`)
- Testnet ETH/FLR for gas fees
- Private key for deployment

## Step 1: Set Environment Variables

Create a `.env` file in the contracts directory:

```bash
# For Flare Testnet
PRIVATE_KEY=your_private_key_here
RPC_URL=https://flare-testnet.publicnode.com
CHAIN_ID=114

# For Sepolia (alternative)
# RPC_URL=https://sepolia.infura.io/v3/your_project_id
# CHAIN_ID=11155111
```

## Step 2: Deploy Contracts

```bash
# Build contracts first
forge build

# Deploy to testnet
forge script script/DeployToTestnet.s.sol --rpc-url $RPC_URL --broadcast --verify
```

## Step 3: Update Frontend Addresses

After deployment, update your frontend with the new addresses:

1. Copy addresses from `deployment.txt`
2. Update `frontend/src/lib/abis/index.ts` with new addresses
3. Update `frontend/src/lib/wagmi.ts` with correct chain configuration

## Step 4: Test FTSO Integration

### Example FTSO Addresses (Flare Testnet)

- BTC/USD: `0x...` (get from Flare docs)
- ETH/USD: `0x...` (get from Flare docs)
- FLR/USD: `0x...` (get from Flare docs)

### Test Market Creation

1. Create a market with FTSO parameters
2. Provide initial liquidity
3. Wait for market to end
4. Test FTSO resolution

## Troubleshooting

### Common Issues

- **Insufficient gas**: Make sure you have enough testnet tokens
- **RPC errors**: Try different RPC endpoints
- **Verification fails**: Check if contract is already verified

### Useful Commands

```bash
# Check balance
cast balance <your_address> --rpc-url $RPC_URL

# Verify deployment
cast call <contract_address> "owner()" --rpc-url $RPC_URL

# Get transaction status
cast tx <tx_hash> --rpc-url $RPC_URL
```
