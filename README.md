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

forge script script/DeployMarkets.s.sol --rpc-url https://eth-sepolia.g.alchemy.com/v2/euJp53PODQmQLSIuUpjlcMeQNtUBEtvT --broadcast --verify --private-key 4f8e6104a0fffe3687d6a88ede5905a3a384a1e1f36986ca4f7f6db529b982c5 --etherscan-api-key PAUMQNA5KRIYWVV6J65YG46MYY14GVNJW5

forge verify-contract \
  --chain-id 11155111 \
  0x373d37643828400B80f3de36D0DA8AD8962078b8 \
  src/TwoPartyMarket.sol:TwoPartyMarket \
  --compiler-version v0.8.30+commit.73712a01 \
  --optimizer-runs 200 \
  --etherscan-api-key PAUMQNA5KRIYWVV6J65YG46MYY14GVNJW5 \
  --watch --retries 15 --delay 10

   forge script script/DeployMockUSDC.s.sol --rpc-url https://eth-sepolia.g.alchemy.com/v2/euJp53PODQmQLSIuUpjlcMeQNtUBEtvT --broadcast

  0xD5BeD83a3d8f87B51ef6c92291556B634D5AE2F7
  0x8A39c0e68E2055B0f0b4e137d8c940b9b3442390

  enum Outcome { 
    Unresolved,  // 0
    Yes,         // 1
    No           // 2
}

enum MarketState {
    WaitingForOpponent,  // 0
    Active,              // 1
    Resolved             // 2
}