# Kleos Markets - Makefile for contract operations

.PHONY: help install build test clean deploy-sepolia verify-sepolia status

# Default target
help:
	@echo "Kleos Markets - Available commands:"
	@echo ""
	@echo "  make install        - Install dependencies"
	@echo "  make build          - Build contracts"
	@echo "  make test           - Run tests"
	@echo "  make clean          - Clean build artifacts"
	@echo "  make deploy-sepolia - Deploy to Sepolia testnet"
	@echo "  make verify-sepolia - Verify contracts on Sepolia"
	@echo "  make status         - Check deployment status"
	@echo ""

# Install Foundry dependencies
install:
	@echo "📦 Installing dependencies..."
	forge install

# Build contracts
build:
	@echo "🔨 Building contracts..."
	forge build

# Run tests
test:
	@echo "🧪 Running tests..."
	forge test -vv

# Clean build artifacts
clean:
	@echo "🧹 Cleaning build artifacts..."
	forge clean

# Deploy to Sepolia testnet
deploy-sepolia:
	@echo "🚀 Deploying to Sepolia testnet..."
	@./deploy-sepolia.sh

# Verify contracts on Sepolia (manual verification if auto-verify failed)
verify-sepolia:
	@echo "🔍 Verifying contracts on Sepolia..."
	@if [ -f broadcast/DeployMarkets.s.sol/11155111/run-latest.json ]; then \
		echo "Reading deployment addresses from broadcast file..."; \
		FACTORY_ADDRESS=$$(jq -r '.transactions[] | select(.contractName == "MarketFactory") | .contractAddress' broadcast/DeployMarkets.s.sol/11155111/run-latest.json); \
		if [ "$$FACTORY_ADDRESS" != "null" ] && [ "$$FACTORY_ADDRESS" != "" ]; then \
			echo "Verifying MarketFactory at $$FACTORY_ADDRESS..."; \
			forge verify-contract $$FACTORY_ADDRESS src/MarketFactory.sol:MarketFactory --chain sepolia; \
		else \
			echo "❌ Could not find MarketFactory address in deployment file"; \
		fi \
	else \
		echo "❌ No deployment file found. Run 'make deploy-sepolia' first."; \
	fi

# Check deployment status
status:
	@echo "📊 Checking deployment status..."
	@if [ -f broadcast/DeployMarkets.s.sol/11155111/run-latest.json ]; then \
		echo "✅ Deployment file found"; \
		echo "📄 Deployment details:"; \
		jq -r '.transactions[] | "  \(.contractName): \(.contractAddress)"' broadcast/DeployMarkets.s.sol/11155111/run-latest.json; \
		echo ""; \
		echo "🔗 View on Etherscan:"; \
		jq -r '.transactions[] | "  https://sepolia.etherscan.io/address/\(.contractAddress)"' broadcast/DeployMarkets.s.sol/11155111/run-latest.json; \
	else \
		echo "❌ No deployment found. Run 'make deploy-sepolia' first."; \
	fi