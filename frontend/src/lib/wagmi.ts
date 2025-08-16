import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { arbitrum, mainnet, sepolia } from "wagmi/chains";
import { http } from "wagmi";

export const config = getDefaultConfig({
  appName: "Kleos Markets",
  projectId: "YOUR_PROJECT_ID", // Get this from WalletConnect Cloud
  chains: [mainnet, arbitrum, sepolia],
  transports: {
    [sepolia.id]: http(
      "https://eth-sepolia.g.alchemy.com/v2/euJp53PODQmQLSIuUpjlcMeQNtUBEtvT"
    ),
    [mainnet.id]: http(), // Uses default public RPC
    [arbitrum.id]: http(), // Uses default public RPC
  },
  ssr: true, // If your dApp uses server side rendering (SSR)
});
