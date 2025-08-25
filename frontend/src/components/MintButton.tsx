"use client";

import { useState } from "react";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { MOCK_USDC_ADDRESS, MockUSDCABI } from "../lib/abis";

export function MintButton() {
  const { address, isConnected } = useAccount();
  const [isMinting, setIsMinting] = useState(false);

  const { writeContract, data: hash, isPending } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const handleMint = async () => {
    if (!isConnected || !address) {
      alert("Please connect your wallet first");
      return;
    }

    setIsMinting(true);
    try {
      // Mint 10 USDC (10 * 1e6 = 10,000,000)
      writeContract({
        address: MOCK_USDC_ADDRESS as `0x${string}`,
        abi: MockUSDCABI,
        functionName: "mint",
        args: [address, 10_000_000n], // 10 USDC in wei (6 decimals)
      });
    } catch (error) {
      console.error("Mint error:", error);
      alert("Failed to mint USDC. Please try again.");
    } finally {
      setIsMinting(false);
    }
  };

  const isLoading = isPending || isConfirming || isMinting;

  return (
    <button
      onClick={handleMint}
      disabled={!isConnected || isLoading}
      className="px-4 h-12 rounded-2xl bg-green-600 text-white text-sm font-extrabold shadow-lg disabled:bg-slate-300 hover:bg-green-700 transition-colors"
    >
      {!isConnected
        ? "Connect Wallet"
        : isLoading
          ? "Minting..."
          : "Mint 10 USDC"}
    </button>
  );
}
