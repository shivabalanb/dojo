#!/bin/bash

# Sync Artifacts Script
# Copies contract artifacts from contracts/out/ to frontend/src/lib/artifacts/

echo "🔄 Syncing contract artifacts..."

# Set paths
CONTRACTS_DIR="contracts"
FRONTEND_ARTIFACTS_DIR="frontend/src/lib/artifacts"

# Check if contracts directory exists
if [ ! -d "$CONTRACTS_DIR" ]; then
    echo "❌ Error: contracts directory not found"
    exit 1
fi

# Check if frontend artifacts directory exists
if [ ! -d "$FRONTEND_ARTIFACTS_DIR" ]; then
    echo "❌ Error: frontend artifacts directory not found"
    exit 1
fi

# Build contracts first
echo "🔨 Building contracts..."
cd "$CONTRACTS_DIR"
forge build --silent
if [ $? -ne 0 ]; then
    echo "❌ Error: Contract build failed"
    exit 1
fi
cd ..

# Copy artifacts
echo "📋 Copying artifacts..."

# Copy LMSRMarket
if [ -f "$CONTRACTS_DIR/out/LMSRMarket.sol/LMSRMarket.json" ]; then
    cp "$CONTRACTS_DIR/out/LMSRMarket.sol/LMSRMarket.json" "$FRONTEND_ARTIFACTS_DIR/"
    echo "✅ Copied LMSRMarket.json"
else
    echo "⚠️  Warning: LMSRMarket.json not found"
fi

# Copy MarketFactory
if [ -f "$CONTRACTS_DIR/out/MarketFactory.sol/MarketFactory.json" ]; then
    cp "$CONTRACTS_DIR/out/MarketFactory.sol/MarketFactory.json" "$FRONTEND_ARTIFACTS_DIR/"
    echo "✅ Copied MarketFactory.json"
else
    echo "⚠️  Warning: MarketFactory.json not found"
fi

# Copy TwoPartyMarket
if [ -f "$CONTRACTS_DIR/out/TwoPartyMarket.sol/TwoPartyMarket.json" ]; then
    cp "$CONTRACTS_DIR/out/TwoPartyMarket.sol/TwoPartyMarket.json" "$FRONTEND_ARTIFACTS_DIR/"
    echo "✅ Copied TwoPartyMarket.json"
else
    echo "⚠️  Warning: TwoPartyMarket.json not found"
fi

echo "🎉 Artifact sync complete!"
echo "📁 Updated files in: $FRONTEND_ARTIFACTS_DIR"
