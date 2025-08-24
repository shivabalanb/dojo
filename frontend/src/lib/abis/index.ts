// Import ABIs from local artifacts
import MarketFactoryArtifact from "../artifacts/MarketFactory.json";
import TwoPartyMarketArtifact from "../artifacts/TwoPartyMarket.json";
import ConstantProductMarketArtifact from "../artifacts/ConstantProductMarket.json";
import MockUSDCArtifact from "../artifacts/MockUSDC.json";

// Extract ABIs from the build artifacts
export const MarketFactoryABI = MarketFactoryArtifact.abi;
export const TwoPartyMarketABI = TwoPartyMarketArtifact.abi;
export const ConstantProductMarketABI = ConstantProductMarketArtifact.abi;
export const MockUSDCABI = MockUSDCArtifact.abi;

// Legacy alias for backward compatibility
export const MarketABI = TwoPartyMarketABI;

// FLARE COSTON2 TESTNET
// export const MOCK_USDC_ADDRESS = "0xb910A29A10402D76aCD49bd10c28533Ef35C61c3";
// export const MARKET_FACTORY_ADDRESS =
//   "0x75fA39CD9eb6e88757652a593A3C9Ff2986306Ec";

// ZIRCUIT GARFIELD TESTNET
// export const MOCK_USDC_ADDRESS = "0x7324383017D9A314e39C95073229E3e52d69DF74";
// export const MARKET_FACTORY_ADDRESS =
//   "0xC87a13685Cc147cB3dbe901A5baD7af6186BB0Ac";

// SEPOLIA TESTNET
export const MOCK_USDC_ADDRESS = "0x6066777554230d18270f05cF4024779C4269618a";
export const MARKET_FACTORY_ADDRESS =
  "0x1D7bA3B297A596ac8B211D9B5A194EBC59735779";

// Market type enum (matches contract)
export enum MarketType {
  Challenge = 0,
  ConstantProduct = 1,
}

// Export types for TypeScript
export type MarketFactoryABI = typeof MarketFactoryABI;
export type TwoPartyMarketABI = typeof TwoPartyMarketABI;
export type ConstantProductMarketABI = typeof ConstantProductMarketABI;
export type MockUSDCABI = typeof MockUSDCABI;
export type MarketABI = typeof MarketABI;
