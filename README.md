# Kleos

A full-stack blockchain project with frontend, smart contracts, and agent components.

0x5FbDB2315678afecb367f032d93F642f64180aa3

## Project Structure

```
kleos/
├── frontend/     # Next.js frontend application
├── contracts/    # Solidity smart contracts with Forge
└── agent/        # Python agent service
```

## Quick Start

### Frontend (Next.js)

```bash
cd frontend
npm run dev
```

### Contracts (Forge)

```bash
cd contracts
forge build
forge test
```

### Agent (Python)

```bash
cd agent
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python main.py
```

## Development

Each component has its own README with specific setup instructions. See the individual directories for more details.

- [Frontend README](./frontend/README.md)
- [Contracts README](./contracts/README.md)
- [Agent README](./agent/README.md)

forge script script/DeployUpdatedContracts.s.sol --rpc-url https://eth-sepolia.g.alchemy.com/v2/euJp53PODQmQLSIuUpjlcMeQNtUBEtvT --broadcast --verify --private-key 0x4f8e6104a0fffe3687d6a88ede5905a3a384a1e1f36986ca4f7f6db529b982c5 --etherscan-api-key PAUMQNA5KRIYWVV6J65YG46MYY14GVNJW5

forge verify-contract \
 --chain-id 114 \
 0x7324383017D9A314e39C95073229E3e52d69DF74 \
 src/MockUSDC.sol:MockUSDC \
 --compiler-version v0.8.19+commit.7dd6d404 \
 --optimizer-runs 200 \
 --etherscan-api-key PAUMQNA5KRIYWVV6J65YG46MYY14GVNJW5 \
 --watch --retries 15 --delay 10

forge script scripts/Deploy.s.sol
--broadcast --rpc-url [NETWORK_RPC_URL]
--verifier-url 'https://api.routescan.io/v2/network/testnet/evm/114/etherscan'
--etherscan-api-key "verifyContract"

forge script script/DeployMockUSDC.s.sol --rpc-url https://eth-sepolia.g.alchemy.com/v2/euJp53PODQmQLSIuUpjlcMeQNtUBEtvT --broadcast

forge script script/MintUSDC.s.sol --rpc-url https://coston2-api.flare.network/ext/C/rpc --broadcast

0xD5BeD83a3d8f87B51ef6c92291556B634D5AE2F7
0x8A39c0e68E2055B0f0b4e137d8c940b9b3442390

forge create src/MarketFactory.sol:MarketFactory --rpc-url https://coston2-api.flare.network/ext/C/rpc --private-key 0x7a1afff5655264c56c0d383cccd3ccff748a20cd260df3927b5ec8bfa9c469ee --broadcast

export PRIVATE_KEY=0x7a1afff5655264c56c0d383cccd3ccff748a20cd260df3927b5ec8bfa9c469ee

enum Outcome {
Unresolved, // 0
Yes, // 1
No // 2
}

enum MarketState {
WaitingForOpponent, // 0
Active, // 1
Resolved // 2
}

export RPC_ZIRCUIT=https://mainnet.zircuit.com       
export RPC_GARFIELD=https://garfield-testnet.zircuit.com  
export PRIVATE_KEY=0x7a1afff5655264c56c0d383cccd3ccff748a20cd260df3927b5ec8bfa9c469ee


forge create src/MockUSDC.sol:MockUSDC --rpc-url https://garfield-testnet.zircuit.com --private-key 4f8e6104a0fffe3687d6a88ede5905a3a384a1e1f36986ca4f7f6db529b982c5 --broadcast

# chainId 48898

# 2) deploy (example)
forge create src/LMSRMarket.sol:LMSRMarket \
  --rpc-url $RPC_ZIRCUIT \
  --private-key $PRIVATE_KEY \
  --constructor-args "Question?" 1737000000 1000000000000000000

# 3) verify (Sourcify is the recommended path)
forge verify-contract \
  --verifier sourcify \
  --chain-id 48900 \
  0x2251b3792e42a587200A110f3239D28022bd3f4b src/LMSRMarket.sol:LMSRMarket
# (use 48898 for Garfield testnet)

cast send 0x2251b3792e42a587200A110f3239D28022bd3f4b "mint(address,uint256)" 0x8A39c0e68E2055B0f0b4e137d8c940b9b3442390 10000000000 --rpc-url https://garfield-testnet.zircuit.com/ --private-key 4f8e6104a0fffe3687d6a88ede5905a3a384a1e1f36986ca4f7f6db529b982c5

4f8e6104a0fffe3687d6a88ede5905a3a384a1e1f36986ca4f7f6db529b982c5
7a1afff5655264c56c0d383cccd3ccff748a20cd260df3927b5ec8bfa9c469ee