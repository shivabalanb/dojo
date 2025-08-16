"use client";

import { useState } from "react";
import {
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useAccount,
} from "wagmi";
import { parseEther, formatEther } from "viem";
import { MarketABI } from "../lib/abis/Market";

interface MarketCardProps {
  address: `0x${string}`;
  question: string;
}

export function MarketCard({ address, question }: MarketCardProps) {
  const { address: userAddress } = useAccount();
  const [betAmount, setBetAmount] = useState("");
  const [shareAmount, setShareAmount] = useState("");
  const [selectedOutcome, setSelectedOutcome] = useState<"yes" | "no">("yes");
  const [isLoading, setIsLoading] = useState(false);

  console.log("Market card address:", address);



  // Read market data
  const { data: outcome } = useReadContract({
    address,
    abi: MarketABI,
    functionName: "outcome",
  });

  const { data: endTime } = useReadContract({
    address,
    abi: MarketABI,
    functionName: "endTime",
  });

  const { data: yesPool } = useReadContract({
    address,
    abi: MarketABI,
    functionName: "yesPool",
  });

  const { data: noPool } = useReadContract({
    address,
    abi: MarketABI,
    functionName: "noPool",
  });

  const { data: yesStake } = useReadContract({
    address,
    abi: MarketABI,
    functionName: "yesStake",
    args: userAddress ? [userAddress] : undefined,
  });

  const { data: noStake } = useReadContract({
    address,
    abi: MarketABI,
    functionName: "noStake",
    args: userAddress ? [userAddress] : undefined,
  });

  const { data: resolver } = useReadContract({
    address,
    abi: MarketABI,
    functionName: "resolver",
  });

  // Write functions
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash,
    });

  // Helper functions
  const isMarketClosed = () => {
    if (!endTime) return false;
    return Date.now() / 1000 > Number(endTime);
  };

  const isResolved = () => outcome !== 0; // Outcome.Unresolved = 0

  const getOutcomeText = () => {
    if (outcome === 1) return "YES";
    if (outcome === 2) return "NO";
    return "Unresolved";
  };

  const canClaim = () => {
    if (!isResolved() || !yesStake || !noStake) return false;
    return Number(yesStake) > 0 || Number(noStake) > 0;
  };

  const getWinningChance = () => {
    if (!yesPool || !noPool) return { yes: 50, no: 50 };
    const total = Number(yesPool) + Number(noPool);
    if (total === 0) return { yes: 50, no: 50 };
    return {
      yes: Math.round((Number(noPool) / total) * 100),
      no: Math.round((Number(yesPool) / total) * 100),
    };
  };

  // Calculate share prices (like Polymarket)
  const getSharePrices = () => {
    const chances = getWinningChance();
    return {
      yesPrice: chances.yes / 100, // Convert % to decimal (e.g., 33% → 0.33)
      noPrice: chances.no / 100, // Convert % to decimal (e.g., 67% → 0.67)
    };
  };

  // Get current price based on selected outcome
  const { yesPrice, noPrice } = getSharePrices();
  const currentPrice = selectedOutcome === "yes" ? yesPrice : noPrice;

  // Calculate total cost in USD (shares × price per share)
  const calculateTotalCost = (shares: string): number => {
    if (!shares || currentPrice === 0) return 0;
    return parseFloat(shares) * currentPrice;
  };

  // Calculate potential payout if user's side wins
  const calculatePotentialPayout = (shares: string): number => {
    if (!shares) return 0;
    // Each share pays out $1 if it wins
    return parseFloat(shares) * 1.0;
  };

  // Calculate potential profit
  const calculatePotentialProfit = (shares: string): number => {
    if (!shares) return 0;
    const payout = calculatePotentialPayout(shares);
    const cost = calculateTotalCost(shares);
    return payout - cost;
  };

  // Update share amount and calculate cost
  const handleShareChange = (shares: string) => {
    setShareAmount(shares);
    // No longer need betAmount for ETH
  };

  // Contract interactions
  const buyYes = async () => {
    if (!shareAmount) return;
    const totalCost = calculateTotalCost(shareAmount);
    if (totalCost <= 0) return;

    setIsLoading(true);
    try {
      // TODO: Update to use USDC contract interaction
      // For now, convert USD to ETH equivalent for testing
      const ethEquivalent = (totalCost / 2000).toString(); // Assuming 1 ETH = $2000
      writeContract({
        address,
        abi: MarketABI,
        functionName: "buyYes",
        value: parseEther(ethEquivalent),
      });
    } catch (err) {
      console.error("Error buying YES:", err);
    }
    setIsLoading(false);
  };

  const buyNo = async () => {
    if (!shareAmount) return;
    const totalCost = calculateTotalCost(shareAmount);
    if (totalCost <= 0) return;

    setIsLoading(true);
    try {
      // TODO: Update to use USDC contract interaction
      // For now, convert USD to ETH equivalent for testing
      const ethEquivalent = (totalCost / 2000).toString(); // Assuming 1 ETH = $2000
      writeContract({
        address,
        abi: MarketABI,
        functionName: "buyNo",
        value: parseEther(ethEquivalent),
      });
    } catch (err) {
      console.error("Error buying NO:", err);
    }
    setIsLoading(false);
  };

  const claim = async () => {
    setIsLoading(true);
    try {
      writeContract({
        address,
        abi: MarketABI,
        functionName: "claim",
      });
    } catch (err) {
      console.error("Error claiming:", err);
    }
    setIsLoading(false);
  };

  const resolve = async (resolveOutcome: number) => {
    setIsLoading(true);
    try {
      writeContract({
        address,
        abi: MarketABI,
        functionName: "resolve",
        args: [resolveOutcome],
      });
    } catch (err) {
      console.error("Error resolving:", err);
    }
    setIsLoading(false);
  };

  const chances = getWinningChance();

  return (
    <div className="bg-white rounded-lg border shadow-sm p-6 text-black">
      {/* Market Info */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{question}</h3>
        <div className="flex justify-between text-sm text-gray-600">
          <span>Market:{address}</span>
          <span>
            Status:{" "}
            {isResolved()
              ? `Resolved: ${getOutcomeText()}`
              : isMarketClosed()
                ? "Closed"
                : "Active"}
          </span>
        </div>
        {endTime && (
          <div className="text-sm text-gray-600 mt-1">
            Ends:{" "}
            {new Date(Number(endTime) * 1000).toLocaleString(undefined, {
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="space-y-3">
        {/* Polymarket-style Betting Interface */}
        {!isMarketClosed() && !isResolved() && (
          <div className="space-y-4">
            {/* Outcome Selection */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setSelectedOutcome("yes")}
                className={`p-3 rounded-lg border-2 transition-all ${
                  selectedOutcome === "yes"
                    ? "border-green-500 bg-green-50"
                    : "border-gray-200 hover:border-green-300"
                }`}
              >
                <div className="text-center">
                  <div className="font-semibold text-green-600">YES</div>
                  <div className="text-sm text-gray-600">
                    {yesPrice.toFixed(2)}¢
                  </div>
                  <div className="text-xs text-gray-500">
                    {getWinningChance().yes}% chance
                  </div>
                </div>
              </button>
              <button
                onClick={() => setSelectedOutcome("no")}
                className={`p-3 rounded-lg border-2 transition-all ${
                  selectedOutcome === "no"
                    ? "border-red-500 bg-red-50"
                    : "border-gray-200 hover:border-red-300"
                }`}
              >
                <div className="text-center">
                  <div className="font-semibold text-red-600">NO</div>
                  <div className="text-sm text-gray-600">
                    {noPrice.toFixed(2)}¢
                  </div>
                  <div className="text-xs text-gray-500">
                    {getWinningChance().no}% chance
                  </div>
                </div>
              </button>
            </div>

            {/* Share Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Buy {selectedOutcome.toUpperCase()} shares at{" "}
                {(currentPrice * 100).toFixed(1)}¢ each
              </label>
              <input
                type="number"
                placeholder="Number of shares"
                value={shareAmount}
                onChange={(e) => handleShareChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
              />
              <div className="space-y-1 text-xs text-gray-500">
                <div>
                  Total Cost: ${calculateTotalCost(shareAmount).toFixed(2)} USDC
                </div>
                {shareAmount && (
                  <>
                    <div className="text-green-600">
                      Max Payout: $
                      {calculatePotentialPayout(shareAmount).toFixed(2)} USDC
                    </div>
                    <div className="text-blue-600">
                      Potential Profit: $
                      {calculatePotentialProfit(shareAmount).toFixed(2)} USDC
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Buy Button */}
            <button
              onClick={selectedOutcome === "yes" ? buyYes : buyNo}
              disabled={!shareAmount || isPending || isLoading}
              className={`w-full px-4 py-3 text-white rounded-md font-medium disabled:bg-gray-400 ${
                selectedOutcome === "yes"
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-red-600 hover:bg-red-700"
              }`}
            >
              {isLoading
                ? "Processing..."
                : `Buy ${shareAmount || "0"} ${selectedOutcome.toUpperCase()} shares for $${calculateTotalCost(shareAmount).toFixed(2)}`}
            </button>
          </div>
        )}

        {/* Claim Button */}
        {isResolved() && canClaim() && (
          <button
            onClick={claim}
            disabled={isPending || isLoading}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
          >
            Claim Winnings
          </button>
        )}

        {/* Resolve Buttons (for resolvers) */}
        {isMarketClosed() && !isResolved() && resolver === userAddress && (
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => resolve(1)}
              disabled={isPending || isLoading}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
            >
              Resolve YES
            </button>
            <button
              onClick={() => resolve(2)}
              disabled={isPending || isLoading}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400"
            >
              Resolve NO
            </button>
          </div>
        )}
      </div>

      {/* Transaction Status */}
      {isPending && (
        <div className="mt-3 text-sm text-blue-600">Transaction pending...</div>
      )}
      {isConfirming && (
        <div className="mt-3 text-sm text-yellow-600">
          Confirming transaction...
        </div>
      )}
      {isConfirmed && (
        <div className="mt-3 text-sm text-green-600">
          Transaction confirmed!
        </div>
      )}
      {error && (
        <div className="mt-3 text-sm text-red-600">Error: {error.message}</div>
      )}
    </div>
  );
}
