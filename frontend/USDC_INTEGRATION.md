# USDC Integration for Two-Party Markets

## Overview

The frontend has been updated to use MockUSDC tokens instead of ETH for all Two-Party market operations. This eliminates the need for `msg.value` and provides a more stable trading experience.

## Key Changes

### 1. Contract Updates

- **TwoPartyMarket**: Now uses IERC20 (USDC) for all transactions
- **MarketFactory**: Updated to pass USDC address to market creation
- **No more `msg.value`**: All transactions use USDC token transfers

### 2. Frontend Updates

- **CreateMarket**: Updated to use USDC amounts and token approvals
- **MarketCard**: Updated trading functions to use USDC
- **ABIs**: Added MockUSDC ABI and address configuration

### 3. New Features

- **Token Approvals**: Automatic USDC approval before transactions
- **Initial Liquidity**: Creator must provide initial liquidity to start markets
- **USDC Amounts**: All amounts displayed in USDC (6 decimals)

## Setup Instructions

### 1. Deploy MockUSDC

```bash
cd contracts
forge script script/DeployMockUSDC.s.sol --rpc-url <your-rpc-url> --private-key <your-private-key> --broadcast
```

### 2. Update Frontend Address

After deployment, update the MockUSDC address in the frontend:

```bash
cd frontend
node update-mock-usdc-address.js <deployed-mock-usdc-address>
```

### 3. Mint USDC to Your Wallet

Use the deployed MockUSDC contract to mint tokens to your wallet address.

## Usage Flow

### Creating a Market

1. **Set Amounts**: Enter total USDC amount and percentage split
2. **Create Market**: Contract creates market with USDC parameters
3. **Provide Liquidity**: Creator must provide initial USDC stake
4. **Wait for Opponent**: Someone must accept the challenge

### Trading

1. **Approve USDC**: Frontend automatically approves USDC spending
2. **Buy Shares**: Purchase YES/NO shares with USDC
3. **Wait for Resolution**: Market resolves after end time
4. **Claim Winnings**: Winners claim USDC payouts

## Technical Details

### USDC Decimals

- MockUSDC uses 6 decimals (like real USDC)
- Frontend converts amounts: `parseUnits(amount, 6)`
- Display: `formatEther(amount)` (shows as whole USDC)

### Token Approvals

- All trading functions first approve USDC spending
- Approvals are done automatically by the frontend
- No manual approval needed

### Contract Functions

- `provideInitialLiquidity()`: Creator provides initial stake
- `acceptChallenge()`: Opponent accepts with USDC
- `buyYes()` / `buyNo()`: Trade with USDC amounts
- `claim()`: Claim USDC payouts

## Benefits

1. **No ETH Required**: Users only need USDC tokens
2. **Stable Pricing**: USDC amounts are stable (no ETH volatility)
3. **Better UX**: Clear USDC amounts instead of ETH
4. **Gas Efficiency**: Token transfers are more efficient
5. **Compliance**: Easier to track and report USDC transactions

## Troubleshooting

### Common Issues

1. **Insufficient USDC**: Make sure you have enough MockUSDC tokens
2. **Approval Failed**: Check if USDC approval transaction succeeded
3. **Wrong Address**: Ensure MockUSDC address is correctly set in frontend

### Debug Steps

1. Check browser console for error messages
2. Verify MockUSDC balance in your wallet
3. Check if approval transactions succeeded
4. Ensure market is in correct state (waiting/active)

## Migration Notes

- **Existing Markets**: Old ETH-based markets will continue to work
- **New Markets**: All new markets will use USDC
- **Data**: Market data structure remains the same
- **UI**: Updated to show USDC amounts throughout
