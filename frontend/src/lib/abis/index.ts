// Import ABIs from local artifacts
import MarketFactoryArtifact from "../artifacts/MarketFactory.json";
import MarketArtifact from "../artifacts/Market.json";

// Extract ABIs from the build artifacts
export const MarketFactoryABI = MarketFactoryArtifact.abi;
export const MarketABI = MarketArtifact.abi;

// Contract addresses (update these when you redeploy)
export const MARKET_FACTORY_ADDRESS =
  "0xE2DaC61fb5Ba099Db39B814541a4807A442b011e" as const;

// Export types for TypeScript
export type MarketFactoryABI = typeof MarketFactoryABI;
export type MarketABI = typeof MarketABI;
