import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { arbitrum, mainnet, sepolia, flare, flareTestnet } from "wagmi/chains";
import { http } from "wagmi";

export const config = getDefaultConfig({
  appName: "Kleos Markets",
  projectId: "YOUR_PROJECT_ID", // Get this from WalletConnect Cloud
  chains: [mainnet, arbitrum, sepolia, flare, flareTestnet],
  transports: {
    [sepolia.id]: http(
      "https://eth-sepolia.g.alchemy.com/v2/euJp53PODQmQLSIuUpjlcMeQNtUBEtvT"
    ),
    [mainnet.id]: http(), // Uses default public RPC
    [arbitrum.id]: http(), // Uses default public RPC
    [flare.id]: http("https://flare-api.flare.network/ext/C/rpc"),
    [flareTestnet.id]: http("https://coston2-api.flare.network/ext/C/rpc"),
  },
  ssr: true, // If your dApp uses server side rendering (SSR)
});
