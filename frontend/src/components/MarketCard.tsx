"use client";

import { useState, useEffect } from "react";
import {
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useAccount,
} from "wagmi";
import { parseEther, formatEther } from "viem";
import { MarketABI } from "@/lib/abis";

interface MarketCardProps {
  address: `0x${string}`;
  question?: string; // Make optional since we'll fetch from DB using marketIndex
}

export function MarketCard({
  address,
  question: propQuestion,
}: MarketCardProps) {
  const { address: userAddress } = useAccount();
  const [shareAmount, setShareAmount] = useState("");
  const [selectedOutcome, setSelectedOutcome] = useState<"yes" | "no">("yes");
  const [isLoading, setIsLoading] = useState(false);
  const [dbQuestion, setDbQuestion] = useState<string | null>(null);

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
  }) as { data: bigint | undefined };

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

  const { data: marketIndex } = useReadContract({
    address,
    abi: MarketABI,
    functionName: "marketIndex",
  });

  const { data: marketState } = useReadContract({
    address,
    abi: MarketABI,
    functionName: "marketState",
  });

  const { data: creator } = useReadContract({
    address,
    abi: MarketABI,
    functionName: "creator",
  });

  const { data: creatorYesAmount } = useReadContract({
    address,
    abi: MarketABI,
    functionName: "initialYesAmount",
  }) as { data: bigint | undefined };

  const { data: creatorNoAmount } = useReadContract({
    address,
    abi: MarketABI,
    functionName: "initialNoAmount",
  }) as { data: bigint | undefined };

  const { data: creatorChoice } = useReadContract({
    address,
    abi: MarketABI,
    functionName: "creatorChoice",
  }) as { data: number | undefined };

  // Fetch question from database using marketIndex
  useEffect(() => {
    if (marketIndex !== undefined) {
      fetch(`/api/markets?index=${marketIndex}`)
        .then((res) => res.json())
        .then((data) => {
          if (data && data.question) {
            setDbQuestion(data.question);
          }
        })
        .catch((err) => {
          console.error("Failed to fetch market question:", err);
        });
    }
  }, [marketIndex]);

  // Use database question if available, fallback to prop, then generic
  const displayQuestion =
    dbQuestion || propQuestion || `Market ${Number(marketIndex) + 1}`;

  // Helper functions for market states
  const isWaitingForOpponent = () => marketState === 0; // WaitingForOpponent
  const isActiveMarket = () => marketState === 1; // Active

  // Calculate required amount for opponent
  const getRequiredOpponentAmount = (): bigint | null => {
    if (!creatorYesAmount || !creatorNoAmount || creatorChoice === undefined)
      return null;
    return creatorChoice === 1 ? creatorNoAmount : creatorYesAmount;
  };

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

  const isOutcomeResolved = () => outcome !== 0; // Outcome.Unresolved = 0

  const getOutcomeText = () => {
    if (outcome === 1) return "YES";
    if (outcome === 2) return "NO";
    return "Unresolved";
  };

  const canClaim = () => {
    if (!isOutcomeResolved() || !userAddress) return false;

    // Handle both old and new contract formats
    const yesStakeValue = yesStake ? Number(yesStake) : 0;
    const noStakeValue = noStake ? Number(noStake) : 0;

    // Check if user is on the winning side
    if (outcome === 1) {
      // YES won
      return yesStakeValue > 0;
    } else if (outcome === 2) {
      // NO won
      return noStakeValue > 0;
    }

    return false; // Market not resolved or invalid outcome
  };

  const getWinningChance = () => {
    if (!yesPool || !noPool) return { yes: 50, no: 50 };
    const total = Number(yesPool) + Number(noPool);
    if (total === 0) return { yes: 50, no: 50 };
    return {
      yes: Math.round((Number(yesPool) / total) * 100),
      no: Math.round((Number(noPool) / total) * 100),
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

  const resolveWithAI = async () => {
    setIsLoading(true);
    try {
      // First, get AI resolution
      console.log("🤖 Requesting AI resolution...");
      const aiResponse = await fetch("/api/ai-resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: displayQuestion,
          marketAddress: address,
          endTime: Number(endTime),
          context: `Market ends: ${new Date(Number(endTime) * 1000).toLocaleString()}`,
        }),
      });

      if (!aiResponse.ok) {
        throw new Error("AI resolution failed");
      }

      const aiResult = await aiResponse.json();
      console.log("🎯 AI Result:", aiResult);

      if (!aiResult.success) {
        throw new Error(aiResult.error || "AI resolution failed");
      }

      // Convert AI outcome to contract format
      const outcomeValue = aiResult.outcome === "YES" ? 1 : 2;

      // Call contract with AI resolution
      writeContract({
        address,
        abi: MarketABI,
        functionName: "resolveWithAI",
        args: [outcomeValue, aiResult.reasoning],
      });
    } catch (err) {
      console.error("Error with AI resolution:", err);
    }
    setIsLoading(false);
  };

  const acceptChallenge = async () => {
    const requiredAmount = getRequiredOpponentAmount();
    if (!requiredAmount) return;

    setIsLoading(true);
    try {
      writeContract({
        address,
        abi: MarketABI,
        functionName: "acceptChallenge",
        value: requiredAmount,
      });
    } catch (err) {
      console.error("Error accepting challenge:", err);
    }
    setIsLoading(false);
  };

  return (
    <div className="bg-white rounded-lg border shadow-sm p-6 text-black">
      {/* Market Info */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {displayQuestion}
        </h3>
        <div className="flex justify-between text-sm text-gray-600">
          <span>Market:{address}</span>
          <span>
            Status:{" "}
            {isOutcomeResolved()
              ? `Resolved: ${getOutcomeText()}`
              : isWaitingForOpponent()
                ? "Waiting for Opponent"
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
        {/* Accept Challenge (for waiting markets) */}
        {isWaitingForOpponent() && userAddress !== creator && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h4 className="text-md font-semibold text-yellow-800 mb-2">
              Accept Challenge
            </h4>
            <p className="text-sm text-yellow-700 mb-3">
              Creator bet{" "}
              {formatEther(
                creatorChoice === 1
                  ? creatorYesAmount || BigInt(0)
                  : creatorNoAmount || BigInt(0)
              )}{" "}
              ETH on {creatorChoice === 1 ? "YES" : "NO"}. You need{" "}
              {formatEther(getRequiredOpponentAmount() || BigInt(0))} ETH to bet
              on {creatorChoice === 1 ? "NO" : "YES"}.
            </p>
            <button
              onClick={acceptChallenge}
              disabled={isPending || isLoading}
              className="w-full px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:bg-gray-400"
            >
              Accept Challenge (
              {formatEther(getRequiredOpponentAmount() || BigInt(0))} ETH)
            </button>
          </div>
        )}

        {/* Waiting for opponent message (for creator) */}
        {isWaitingForOpponent() && userAddress === creator && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="text-md font-semibold text-blue-800 mb-2">
              Waiting for Opponent
            </h4>
            <p className="text-sm text-blue-700">
              You bet{" "}
              {formatEther(
                creatorChoice === 1
                  ? creatorYesAmount || BigInt(0)
                  : creatorNoAmount || BigInt(0)
              )}{" "}
              ETH on {creatorChoice === 1 ? "YES" : "NO"}. Waiting for someone
              to bet {formatEther(getRequiredOpponentAmount() || BigInt(0))} ETH
              on {creatorChoice === 1 ? "NO" : "YES"}.
            </p>
          </div>
        )}

        {/* Polymarket-style Betting Interface */}
        {!isMarketClosed() && !isOutcomeResolved() && isActiveMarket() && (
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

        {/* Claim Button (Winners Only) */}
        {isOutcomeResolved() && canClaim() && userAddress && (
          <button
            onClick={claim}
            disabled={isPending || isLoading}
            className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 font-semibold"
          >
            🎉 Claim Your Winnings
          </button>
        )}

        {/* Message for Losers */}
        {isOutcomeResolved() &&
          userAddress &&
          !canClaim() &&
          (Number(yesStake) > 0 || Number(noStake) > 0) && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-center">
              <p className="text-red-700 font-medium">
                😔 You bet on {Number(yesStake) > 0 ? "YES" : "NO"} but the
                market resolved to {getOutcomeText()}
              </p>
              <p className="text-red-600 text-sm mt-1">
                Better luck next time!
              </p>
            </div>
          )}

        {/* AI Resolution Button (anyone can use after 1 minute) */}
        {isMarketClosed() &&
          !isOutcomeResolved() &&
          isActiveMarket() &&
          endTime &&
          Date.now() / 1000 > Number(endTime) + 60 && ( // 1 minute after market ends
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="text-md font-semibold text-blue-800 mb-2">
                🤖 AI Resolution Available
              </h4>
              <p className="text-sm text-blue-700 mb-3">
                Market has been closed for over 1 minute. Anyone can trigger
                AI-powered resolution.
              </p>
              <button
                onClick={resolveWithAI}
                disabled={isPending || isLoading}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 flex items-center justify-center gap-2"
              >
                {isLoading ? "Analyzing..." : "🧠 Resolve with AI"}
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
