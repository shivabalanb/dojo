#!/bin/bash

# Quick Artifact Sync Script
# Run this from the contracts/ directory

echo "🔄 Quick artifact sync..."

# Build contracts
forge build --silent

# Copy to frontend
cp out/LMSRMarket.sol/LMSRMarket.json ../frontend/src/lib/artifacts/
cp out/MarketFactory.sol/MarketFactory.json ../frontend/src/lib/artifacts/
cp out/TwoPartyMarket.sol/TwoPartyMarket.json ../frontend/src/lib/artifacts/

echo "✅ Artifacts synced to frontend/src/lib/artifacts/"
