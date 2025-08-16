import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import {
  arbitrum,
  mainnet,
  sepolia,
} from 'wagmi/chains';
import { defineChain } from 'viem';

// Define Anvil localhost chain
const anvilLocalhost = defineChain({
  id: 31337,
  name: 'Anvil Localhost',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: ['http://localhost:8545'],
    },
  },
  blockExplorers: {
    default: { name: 'Anvil', url: 'http://localhost:8545' },
  },
  contracts: {
    ensRegistry: {
      address: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e',
    },
    ensUniversalResolver: {
      address: '0xE4Acdd618deED4e6d2f03b9bf62dc6118FC9A4da',
      blockCreated: 16773775,
    },
    multicall3: {
      address: '0xca11bde05977b3631167028862be2a173976ca11',
      blockCreated: 14353601,
    },
  },
});

export const config = getDefaultConfig({
  appName: 'Kleos Markets',
  projectId: 'YOUR_PROJECT_ID', // Get this from WalletConnect Cloud
  chains: [anvilLocalhost, mainnet, arbitrum, sepolia],
  ssr: true, // If your dApp uses server side rendering (SSR)
});