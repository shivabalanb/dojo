export { MarketABI } from './Market';
export { MarketFactoryABI } from './MarketFactory';

// Contract addresses - deployed on Anvil localhost
export const CONTRACTS = {
  MARKET_FACTORY: '0x5FbDB2315678afecb367f032d93F642f64180aa3', // Deployed on Anvil
} as const;

// Outcome enum for type safety
export enum Outcome {
  Unresolved = 0,
  Yes = 1,
  No = 2,
}