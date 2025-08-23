# Kleos - Decentralized Prediction Markets

A full-stack decentralized prediction market platform built with modern web3 technologies. Users can create and participate in prediction markets with both two-party challenges and automated LMSR (Logarithmic Market Scoring Rule) markets.

## 🚀 Features

- **Two-Party Challenges**: Head-to-head betting with customizable odds
- **Automated LMSR Markets**: Continuous liquidity markets with dynamic pricing
- **FTSO Integration**: Real-time price feed resolution from Flare Network
- **AI Resolution**: Alternative resolution using AI analysis
- **Modern UI**: Clean, responsive interface with real-time updates
- **Multi-Chain Support**: Deployed on Flare Network (Coston2 testnet)

## 📍 Deployed Contract Addresses

### Flare Coston2 Testnet (Primary)

- **Chain ID**: 114
- **RPC URL**: `https://coston2-api.flare.network/ext/C/rpc`
- **Market Factory**: `0x75fA39CD9eb6e88757652a593A3C9Ff2986306Ec`
- **MockUSDC**: `0xb910A29A10402D76aCD49bd10c28533Ef35C61c3`
- **Explorer**: [Routescan](https://coston2-explorer.flare.network/)

### Zircuit Garfield Testnet

- **Chain ID**: 48898
- **RPC URL**: `https://garfield-testnet.zircuit.com`
- **Market Factory**: `0xC87a13685Cc147cB3dbe901A5baD7af6186BB0Ac`
- **MockUSDC**: `0x7324383017D9A314e39C95073229E3e52d69DF74`

### Ethereum Sepolia Testnet

- **Chain ID**: 11155111
- **RPC URL**: `https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY`
- **Market Factory**: `0x91E4BB2C245109e313e72907990f0b785eae67e4`
- **MockUSDC**: `0xB3C359fbe59416827B4cB7Df1b82538CE8293944`

## 🛠 Tech Stack

### Frontend

- **Framework**: Next.js 14 with App Router
- **Styling**: Tailwind CSS
- **Web3**: Wagmi + RainbowKit for wallet connection
- **State Management**: React hooks + Viem for blockchain interactions
- **UI Components**: Headless UI + Lucide React icons

### Smart Contracts

- **Language**: Solidity 0.8.19
- **Framework**: Foundry (Forge)
- **Testing**: Forge testing framework
- **Deployment**: Foundry scripts with multi-chain support

### Backend

- **Database**: PostgreSQL for market metadata
- **API**: Next.js API routes
- **Authentication**: Wallet-based (no traditional auth)

### Blockchain

- **Primary Network**: Flare Network (Coston2 testnet)
- **Token**: MockUSDC (ERC-20 with 6 decimals)
- **Oracle**: FTSO (Flare Time Series Oracle) for price feeds

## 📁 Project Structure

```
kleos/
├── frontend/                 # Next.js frontend application
│   ├── src/
│   │   ├── app/             # App Router pages
│   │   ├── components/      # React components
│   │   ├── lib/            # Utilities and configurations
│   │   └── styles/         # Global styles
│   ├── public/             # Static assets
│   └── package.json
├── contracts/              # Solidity smart contracts
│   ├── src/               # Contract source files
│   ├── script/            # Deployment scripts
│   ├── test/              # Contract tests
│   └── foundry.toml       # Foundry configuration
└── README.md
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Foundry (for smart contract development)
- PostgreSQL (for market metadata)
- MetaMask or compatible wallet

### 1. Clone and Setup

```bash
git clone <repository-url>
cd kleos
```

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at `http://localhost:3000`

### 3. Smart Contracts Setup

```bash
cd contracts
forge install
forge build
forge test
```

### 4. Database Setup

Create a PostgreSQL database and update the connection in `frontend/src/app/api/markets/route.ts`:

```typescript
const pool = new Pool({
  user: "your_username",
  host: "localhost",
  database: "market_data",
  password: "your_password",
  port: 5432,
});
```

Create the markets table:

```sql
CREATE TABLE markets (
  market_index INTEGER PRIMARY KEY,
  question TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🔧 Configuration

### Environment Variables

Create `.env.local` in the frontend directory:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/market_data

# Blockchain (Flare Coston2 testnet)
NEXT_PUBLIC_CHAIN_ID=114
NEXT_PUBLIC_RPC_URL=https://coston2-api.flare.network/ext/C/rpc

# Contract Addresses (update after deployment)
NEXT_PUBLIC_MARKET_FACTORY_ADDRESS=0x75fA39CD9eb6e88757652a593A3C9Ff2986306Ec
NEXT_PUBLIC_MOCK_USDC_ADDRESS=0xb910A29A10402D76aCD49bd10c28533Ef35C61c3
```

### Foundry Configuration

Update `contracts/foundry.toml` for your deployment preferences:

```toml
[profile.default]
src = "src"
out = "out"
libs = ["lib"]
solc_version = "0.8.19"
optimizer = true
optimizer_runs = 200
```

## 🚀 Deployment

### Smart Contracts

1. **Deploy to Flare Coston2 testnet**:

```bash
cd contracts
forge script script/Deploy.s.sol \
  --rpc-url https://coston2-api.flare.network/ext/C/rpc \
  --broadcast \
  --verifier-url 'https://api.routescan.io/v2/network/testnet/evm/114/etherscan' \
  --etherscan-api-key "your_api_key"
```

2. **Deploy MockUSDC**:

```bash
forge create src/MockUSDC.sol:MockUSDC \
  --rpc-url https://coston2-api.flare.network/ext/C/rpc \
  --private-key $PRIVATE_KEY \
  --broadcast
```

3. **Mint USDC to addresses**:

```bash
forge script script/MintUSDC.s.sol \
  --rpc-url https://coston2-api.flare.network/ext/C/rpc \
  --broadcast
```

### Frontend Deployment

1. **Build for production**:

```bash
cd frontend
npm run build
```

2. **Deploy to Vercel** (recommended):

```bash
npm install -g vercel
vercel --prod
```

## 📚 Usage Guide

### Creating Markets

1. **Connect Wallet**: Use MetaMask or compatible wallet
2. **Choose Market Type**:
   - **Two-Party Challenge**: Head-to-head betting
   - **LMSR Market**: Automated liquidity market
3. **Configure Market**:
   - Enter question and duration
   - Set stake amounts and odds (Two-Party)
   - Configure liquidity parameters (LMSR)
4. **Optional FTSO Integration**: Enable for price-based resolution
5. **Create Market**: Submit transaction

### Participating in Markets

1. **Browse Markets**: View active markets on the homepage
2. **Join Challenges**: Accept two-party challenges
3. **Trade LMSR**: Buy/sell shares in automated markets
4. **Wait for Resolution**: Markets resolve automatically or manually
5. **Claim Winnings**: Collect rewards for successful predictions

### Resolution Methods

- **FTSO**: Automatic resolution using Flare price feeds
- **AI**: Manual resolution using AI analysis
- **Manual**: Creator determines outcome

## 🧪 Testing

### Smart Contract Tests

```bash
cd contracts
forge test
forge test --match-test testMarketCreation
```

### Frontend Tests

```bash
cd frontend
npm test
```

## 🔍 API Reference

### Market Endpoints

- `GET /api/markets` - Get all markets
- `GET /api/markets?index={id}` - Get specific market
- `POST /api/markets` - Create new market metadata
- `PUT /api/markets` - Update market metadata

### Contract Functions

#### MarketFactory

- `createTwoPartyMarket()` - Create two-party challenge
- `createTwoPartyMarketWithFTSO()` - Create with FTSO resolution
- `createLMSRMarket()` - Create LMSR market
- `getAllMarketsCount()` - Get total market count

#### TwoPartyMarket

- `provideInitialBet()` - Creator provides initial stake
- `acceptChallenge()` - Opponent accepts challenge
- `resolveWithAI()` - Resolve using AI
- `resolveWithStoredFTSO()` - Resolve using FTSO
- `claim()` - Claim winnings

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check individual component READMEs
- **Issues**: Create GitHub issues for bugs or feature requests
- **Discussions**: Use GitHub Discussions for questions

## 🔗 Links

- [Flare Network Documentation](https://docs.flare.network/)
- [FTSO Documentation](https://docs.flare.network/tech/ftso/)
- [Foundry Book](https://book.getfoundry.sh/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Wagmi Documentation](https://wagmi.sh/)

---

**Note**: This project is in active development. Always test thoroughly on testnets before using with real assets.
