#!/bin/bash

# Kleos Markets Sepolia Deployment Script
set -e

echo "🚀 Deploying Kleos Markets to Sepolia Testnet"
echo "=============================================="

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "Please copy .env.example to .env and fill in your values:"
    echo "  - PRIVATE_KEY (without 0x prefix)"
    echo "  - ETHERSCAN_API_KEY"
    exit 1
fi

# Source environment variables
source .env

# Check required environment variables
if [ -z "$PRIVATE_KEY" ]; then
    echo "❌ Error: PRIVATE_KEY not set in .env file"
    exit 1
fi

if [ -z "$ETHERSCAN_API_KEY" ]; then
    echo "⚠️  Warning: ETHERSCAN_API_KEY not set - contract verification will be skipped"
fi

echo "📋 Pre-deployment checks..."

# Check if forge is installed
if ! command -v forge &> /dev/null; then
    echo "❌ Error: Foundry forge not found. Please install Foundry first."
    exit 1
fi

echo "✅ Foundry forge found"

# Check Sepolia connection
echo "🔍 Testing Sepolia connection..."
forge block latest --rpc-url sepolia > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Sepolia connection successful"
else
    echo "❌ Error: Cannot connect to Sepolia. Check your RPC configuration."
    exit 1
fi

# Build contracts
echo "🔨 Building contracts..."
forge build
if [ $? -ne 0 ]; then
    echo "❌ Error: Contract build failed"
    exit 1
fi
echo "✅ Contracts built successfully"

# Run tests
echo "🧪 Running tests..."
forge test
if [ $? -ne 0 ]; then
    echo "❌ Error: Tests failed"
    exit 1
fi
echo "✅ All tests passed"

# Deploy contracts
echo "🚀 Deploying to Sepolia..."
forge script script/DeployMarkets.s.sol --rpc-url sepolia --broadcast --verify

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 Deployment successful!"
    echo ""
    echo "📝 Deployment artifacts saved to:"
    echo "   - broadcast/DeployMarkets.s.sol/11155111/run-latest.json"
    echo ""
    echo "🔍 Check deployment status:"
    echo "   - View on Sepolia Etherscan: https://sepolia.etherscan.io/"
    echo "   - Contracts should be automatically verified if ETHERSCAN_API_KEY was provided"
    echo ""
    echo "📋 Next steps:"
    echo "   1. Update frontend configuration with deployed contract addresses"
    echo "   2. Test the application with the new contracts"
    echo "   3. Fund your test account with Sepolia ETH if needed"
else
    echo "❌ Deployment failed. Check the error messages above."
    exit 1
fi