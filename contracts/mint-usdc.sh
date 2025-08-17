#!/bin/bash

# Mint USDC to address on Flare Coston2 testnet
# Usage: ./mint-usdc.sh

# MockUSDC contract address on Flare Coston2 testnet
MOCK_USDC="0x7324383017D9A314e39C95073229E3e52d69DF74"

# Address to mint to
RECIPIENT="0xD5BeD83a3d8f87B51ef6c92291556B634D5AE2F7"

# Amount to mint (10,000 USDC with 6 decimals)
AMOUNT="10000000000"

# Private key (you can set this as environment variable)
PRIVATE_KEY=${PRIVATE_KEY:-"0x7a1afff5655264c56c0d383cccd3ccff748a20cd260df3927b5ec8bfa9c469ee"}

# Flare Coston2 RPC
RPC_URL="https://coston2-api.flare.network/ext/C/rpc"

echo "🚀 Minting USDC on Flare Coston2 Testnet..."
echo "MockUSDC Contract: $MOCK_USDC"
echo "Recipient: $RECIPIENT"
echo "Amount: $AMOUNT wei (10,000 USDC)"
echo "RPC: $RPC_URL"
echo ""

# Mint USDC using cast
cast send $MOCK_USDC \
  "mint(address,uint256)" \
  $RECIPIENT \
  $AMOUNT \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY

echo ""
echo "✅ Mint transaction completed!"
echo "Check balance: cast call $MOCK_USDC 'balanceOf(address)' $RECIPIENT --rpc-url $RPC_URL"
