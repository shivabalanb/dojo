"use client";

import { useState } from "react";
import {
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useAccount,
} from "wagmi";

import { formatUnits, parseUnits } from "viem";

import {
  ConstantProductMarketABI,
  MOCK_USDC_ADDRESS,
  MockUSDCABI,
} from "@/lib/abis";

interface MarketCardProps {
  address: `0x${string}`;
  endTime: number;
  outcome: number;
  marketState: number;
  title?: string;
  question?: string;
}

export function MarketCard({
  address,
  endTime,
  outcome,
  marketState,
  title,
  question,
}: MarketCardProps) {
  const { address: userAddress } = useAccount();
  const [isLoading, setIsLoading] = useState(false);

  // Constant Product-specific state
  const [lmsrAmount, setLmsrAmount] = useState("");
  const [sellShares, setSellShares] = useState("");
  const [activeTab, setActiveTab] = useState<"BUY" | "SELL" | "HOLDINGS">(
    "BUY"
  );

  const dynamicABI = ConstantProductMarketABI;

  // Constant Product-specific data (only for Constant Product markets)
  const { data: userYesShares } = useReadContract({
    address,
    abi: dynamicABI,
    functionName: "yesShares",
    args: userAddress ? [userAddress] : undefined,
  }) as { data: bigint | undefined };

  const { data: userNoShares } = useReadContract({
    address,
    abi: dynamicABI,
    functionName: "noShares",
    args: userAddress ? [userAddress] : undefined,
  }) as { data: bigint | undefined };

  // Read price data
  const { data: yesProb } = useReadContract({
    address,
    abi: dynamicABI,
    functionName: "priceYes",
  }) as { data: bigint | undefined };

  const { data: noProb } = useReadContract({
    address,
    abi: dynamicABI,
    functionName: "priceNo",
  }) as { data: bigint | undefined };

  // Calculate shares for the input USDC amount based on current market price
  const getSharesForAmount = (usdcAmount: string, isYes: boolean) => {
    if (!usdcAmount || !yesProb || !noProb || Number(usdcAmount) === 0)
      return "";
    const amount = Number(usdcAmount);
    const price = isYes ? Number(yesProb) / 1e18 : Number(noProb) / 1e18;
    const shares = amount / price;
    return shares.toFixed(2);
  };

  // Calculate shares for quotes
  const sharesForYes = lmsrAmount
    ? parseUnits(getSharesForAmount(lmsrAmount, true), 6)
    : BigInt(0);
  const sharesForNo = lmsrAmount
    ? parseUnits(getSharesForAmount(lmsrAmount, false), 6)
    : BigInt(0);

  // Quote functions - these take shares as input and return USDC cost
  const { data: quoteYes } = useReadContract({
    address,
    abi: dynamicABI,
    functionName: "quoteBuyYes",
    args: [sharesForYes],
  }) as { data: bigint | undefined };

  const { data: quoteNo } = useReadContract({
    address,
    abi: dynamicABI,
    functionName: "quoteBuyNo",
    args: [sharesForNo],
  }) as { data: bigint | undefined };

  // Check current allowance for infinite approval
  const { data: currentAllowance } = useReadContract({
    address: MOCK_USDC_ADDRESS,
    abi: MockUSDCABI,
    functionName: "allowance",
    args: [userAddress as `0x${string}`, address],
    query: { enabled: !!userAddress && !!address },
  }) as { data: bigint | undefined };

  const displayTitle = question || "Market";

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

  // Check if market is active
  const isActive = !isMarketClosed() && !isOutcomeResolved();

  // Check if market is closed but not resolved
  const isClosedButNotResolved = isMarketClosed() && !isOutcomeResolved();

  // Check if user can claim (has winning shares)
  const canClaim = () => {
    if (!isOutcomeResolved()) return false;
    if (outcome === 1 && userYesShares && userYesShares > 0) return true; // YES won, user has YES shares
    if (outcome === 2 && userNoShares && userNoShares > 0) return true; // NO won, user has NO shares
    return false;
  };

  // Quick buy function for the new buttons
  const handleBuyShares = async (isYes: boolean) => {
    if (!userAddress || !lmsrAmount) return;

    setIsLoading(true);
    try {
      // Calculate shares for the USDC amount
      const estimatedShares = getSharesForAmount(lmsrAmount, isYes);
      const sharesAmount = parseUnits(estimatedShares, 6);

      // Get the actual cost from the quote
      const quote = isYes ? quoteYes : quoteNo;
      if (!quote) {
        console.error("No quote available");
        return;
      }

      // Buy shares directly (approval handled by separate button)
      writeContract({
        address,
        abi: dynamicABI,
        functionName: isYes ? "buyYes" : "buyNo",
        args: [sharesAmount],
      });
    } catch (err) {
      console.error(`Error buying ${isYes ? "YES" : "NO"} shares:`, err);
    }
    setIsLoading(false);
  };

  const handleSellShares = async (isYes: boolean) => {
    if (!userAddress || !sellShares) return;

    setIsLoading(true);
    try {
      // Convert shares input directly to the correct format
      const sharesAmount = parseUnits(sellShares, 6);

      // Sell shares
      writeContract({
        address,
        abi: dynamicABI,
        functionName: isYes ? "sellYes" : "sellNo",
        args: [sharesAmount],
      });
    } catch (err) {
      console.error(`Error selling ${isYes ? "YES" : "NO"} shares:`, err);
    }
    setIsLoading(false);
  };

  // AI Resolution function
  const handleAIResolve = async () => {
    if (!userAddress || !question) return;

    setIsLoading(true);
    try {
      // Call AI resolution API
      const response = await fetch("/api/ai-resolve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question,
          marketAddress: address,
          endTime: endTime,
        }),
      });

      if (!response.ok) {
        throw new Error("AI resolution failed");
      }

      const aiResult = await response.json();
      console.log("🤖 AI Resolution Result:", aiResult);

      if (aiResult.success && aiResult.outcome) {
        // Convert AI outcome to contract outcome
        const contractOutcome = aiResult.outcome === "YES" ? 1 : 2;

        // Call contract resolve function
        writeContract({
          address,
          abi: dynamicABI,
          functionName: "resolve",
          args: [contractOutcome],
        });
      } else {
        throw new Error("AI resolution returned invalid result");
      }
    } catch (err) {
      console.error("Error with AI resolution:", err);
    }
    setIsLoading(false);
  };

  const handleClaim = async () => {
    if (!userAddress) return;

    setIsLoading(true);
    try {
      writeContract({
        address,
        abi: dynamicABI,
        functionName: "claim",
        args: [],
      });
    } catch (err) {
      console.error(`Error claiming payout:`, err);
    }
    setIsLoading(false);
  };

  return (
    <div className="bg-white rounded-2xl border-2 border-gray-100 shadow-lg p-8 text-black hover:shadow-xl transition-all duration-300">
      {/* Market Info */}
      <div className="mb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-2xl font-bold text-gray-900 leading-tight">
              {displayTitle}
            </h3>
          </div>
          <div
            className={`px-4 py-2 rounded-full text-sm font-bold ${"bg-purple-100 text-purple-700 border-2 border-purple-200"}`}
          >
            {"🤖 AMM"}
          </div>
        </div>

        {/* Simplified Status Display */}
        <div className="flex justify-between items-center mb-4">
          <div className="text-lg font-semibold text-gray-700">
            {isMarketClosed() ? "⏰ Closed" : "🟢 Active"}
          </div>
          {endTime && (
            <div className="text-lg font-medium text-gray-600">
              Ends:{" "}
              {new Date(Number(endTime) * 1000).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          )}
        </div>

        {/* Trading Interface for Constant Product Markets */}
        {userAddress && isActive && (
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-xl border-2 border-purple-200">
            <div className="text-center mb-3">
              <div className="text-sm font-medium text-purple-700 mb-1">
                Quick Trade
              </div>
            </div>

            {/* Current Share Prices */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-gradient-to-br from-green-100 to-emerald-100 p-3 rounded-xl text-center border-2 border-green-200">
                <div className="font-bold text-green-800 text-sm mb-1">
                  YES Price
                </div>
                <div className="text-xl font-bold text-green-600">
                  ${yesProb ? (Number(yesProb) / 1e18).toFixed(2) : "0.50"}
                </div>
              </div>
              <div className="bg-gradient-to-br from-red-100 to-pink-100 p-3 rounded-xl text-center border-2 border-red-200">
                <div className="font-bold text-red-800 text-sm mb-1">
                  NO Price
                </div>
                <div className="text-xl font-bold text-red-600">
                  ${noProb ? (Number(noProb) / 1e18).toFixed(2) : "0.50"}
                </div>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex mb-4 bg-white rounded-lg p-1 border-2 border-purple-200">
              {(["BUY", "SELL", "HOLDINGS"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-2 px-3 rounded-md text-sm font-bold transition-colors ${
                    activeTab === tab
                      ? "bg-purple-500 text-white shadow-sm"
                      : "text-purple-700 hover:bg-purple-100"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            {activeTab === "BUY" && (
              <div>
                {/* Amount Input */}
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-purple-700 mb-2">
                    Amount to Buy (USDC)
                  </label>
                  <input
                    type="number"
                    placeholder="Enter USDC amount..."
                    value={lmsrAmount}
                    onChange={(e) => setLmsrAmount(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-purple-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-lg font-medium"
                    min="0"
                    step="0.01"
                  />
                </div>

                {/* Approve Button - Show if approval is needed */}
                {currentAllowance !== undefined &&
                  currentAllowance <
                    BigInt(
                      "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
                    ) && (
                    <div className="mb-3">
                      <button
                        onClick={() => {
                          const MAX_UINT256 = BigInt(
                            "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
                          );
                          writeContract({
                            address: MOCK_USDC_ADDRESS,
                            abi: MockUSDCABI,
                            functionName: "approve",
                            args: [address, MAX_UINT256],
                          });
                        }}
                        disabled={isPending || isLoading}
                        className="w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg hover:from-blue-600 hover:to-indigo-600 disabled:bg-gray-400 text-lg font-bold shadow-lg hover:shadow-xl transition-all duration-300"
                      >
                        🔓 Approve Infinite USDC Spending
                      </button>
                      <p className="text-xs text-blue-600 text-center mt-1">
                        One-time approval for all future trades on this market
                      </p>
                    </div>
                  )}

                {/* Buy Buttons */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleBuyShares(true)}
                    disabled={!lmsrAmount || isPending || isLoading}
                    className="px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 disabled:bg-gray-400 text-lg font-bold shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    Buy YES
                  </button>
                  <button
                    onClick={() => handleBuyShares(false)}
                    disabled={!lmsrAmount || isPending || isLoading}
                    className="px-4 py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-lg hover:from-red-600 hover:to-pink-600 disabled:bg-gray-400 text-lg font-bold shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    Buy NO
                  </button>
                </div>
              </div>
            )}

            {activeTab === "SELL" && (
              <div>
                {/* Your Current Holdings */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-3 rounded-lg border border-green-200">
                    <div className="text-center">
                      <div className="text-sm font-semibold text-green-700 mb-1">
                        Your YES Shares
                      </div>
                      <div className="text-xl font-bold text-green-800">
                        {userYesShares
                          ? formatUnits(userYesShares as bigint, 6)
                          : "0"}
                      </div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-red-50 to-pink-50 p-3 rounded-lg border border-red-200">
                    <div className="text-center">
                      <div className="text-sm font-semibold text-red-700 mb-1">
                        Your NO Shares
                      </div>
                      <div className="text-xl font-bold text-red-800">
                        {userNoShares
                          ? formatUnits(userNoShares as bigint, 6)
                          : "0"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Amount Input for Selling */}
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-purple-700 mb-2">
                    Amount to Sell (Shares)
                  </label>
                  <input
                    type="number"
                    placeholder="Enter number of shares..."
                    value={sellShares}
                    onChange={(e) => setSellShares(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-purple-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-lg font-medium"
                    min="0"
                    step="0.01"
                  />
                </div>

                {/* USDC You'll Get Back */}
                {sellShares && Number(sellShares) > 0 && (
                  <div className="mb-4">
                    <div className="bg-white rounded-lg border-2 border-purple-200 p-3">
                      <div className="text-sm font-semibold text-purple-700 text-center mb-2">
                        💰 USDC You&apos;ll Get Back
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-center">
                        <div>
                          <div className="text-xs text-green-600 font-medium mb-1">
                            Selling YES Shares
                          </div>
                          <div className="text-lg font-bold text-green-700">
                            $
                            {(
                              Number(sellShares) *
                              (Number(yesProb) / 1e18)
                            ).toFixed(2)}{" "}
                            USDC
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-red-600 font-medium mb-1">
                            Selling NO Shares
                          </div>
                          <div className="text-lg font-bold text-red-700">
                            $
                            {(
                              Number(sellShares) *
                              (Number(noProb) / 1e18)
                            ).toFixed(2)}{" "}
                            USDC
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-purple-600 text-center">
                        💡 Actual amount may vary slightly due to slippage
                      </div>
                    </div>
                  </div>
                )}

                {/* Sell Buttons with Validation */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleSellShares(true)}
                    disabled={
                      !sellShares ||
                      isPending ||
                      isLoading ||
                      !userYesShares ||
                      Number(sellShares) >
                        Number(formatUnits(userYesShares as bigint, 6))
                    }
                    className="px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 disabled:bg-gray-400 text-lg font-bold shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    Sell YES
                  </button>
                  <button
                    onClick={() => handleSellShares(false)}
                    disabled={
                      !sellShares ||
                      isPending ||
                      isLoading ||
                      !userNoShares ||
                      Number(sellShares) >
                        Number(formatUnits(userNoShares as bigint, 6))
                    }
                    className="px-4 py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-lg hover:from-red-600 hover:to-pink-600 disabled:bg-gray-400 text-lg font-bold shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    Sell NO
                  </button>
                </div>
              </div>
            )}

            {activeTab === "HOLDINGS" && (
              <div>
                {/* Total Investment Display */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200 p-4 mb-4">
                  <div className="text-center">
                    <div className="text-sm font-semibold text-blue-700 mb-1">
                      💵 Total USDC Invested
                    </div>
                    <div className="text-2xl font-bold text-blue-800">
                      $
                      {(
                        (userYesShares
                          ? Number(formatUnits(userYesShares as bigint, 6))
                          : 0) *
                          (Number(yesProb) / 1e18) +
                        (userNoShares
                          ? Number(formatUnits(userNoShares as bigint, 6))
                          : 0) *
                          (Number(noProb) / 1e18)
                      ).toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                      USDC
                    </div>
                    <div className="text-xs text-blue-600 mt-1">
                      Total value of your current positions
                    </div>
                  </div>
                </div>

                {/* Consolidated Holdings & Payout Display */}
                <div className="bg-white rounded-xl border-2 border-purple-200 p-4">
                  <div className="text-center mb-4">
                    <div className="text-lg font-bold text-purple-800 mb-1">
                      💰 Your Positions & Payouts
                    </div>
                    <div className="text-xs text-purple-600">
                      Current holdings and potential returns
                    </div>
                  </div>

                  {/* Holdings Row */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-3 rounded-lg border border-green-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-green-700">
                          YES Shares
                        </span>
                      </div>
                      <div className="text-2xl font-bold text-green-800">
                        {userYesShares
                          ? formatUnits(userYesShares as bigint, 6)
                          : "0"}
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-red-50 to-pink-50 p-3 rounded-lg border border-red-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-red-700">
                          NO Shares
                        </span>
                      </div>
                      <div className="text-2xl font-bold text-red-800">
                        {userNoShares
                          ? formatUnits(userNoShares as bigint, 6)
                          : "0"}
                      </div>
                    </div>
                  </div>

                  {/* Payout Row */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gradient-to-br from-green-200 to-emerald-200 p-4 rounded-xl border-3 border-green-400 shadow-lg">
                      <div className="text-sm font-semibold text-green-800 mb-2 flex items-center justify-center">
                        🏆 If YES Wins
                      </div>
                      <div className="text-2xl font-bold text-green-900 text-center">
                        {userYesShares
                          ? formatUnits(userYesShares as bigint, 6)
                          : "0"}{" "}
                        USDC
                      </div>
                      {(() => {
                        const yesShares = userYesShares
                          ? Number(formatUnits(userYesShares as bigint, 6))
                          : 0;
                        const noShares = userNoShares
                          ? Number(formatUnits(userNoShares as bigint, 6))
                          : 0;

                        // Calculate total invested based on current market prices
                        const totalInvested =
                          yesShares * (Number(yesProb) / 1e18) +
                          noShares * (Number(noProb) / 1e18);

                        const yesPayout = yesShares;
                        const returnPercent =
                          totalInvested > 0
                            ? ((yesPayout - totalInvested) / totalInvested) *
                              100
                            : 0;
                        return totalInvested > 0 ? (
                          <div
                            className={`text-sm font-medium text-center mt-2 ${returnPercent >= 0 ? "text-green-700" : "text-red-700"}`}
                          >
                            {returnPercent >= 0 ? "+" : ""}
                            {returnPercent.toFixed(2)}%
                          </div>
                        ) : null;
                      })()}
                    </div>
                    <div className="bg-gradient-to-br from-red-200 to-pink-200 p-4 rounded-xl border-3 border-red-400 shadow-lg">
                      <div className="text-sm font-semibold text-red-800 mb-2 flex items-center justify-center">
                        ❌ If NO Wins
                      </div>
                      <div className="text-2xl font-bold text-red-900 text-center">
                        {userNoShares
                          ? formatUnits(userNoShares as bigint, 6)
                          : "0"}{" "}
                        USDC
                      </div>
                      {(() => {
                        const yesShares = userYesShares
                          ? Number(formatUnits(userYesShares as bigint, 6))
                          : 0;
                        const noShares = userNoShares
                          ? Number(formatUnits(userNoShares as bigint, 6))
                          : 0;

                        // Calculate total invested based on current market prices
                        const totalInvested =
                          yesShares * (Number(yesProb) / 1e18) +
                          noShares * (Number(noProb) / 1e18);

                        const noPayout = noShares;
                        const returnPercent =
                          totalInvested > 0
                            ? ((noPayout - totalInvested) / totalInvested) * 100
                            : 0;
                        return totalInvested > 0 ? (
                          <div
                            className={`text-sm font-medium text-center mt-2 ${returnPercent >= 0 ? "text-green-700" : "text-red-700"}`}
                          >
                            {returnPercent >= 0 ? "+" : ""}
                            {returnPercent.toFixed(2)}%
                          </div>
                        ) : null;
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Quote and Price Impact Info - Only show in BUY tab */}
            {activeTab === "BUY" && lmsrAmount && (
              <div className="mt-3 space-y-2">
                {/* Quote Display */}
                <div className="p-3 bg-white rounded-lg border-2 border-purple-200">
                  <div className="text-sm text-purple-700 font-medium text-center mb-2">
                    📊 Shares You&apos;ll Receive
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div>
                      <div className="text-xs text-green-600 font-medium mb-1">
                        YES Shares
                      </div>
                      <div className="text-xl font-bold text-green-700 mb-1">
                        {getSharesForAmount(lmsrAmount, true)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-red-600 font-medium mb-1">
                        NO Shares
                      </div>
                      <div className="text-xl font-bold text-red-700 mb-1">
                        {getSharesForAmount(lmsrAmount, false)}
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-purple-600 text-center">
                    💡 Prices may vary slightly due to slippage
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* AI Resolution Interface - Show when market is closed but not resolved */}
        {userAddress && isClosedButNotResolved && (
          <div className="bg-gradient-to-r from-orange-50 to-red-50 p-4 rounded-xl border-2 border-orange-200 mt-4">
            <div className="text-center mb-3">
              <div className="text-sm font-medium text-orange-700 mb-1">
                🤖 AI Resolution Required
              </div>
              <div className="text-xs text-orange-600">
                Market has ended. Click below to use AI to determine the
                outcome.
              </div>
            </div>

            <button
              onClick={handleAIResolve}
              disabled={isPending || isLoading}
              className="w-full px-4 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-lg hover:from-purple-600 hover:to-indigo-600 disabled:bg-gray-400 text-lg font-bold shadow-lg hover:shadow-xl transition-all duration-300"
            >
              🧠 Resolve with AI
            </button>
          </div>
        )}

        {/* Claim Interface - Show when market is resolved and user can claim */}
        {userAddress && isOutcomeResolved() && canClaim() && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-xl border-2 border-green-200 mt-4">
            <div className="text-center mb-3">
              <div className="text-sm font-medium text-green-700 mb-1">
                🎉 You Won!
              </div>
              <div className="text-xs text-green-600">
                {outcome === 1
                  ? `You have ${userYesShares ? formatUnits(userYesShares as bigint, 6) : "0"} YES shares to claim`
                  : `You have ${userNoShares ? formatUnits(userNoShares as bigint, 6) : "0"} NO shares to claim`}
              </div>
            </div>

            <button
              onClick={handleClaim}
              disabled={isPending || isLoading}
              className="w-full px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 disabled:bg-gray-400 text-lg font-bold shadow-lg hover:shadow-xl transition-all duration-300"
            >
              💰 Claim Payout
            </button>
          </div>
        )}

        {/* Market Resolved - Show outcome for all users */}
        {isOutcomeResolved() && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border-2 border-blue-200 mt-4">
            <div className="text-center">
              <div className="text-lg font-bold text-blue-800 mb-2">
                🏁 Market Resolved
              </div>
              <div className="text-xl font-bold text-blue-900">
                {outcome === 1 ? "YES" : "NO"} Wins!
              </div>
              <div className="text-sm text-blue-600 mt-1">
                {outcome === 1
                  ? "The prediction was correct"
                  : "The prediction was incorrect"}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Transaction Status - Simplified */}
      {isPending && (
        <div className="mt-4 text-center">
          <div className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-lg font-medium">
            ⏳ Transaction pending...
          </div>
        </div>
      )}
      {isConfirming && (
        <div className="mt-4 text-center">
          <div className="inline-flex items-center px-4 py-2 bg-yellow-100 text-yellow-700 rounded-full text-lg font-medium">
            🔄 Confirming transaction...
          </div>
        </div>
      )}
      {isConfirmed && (
        <div className="mt-4 text-center">
          <div className="inline-flex items-center px-4 py-2 bg-green-100 text-green-700 rounded-full text-lg font-medium">
            ✅ Transaction confirmed!
          </div>
        </div>
      )}
      {error && (
        <div className="mt-4 text-center">
          <div className="inline-flex items-center px-4 py-2 bg-red-100 text-red-700 rounded-full text-lg font-medium">
            ❌ Error: {error.message}
          </div>
        </div>
      )}
    </div>
  );
}
