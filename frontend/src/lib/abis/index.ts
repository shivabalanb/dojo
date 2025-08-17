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

// Contract addresses (update these when you redeploy)
export const MARKET_FACTORY_ADDRESS =
  "0x91E4BB2C245109e313e72907990f0b785eae67e4" as const;

// MockUSDC address - update this when you deploy MockUSDC
export const MOCK_USDC_ADDRESS =
  "0xB3C359fbe59416827B4cB7Df1b82538CE8293944" as const; // Replace with deployed address

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
