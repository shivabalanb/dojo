#!/bin/bash

# Sync contract artifacts from contracts/out/ to frontend/src/lib/artifacts/

echo "🔄 Syncing contract artifacts..."

# Check if contracts are built
if [ ! -d "contracts/out" ]; then
    echo "❌ contracts/out directory not found. Building contracts first..."
    cd contracts
    forge build
    cd ..
fi

# Create artifacts directory if it doesn't exist
mkdir -p frontend/src/lib/artifacts

# Sync specific contract artifacts
echo "📁 Copying contract artifacts..."

# ConstantProductMarket
if [ -f "contracts/out/ConstantProductMarket.sol/ConstantProductMarket.json" ]; then
    cp contracts/out/ConstantProductMarket.sol/ConstantProductMarket.json frontend/src/lib/artifacts/
    echo "✅ ConstantProductMarket.json synced"
else
    echo "❌ ConstantProductMarket.json not found in contracts/out/"
fi

# MarketFactory
if [ -f "contracts/out/MarketFactory.sol/MarketFactory.json" ]; then
    cp contracts/out/MarketFactory.sol/MarketFactory.json frontend/src/lib/artifacts/
    echo "✅ MarketFactory.json synced"
else
    echo "❌ MarketFactory.json not found in contracts/out/"
fi

# MockUSDC
if [ -f "contracts/out/MockUSDC.sol/MockUSDC.json" ]; then
    cp contracts/out/MockUSDC.sol/MockUSDC.json frontend/src/lib/artifacts/
    echo "✅ MockUSDC.json synced"
else
    echo "❌ MockUSDC.json not found in contracts/out/"
fi

echo "🎉 Artifact sync complete!"
echo "📂 Frontend artifacts: frontend/src/lib/artifacts/"
