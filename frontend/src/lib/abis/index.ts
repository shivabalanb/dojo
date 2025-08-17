// Import ABIs from local artifacts
import MarketFactoryArtifact from "../artifacts/MarketFactory.json";
import TwoPartyMarketArtifact from "../artifacts/TwoPartyMarket.json";
import LMSRMarketArtifact from "../artifacts/LMSRMarket.json";
import MockUSDCArtifact from "../artifacts/MockUSDC.json";

// Extract ABIs from the build artifacts
export const MarketFactoryABI = MarketFactoryArtifact.abi;
export const TwoPartyMarketABI = TwoPartyMarketArtifact.abi;
export const LMSRMarketABI = LMSRMarketArtifact.abi;
export const MockUSDCABI = MockUSDCArtifact.abi;

// Legacy alias for backward compatibility
export const MarketABI = TwoPartyMarketABI;

// FLARE COSTON2 TESTNET
export const MOCK_USDC_ADDRESS = "0xb910A29A10402D76aCD49bd10c28533Ef35C61c3";
export const MARKET_FACTORY_ADDRESS =
  "0x75fA39CD9eb6e88757652a593A3C9Ff2986306Ec";

// ZIRCUIT GARFIELD TESTNET
// export const MOCK_USDC_ADDRESS = "0x7324383017D9A314e39C95073229E3e52d69DF74";
// export const MARKET_FACTORY_ADDRESS =
//   "0xC87a13685Cc147cB3dbe901A5baD7af6186BB0Ac";

// SEPOLIA TESTNET
// export const MARKET_FACTORY_ADDRESS =
//   "0x91E4BB2C245109e313e72907990f0b785eae67e4" as const;
// export const MOCK_USDC_ADDRESS =
//   "0xB3C359fbe59416827B4cB7Df1b82538CE8293944" as const; // Replace with deployed address

// Market type enum (matches contract)
export enum MarketType {
  Challenge = 0,
  LMSR = 1,
}

// Export types for TypeScript
export type MarketFactoryABI = typeof MarketFactoryABI;
export type TwoPartyMarketABI = typeof TwoPartyMarketABI;
export type LMSRMarketABI = typeof LMSRMarketABI;
export type MockUSDCABI = typeof MockUSDCABI;
export type MarketABI = typeof MarketABI;
