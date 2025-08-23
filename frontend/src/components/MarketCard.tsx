"use client";

import { useState, useEffect } from "react";
import {
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useAccount,
} from "wagmi";
import { readContract } from "wagmi/actions";
import { config } from "@/lib/wagmi";
import { parseEther, formatEther, formatUnits, parseUnits } from "viem";
import {
  MarketABI,
  MarketFactoryABI,
  MARKET_FACTORY_ADDRESS,
  LMSRMarketABI,
  MarketType,
  MOCK_USDC_ADDRESS,
  MockUSDCABI,
} from "@/lib/abis";

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

  const [isLoading, setIsLoading] = useState(false);
  const [ftsoPrice, setFtsoPrice] = useState<string | null>(null);
  const [isLoadingPrice, setIsLoadingPrice] = useState(false);
  const [selectedResolutionMethod, setSelectedResolutionMethod] = useState<
    "ftso" | "ai"
  >("ftso");

  // LMSR-specific state
  const [lmsrAmount, setLmsrAmount] = useState("");
  const [sellShares, setSellShares] = useState("");
  const [shareQty, setShareQty] = useState(""); // shares, e.g. "0.8"

  console.log("Market card address:", address);

  // Detect market type
  const { data: marketTypeData } = useReadContract({
    address: MARKET_FACTORY_ADDRESS,
    abi: MarketFactoryABI,
    functionName: "getMarketType",
    args: [address],
  }) as { data: number | undefined };

  // Check if market has LMSR functions (fallback for markets created before market type mapping)
  const { data: hasLMSRFunctions } = useReadContract({
    address,
    abi: LMSRMarketABI,
    functionName: "getYesPrice",
    query: { enabled: marketTypeData === undefined }, // Only check if market type is not set
  });

  const isLMSRMarket = marketTypeData === MarketType.LMSR;
  const dynamicABI = isLMSRMarket ? LMSRMarketABI : MarketABI;

  // Read market data
  const { data: outcome } = useReadContract({
    address,
    abi: dynamicABI,
    functionName: "outcome",
  });

  const { data: endTime } = useReadContract({
    address,
    abi: dynamicABI,
    functionName: "endTime",
  }) as { data: bigint | undefined };

  const { data: yesPool } = useReadContract({
    address,
    abi: dynamicABI,
    functionName: "yesPool",
  });

  const { data: noPool } = useReadContract({
    address,
    abi: dynamicABI,
    functionName: "noPool",
  });

  // Read title and question for LMSR markets
  const { data: title } = useReadContract({
    address,
    abi: dynamicABI,
    functionName: "title",
  });

  const { data: question } = useReadContract({
    address,
    abi: dynamicABI,
    functionName: "question",
  });

  const { data: yesStake } = useReadContract({
    address,
    abi: dynamicABI,
    functionName: "yesStake",
    args: userAddress ? [userAddress] : undefined,
  });

  const { data: noStake } = useReadContract({
    address,
    abi: dynamicABI,
    functionName: "noStake",
    args: userAddress ? [userAddress] : undefined,
  });

  // Read user's USDC balance
  const { data: usdcBalance } = useReadContract({
    address: MOCK_USDC_ADDRESS,
    abi: MockUSDCABI,
    functionName: "balanceOf",
    args: userAddress ? [userAddress] : undefined,
  });

  const { data: marketIndex } = useReadContract({
    address,
    abi: dynamicABI,
    functionName: "marketIndex",
  });

  const { data: marketState } = useReadContract({
    address,
    abi: dynamicABI,
    functionName: "getMarketState",
  });

  const { data: creator } = useReadContract({
    address,
    abi: dynamicABI,
    functionName: "creator",
  });

  const { data: creatorBetAmount } = useReadContract({
    address,
    abi: dynamicABI,
    functionName: "creatorBetAmount",
  }) as { data: bigint | undefined };

  const { data: opponentBetAmount } = useReadContract({
    address,
    abi: dynamicABI,
    functionName: "opponentBetAmount",
  }) as { data: bigint | undefined };

  const { data: creatorChoice } = useReadContract({
    address,
    abi: dynamicABI,
    functionName: "creatorChoice",
  }) as { data: number | undefined };

  // LMSR-specific data (only for LMSR markets)
  const { data: userYesShares } = useReadContract({
    address,
    abi: dynamicABI,
    functionName: "userYesShares",
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: isLMSRMarket && !!userAddress },
  }) as { data: bigint | undefined };

  const { data: userNoShares } = useReadContract({
    address,
    abi: dynamicABI,
    functionName: "userNoShares",
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: isLMSRMarket && !!userAddress },
  }) as { data: bigint | undefined };

  const { data: yesProb } = useReadContract({
    address,
    abi: dynamicABI,
    functionName: "priceYes",
    query: { enabled: isLMSRMarket },
  }) as { data: bigint | undefined };

  const { data: noProb } = useReadContract({
    address,
    abi: dynamicABI,
    functionName: "priceNo",
    query: { enabled: isLMSRMarket },
  }) as { data: bigint | undefined };

  // Check if market has FTSO resolution configured
  const { data: hasFTSOResolution } = useReadContract({
    address,
    abi: dynamicABI,
    functionName: "hasFTSOResolution",
  });

  // Read FTSO parameters
  const { data: ftsoAddress } = useReadContract({
    address,
    abi: dynamicABI,
    functionName: "ftsoAddress",
    query: { enabled: hasFTSOResolution as boolean },
  });

  const { data: ftsoFeedId } = useReadContract({
    address,
    abi: dynamicABI,
    functionName: "ftsoFeedId",
    query: { enabled: hasFTSOResolution as boolean },
  });

  const { data: priceThreshold } = useReadContract({
    address,
    abi: dynamicABI,
    functionName: "priceThreshold",
    query: { enabled: hasFTSOResolution as boolean },
  });

  // Calculate dQ for quotes
  const dQ = shareQty ? parseEther(shareQty) : BigInt(0);

  // Quote functions
  const { data: quoteYes } = useReadContract({
    address,
    abi: dynamicABI,
    functionName: "quoteBuyYes",
    args: [dQ],
    query: { enabled: isLMSRMarket && !!shareQty },
  }) as { data: bigint | undefined };

  const { data: quoteNo } = useReadContract({
    address,
    abi: dynamicABI,
    functionName: "quoteBuyNo",
    args: [dQ],
    query: { enabled: isLMSRMarket && !!shareQty },
  }) as { data: bigint | undefined };

  // Debug LMSR price calls
  console.log("LMSR Debug:", {
    marketTypeData,
    hasLMSRFunctions: hasLMSRFunctions?.toString(),
    isLMSRMarket,
    address,
    dynamicABI: dynamicABI === LMSRMarketABI ? "LMSR" : "TwoParty",
    yesProb: yesProb?.toString(),
    noProb: noProb?.toString(),
  });

  // Fetch FTSO price when market closes (no auto-resolution - let user choose)
  useEffect(() => {
    if (
      endTime &&
      Date.now() / 1000 > Number(endTime) && // Market is closed
      hasFTSOResolution &&
      ftsoAddress &&
      ftsoFeedId &&
      !isOutcomeResolved() && // Only if not already resolved
      !ftsoPrice // Only fetch if not already fetched
    ) {
      fetchFTSOPrice();
    }
  }, [endTime, hasFTSOResolution, ftsoAddress, ftsoFeedId, ftsoPrice, outcome]);

  // Use contract title for LMSR markets, fallback to prop question or generic
  const displayTitle =
    isLMSRMarket && title
      ? title
      : propQuestion || `Market ${Number(marketIndex) + 1}`;

  // Helper functions for market states
  const isWaitingForOpponent = () => {
    if (isLMSRMarket) {
      // LMSR markets don't have "waiting for opponent" - they're either active or ended
      return false;
    }
    return marketState === 0; // WaitingForOpponent (TwoParty only)
  };

  const isActiveMarket = () => {
    // LMSR ms stay Active until resolved
    return marketState === 1; // Active for LMSR
  };

  // Calculate required amount for opponent (TwoParty markets only)
  const getRequiredOpponentAmount = (): bigint | null => {
    if (isLMSRMarket) {
      // LMSR markets don't have opponents
      return null;
    }
    if (!opponentBetAmount || creatorChoice === undefined) return null;
    return opponentBetAmount; // Opponent bet amount based on odds
  };

  // Function to fetch current FTSO price
  const fetchFTSOPrice = async () => {
    if (!ftsoAddress || !ftsoFeedId) return;

    setIsLoadingPrice(true);
    try {
      // FTSO v2 interface for getFeedById
      const ftsoABI = [
        {
          inputs: [
            { internalType: "bytes21", name: "_feedId", type: "bytes21" },
          ],
          name: "getFeedById",
          outputs: [
            { internalType: "uint256", name: "_price", type: "uint256" },
            { internalType: "int8", name: "_decimals", type: "int8" },
            { internalType: "uint64", name: "_timestamp", type: "uint64" },
          ],
          stateMutability: "view",
          type: "function",
        },
      ];

      const result = await readContract(config, {
        address: ftsoAddress as `0x${string}`,
        abi: ftsoABI,
        functionName: "getFeedById",
        args: [ftsoFeedId as `0x${string}`],
      });

      const [price, decimals, timestamp] = result as [bigint, number, bigint];

      // Convert price to actual USD value
      const actualPrice = Number(price) / Math.pow(10, Math.abs(decimals));
      setFtsoPrice(actualPrice.toFixed(2));
    } catch (error) {
      console.error("Failed to fetch FTSO price:", error);
      setFtsoPrice("Error");
    } finally {
      setIsLoadingPrice(false);
    }
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

  // Contract interactions
  const buyYes = async () => {
    if (!shareAmount) return;

    setIsLoading(true);
    try {
      // Convert share amount to USDC (6 decimals)
      const usdcAmount = parseUnits(shareAmount, 6);

      // First approve USDC spending
      writeContract({
        address: MOCK_USDC_ADDRESS,
        abi: MockUSDCABI,
        functionName: "approve",
        args: [address, usdcAmount],
      });

      // Then buy YES shares
      writeContract({
        address,
        abi: dynamicABI,
        functionName: "buyYes",
        args: [usdcAmount],
      });
    } catch (err) {
      console.error("Error buying YES:", err);
    }
    setIsLoading(false);
  };

  const buyNo = async () => {
    if (!shareAmount) return;

    setIsLoading(true);
    try {
      // Convert share amount to USDC (6 decimals)
      const usdcAmount = parseUnits(shareAmount, 6);

      // First approve USDC spending
      writeContract({
        address: MOCK_USDC_ADDRESS,
        abi: MockUSDCABI,
        functionName: "approve",
        args: [address, usdcAmount],
      });

      // Then buy NO shares
      writeContract({
        address,
        abi: dynamicABI,
        functionName: "buyNo",
        args: [usdcAmount],
      });
    } catch (err) {
      console.error("Error buying NO:", err);
    }
    setIsLoading(false);
  };

  // LMSR-specific trading functions
  const buyLMSRYes = async () => {
    if (!lmsrAmount) return;

    setIsLoading(true);
    try {
      // Convert USDC amount to WAD shares
      const sharesWAD = parseEther(lmsrAmount);
      const usdcAmount = parseUnits(lmsrAmount, 6);

      // First approve USDC spending
      writeContract({
        address: MOCK_USDC_ADDRESS,
        abi: MockUSDCABI,
        functionName: "approve",
        args: [address, usdcAmount],
      });

      // Then buy YES shares
      writeContract({
        address,
        abi: dynamicABI,
        functionName: "buyYes",
        args: [sharesWAD],
      });
    } catch (err) {
      console.error("Error buying YES shares:", err);
    }
    setIsLoading(false);
  };

  const buyLMSRNo = async () => {
    if (!lmsrAmount) return;

    setIsLoading(true);
    try {
      // Convert USDC amount to WAD shares
      const sharesWAD = parseEther(lmsrAmount);
      const usdcAmount = parseUnits(lmsrAmount, 6);

      // First approve USDC spending
      writeContract({
        address: MOCK_USDC_ADDRESS,
        abi: MockUSDCABI,
        functionName: "approve",
        args: [address, usdcAmount],
      });

      // Then buy NO shares
      writeContract({
        address,
        abi: dynamicABI,
        functionName: "buyNo",
        args: [sharesWAD],
      });
    } catch (err) {
      console.error("Error buying NO shares:", err);
    }
    setIsLoading(false);
  };

  const sellLMSRYes = async () => {
    if (!sellShares) return;

    setIsLoading(true);
    try {
      writeContract({
        address,
        abi: dynamicABI,
        functionName: "sellYes",
        args: [parseEther(sellShares)],
      });
    } catch (err) {
      console.error("Error selling YES shares:", err);
    }
    setIsLoading(false);
  };

  const sellLMSRNo = async () => {
    if (!sellShares) return;

    setIsLoading(true);
    try {
      writeContract({
        address,
        abi: dynamicABI,
        functionName: "sellNo",
        args: [parseEther(sellShares)],
      });
    } catch (err) {
      console.error("Error selling NO shares:", err);
    }
    setIsLoading(false);
  };

  const claim = async () => {
    setIsLoading(true);
    try {
      writeContract({
        address,
        abi: dynamicABI,
        functionName: "claim",
        args: [],
      });
    } catch (err) {
      console.error("Error claiming:", err);
    }
    setIsLoading(false);
  };

  // AI Resolution function
  const resolveWithAI = async () => {
    try {
      writeContract({
        address,
        abi: dynamicABI,
        functionName: "resolveWithAI",
        args: [],
      });
    } catch (err) {
      console.error("Error resolving with AI:", err);
    }
  };

  // Simple FTSO resolution using stored parameters
  const resolveWithStoredFTSO = async () => {
    try {
      writeContract({
        address,
        abi: dynamicABI,
        functionName: "resolveWithStoredFTSO",
        args: [],
      });
    } catch (err) {
      console.error("Error resolving with stored FTSO:", err);
    }
  };

  const provideInitialBet = async () => {
    setIsLoading(true);
    try {
      // Use the creatorBetAmount from the contract state
      if (!creatorBetAmount) return;

      // First approve USDC spending
      writeContract({
        address: MOCK_USDC_ADDRESS,
        abi: MockUSDCABI,
        functionName: "approve",
        args: [address, creatorBetAmount],
      });

      // Then provide initial bet
      writeContract({
        address,
        abi: dynamicABI,
        functionName: "provideInitialBet",
        args: [],
      });
    } catch (err) {
      console.error("Error providing initial bet:", err);
    }
    setIsLoading(false);
  };

  const acceptChallenge = async () => {
    const requiredAmount = getRequiredOpponentAmount();
    if (!requiredAmount) return;

    setIsLoading(true);
    try {
      // First approve USDC spending
      writeContract({
        address: MOCK_USDC_ADDRESS,
        abi: MockUSDCABI,
        functionName: "approve",
        args: [address, requiredAmount],
      });

      // Then accept the challenge
      writeContract({
        address,
        abi: dynamicABI,
        functionName: "acceptChallenge",
        args: [],
      });
    } catch (err) {
      console.error("Error accepting challenge:", err);
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
            className={`ml-4 px-4 py-2 rounded-full text-sm font-bold ${
              isLMSRMarket
                ? "bg-purple-100 text-purple-700 border-2 border-purple-200"
                : "bg-blue-100 text-blue-700 border-2 border-blue-200"
            }`}
          >
            {isLMSRMarket ? "🤖 LMSR" : "⚔️ Challenge"}
          </div>
        </div>

        {/* Simplified Status Display */}
        <div className="flex justify-between items-center mb-4">
          <div className="text-lg font-semibold text-gray-700">
            {isOutcomeResolved()
              ? `🏆 Resolved: ${getOutcomeText()}`
              : isLMSRMarket
                ? isMarketClosed()
                  ? "⏰ Closed"
                  : "🟢 Active"
                : isWaitingForOpponent()
                  ? "⏳ Waiting for Opponent"
                  : isMarketClosed()
                    ? "⏰ Closed"
                    : "🟢 Active"}
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

        {/* USDC Balance Display - Bigger and more prominent */}
        {userAddress && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-xl border-2 border-green-200">
            <div className="text-center">
              <div className="text-sm font-medium text-green-700 mb-1">
                Your Balance
              </div>
              <div className="text-2xl font-bold text-green-800">
                {usdcBalance ? formatUnits(usdcBalance as bigint, 6) : "0"} USDC
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="space-y-4">
        {/* Accept Challenge (for waiting markets or active markets with only one side bet) - TwoParty markets only */}
        {!isMarketClosed() &&
          (isWaitingForOpponent() ||
            (isActiveMarket() &&
              !isLMSRMarket &&
              ((yesPool as bigint) === BigInt(0) ||
                (noPool as bigint) === BigInt(0)))) &&
          userAddress !== creator &&
          !isLMSRMarket && (
            <div className="p-6 bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-200 rounded-2xl">
              <h4 className="text-xl font-bold text-yellow-800 mb-3 text-center">
                🎯 Accept Challenge
              </h4>
              <p className="text-lg text-yellow-700 mb-4 text-center">
                Creator bet{" "}
                <span className="font-bold">
                  {formatUnits(creatorBetAmount || BigInt(0), 6)} USDC
                </span>{" "}
                on{" "}
                <span className="font-bold">
                  {creatorChoice === 1 ? "YES" : "NO"}
                </span>
              </p>
              <p className="text-lg text-yellow-700 mb-4 text-center">
                You need{" "}
                <span className="font-bold">
                  {formatUnits(getRequiredOpponentAmount() || BigInt(0), 6)}{" "}
                  USDC
                </span>{" "}
                to bet on{" "}
                <span className="font-bold">
                  {creatorChoice === 1 ? "NO" : "YES"}
                </span>
              </p>
              <button
                onClick={acceptChallenge}
                disabled={isPending || isLoading}
                className="w-full px-6 py-4 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-xl hover:from-yellow-600 hover:to-orange-600 disabled:bg-gray-400 text-lg font-bold shadow-lg hover:shadow-xl transition-all duration-300"
              >
                {isLoading
                  ? "Processing..."
                  : `Accept Challenge (${formatUnits(getRequiredOpponentAmount() || BigInt(0), 6)} USDC)`}
              </button>
            </div>
          )}

        {/* Provide Initial Liquidity or Waiting for Opponent (for creator) - TwoParty markets only */}
        {!isMarketClosed() &&
          (isWaitingForOpponent() ||
            (isActiveMarket() &&
              !isLMSRMarket &&
              ((yesPool as bigint) === BigInt(0) ||
                (noPool as bigint) === BigInt(0)))) &&
          userAddress === creator &&
          !isLMSRMarket && (
            <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl">
              {yesPool === BigInt(0) && noPool === BigInt(0) ? (
                <>
                  <h4 className="text-xl font-bold text-blue-800 mb-3 text-center">
                    🚀 Start the Challenge
                  </h4>
                  <p className="text-lg text-blue-700 mb-4 text-center">
                    Provide your initial stake of{" "}
                    <span className="font-bold">
                      {formatUnits(creatorBetAmount || BigInt(0), 6)} USDC
                    </span>{" "}
                    on{" "}
                    <span className="font-bold">
                      {creatorChoice === 1 ? "YES" : "NO"}
                    </span>
                  </p>
                  <button
                    onClick={provideInitialBet}
                    disabled={isPending || isLoading}
                    className="w-full px-6 py-4 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl hover:from-blue-600 hover:to-indigo-600 disabled:bg-gray-400 text-lg font-bold shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    {isLoading
                      ? "Processing..."
                      : `Start Challenge (${formatUnits(creatorBetAmount || BigInt(0), 6)} USDC)`}
                  </button>
                </>
              ) : (
                <>
                  <h4 className="text-xl font-bold text-blue-800 mb-3 text-center">
                    ⏳ Waiting for Opponent
                  </h4>
                  <p className="text-lg text-blue-700 text-center">
                    You bet{" "}
                    <span className="font-bold">
                      {formatUnits(creatorBetAmount || BigInt(0), 6)} USDC
                    </span>{" "}
                    on{" "}
                    <span className="font-bold">
                      {creatorChoice === 1 ? "YES" : "NO"}
                    </span>
                  </p>
                  <p className="text-lg text-blue-700 text-center mt-2">
                    Waiting for someone to bet{" "}
                    <span className="font-bold">
                      {formatUnits(getRequiredOpponentAmount() || BigInt(0), 6)}{" "}
                      USDC
                    </span>{" "}
                    on{" "}
                    <span className="font-bold">
                      {creatorChoice === 1 ? "NO" : "YES"}
                    </span>
                  </p>
                </>
              )}
            </div>
          )}

        {/* Trading Interface - LMSR markets only */}
        {!isMarketClosed() &&
          !isOutcomeResolved() &&
          isActiveMarket() &&
          isLMSRMarket && (
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-6 space-y-6 border-2 border-purple-200">
              <div className="flex items-center justify-center">
                <div className="text-sm text-purple-600 bg-purple-100 px-4 py-2 rounded-full border-2 border-purple-200 font-medium">
                  💰 Continuous Trading
                </div>
              </div>

              {/* Current Prices Display */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gradient-to-br from-green-100 to-emerald-100 p-4 rounded-xl text-center border-2 border-green-200">
                  <div className="font-bold text-green-800 text-lg mb-1">
                    YES
                  </div>
                  <div className="text-2xl font-bold text-green-600">
                    {yesProb ? (Number(yesProb) / 1e16).toFixed(1) : "50.0"}%
                  </div>
                  <div className="text-sm text-green-600 font-medium">
                    per share
                  </div>
                </div>
                <div className="bg-gradient-to-br from-red-100 to-pink-100 p-4 rounded-xl text-center border-2 border-red-200">
                  <div className="font-bold text-red-800 text-lg mb-1">NO</div>
                  <div className="text-2xl font-bold text-red-600">
                    {noProb ? (Number(noProb) / 1e16).toFixed(1) : "50.0"}%
                  </div>
                  <div className="text-sm text-red-600 font-medium">
                    per share
                  </div>
                </div>
              </div>

              {/* Your Holdings */}
              {userAddress && (userYesShares || userNoShares) && (
                <div className="bg-white p-4 rounded-xl border-2 border-gray-200">
                  <h5 className="font-bold text-gray-800 mb-3 text-center text-lg">
                    📊 Your Holdings
                  </h5>
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                      <div className="font-bold text-green-700">YES</div>
                      <div className="text-lg font-bold text-green-600">
                        {userYesShares ? formatEther(userYesShares) : "0"}
                      </div>
                    </div>
                    <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                      <div className="font-bold text-red-700">NO</div>
                      <div className="text-lg font-bold text-red-600">
                        {userNoShares ? formatEther(userNoShares) : "0"}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Buy Interface */}
              <div className="space-y-4">
                <h5 className="font-bold text-gray-800 text-center text-lg">
                  💸 Buy Shares
                </h5>

                <input
                  type="number"
                  placeholder="Enter USDC amount..."
                  value={lmsrAmount}
                  onChange={(e) => setLmsrAmount(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-lg font-medium"
                />

                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={buyLMSRYes}
                    disabled={!lmsrAmount || isPending || isLoading}
                    className="px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:from-green-600 hover:to-emerald-600 disabled:bg-gray-400 text-lg font-bold shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    Buy YES
                  </button>
                  <button
                    onClick={buyLMSRNo}
                    disabled={!lmsrAmount || isPending || isLoading}
                    className="px-6 py-4 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl hover:from-red-600 hover:to-pink-600 disabled:bg-gray-400 text-lg font-bold shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    Buy NO
                  </button>
                </div>
              </div>

              {/* Sell Interface */}
              {userAddress && (userYesShares || userNoShares) && (
                <div className="space-y-4 border-t-2 border-purple-200 pt-4">
                  <h5 className="font-bold text-gray-800 text-center text-lg">
                    💰 Sell Shares
                  </h5>

                  <input
                    type="number"
                    placeholder="Enter shares to sell..."
                    value={sellShares}
                    onChange={(e) => setSellShares(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-lg font-medium"
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={sellLMSRYes}
                      disabled={
                        !sellShares || !userYesShares || isPending || isLoading
                      }
                      className="px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:from-green-600 hover:to-emerald-600 disabled:bg-gray-400 text-lg font-bold shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      Sell YES
                    </button>
                    <button
                      onClick={sellLMSRNo}
                      disabled={
                        !sellShares || !userNoShares || isPending || isLoading
                      }
                      className="px-6 py-4 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl hover:from-red-600 hover:to-pink-600 disabled:bg-gray-400 text-lg font-bold shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      Sell NO
                    </button>
                  </div>
                </div>
              )}

              <div className="text-sm text-purple-600 bg-purple-100 p-3 rounded-xl border border-purple-200 text-center font-medium">
                💡 Prices adjust automatically based on trading activity
              </div>
            </div>
          )}

        {/* TwoParty Market Active Display - Only when both sides have bet */}
        {!isMarketClosed() &&
          !isOutcomeResolved() &&
          isActiveMarket() &&
          !isLMSRMarket &&
          (yesPool as bigint) > BigInt(0) &&
          (noPool as bigint) > BigInt(0) && (
            <div className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl">
              <h4 className="text-xl font-bold text-green-800 mb-4 text-center">
                🎯 Challenge Active!
              </h4>
              <p className="text-lg text-green-700 mb-4 text-center">
                Both sides have placed their bets. The challenge is live!
              </p>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-white p-4 rounded-xl border-2 border-green-200 text-center">
                  <div className="font-bold text-green-600 text-lg mb-1">
                    YES Pool
                  </div>
                  <div className="text-2xl font-bold text-green-800">
                    {formatUnits((yesPool as bigint) || BigInt(0), 6)} USDC
                  </div>
                </div>
                <div className="bg-white p-4 rounded-xl border-2 border-red-200 text-center">
                  <div className="font-bold text-red-600 text-lg mb-1">
                    NO Pool
                  </div>
                  <div className="text-2xl font-bold text-red-800">
                    {formatUnits((noPool as bigint) || BigInt(0), 6)} USDC
                  </div>
                </div>
              </div>
              <p className="text-sm text-green-600 text-center font-medium">
                ⏰ Market will resolve automatically when the end time is
                reached
              </p>
            </div>
          )}

        {/* Winner Celebration Message */}
        {isOutcomeResolved() && canClaim() && userAddress && (
          <div className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl text-center">
            <div className="text-4xl mb-4">🎉</div>
            <h4 className="text-2xl font-bold text-green-800 mb-3">You Won!</h4>
            <p className="text-lg text-green-700 mb-4">
              Congratulations! You bet on{" "}
              <span className="font-bold">
                {Number(yesStake) > 0 ? "YES" : "NO"}
              </span>{" "}
              and the market resolved to{" "}
              <span className="font-bold">{getOutcomeText()}</span>.
            </p>

            {/* Show FTSO price for resolved markets */}
            {(hasFTSOResolution as boolean) && (
              <div className="mb-4 p-4 bg-white border-2 border-green-300 rounded-xl">
                {ftsoPrice ? (
                  <>
                    <p className="text-sm text-green-600 font-bold mb-1">
                      Final FTSO Price
                    </p>
                    <p className="text-xl font-bold text-green-800">
                      ${ftsoPrice}
                    </p>
                    {priceThreshold && typeof priceThreshold === "bigint" && (
                      <p className="text-sm text-green-600">
                        Threshold: ${formatUnits(priceThreshold, 7)}
                      </p>
                    )}
                  </>
                ) : (
                  <div className="text-center">
                    <p className="text-sm text-green-600 font-bold mb-2">
                      FTSO Price
                    </p>
                    <button
                      onClick={fetchFTSOPrice}
                      disabled={isLoadingPrice}
                      className="px-4 py-2 bg-green-100 text-green-700 rounded-lg text-sm hover:bg-green-200 font-medium"
                    >
                      {isLoadingPrice ? "Loading..." : "Fetch Price"}
                    </button>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={claim}
              disabled={isPending || isLoading}
              className="w-full px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:from-green-600 hover:to-emerald-600 disabled:bg-gray-400 text-xl font-bold shadow-lg hover:shadow-xl transition-all duration-300"
            >
              🏆 Claim Your Winnings
            </button>
          </div>
        )}

        {/* Message for Losers */}
        {isOutcomeResolved() &&
          userAddress &&
          !canClaim() &&
          (Number(yesStake) > 0 || Number(noStake) > 0) && (
            <div className="p-6 bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-200 rounded-2xl text-center">
              <div className="text-4xl mb-4">😔</div>
              <h4 className="text-2xl font-bold text-red-800 mb-3">You Lost</h4>
              <p className="text-lg text-red-700 font-bold mb-2">
                You bet on{" "}
                <span className="font-bold">
                  {Number(yesStake) > 0 ? "YES" : "NO"}
                </span>{" "}
                but the market resolved to{" "}
                <span className="font-bold">{getOutcomeText()}</span>
              </p>
              <p className="text-red-600 text-lg font-medium">
                Better luck next time!
              </p>
            </div>
          )}

        {/* Market Result (for non-participants) */}
        {isOutcomeResolved() &&
          userAddress &&
          Number(yesStake) === 0 &&
          Number(noStake) === 0 && (
            <div className="p-6 bg-gradient-to-r from-gray-50 to-slate-50 border-2 border-gray-200 rounded-2xl text-center">
              <div className="text-4xl mb-4">📊</div>
              <h4 className="text-2xl font-bold text-gray-800 mb-3">
                Market Result
              </h4>
              <p className="text-lg text-gray-700 font-bold">
                The market resolved to{" "}
                <span className="font-bold text-blue-600">
                  {getOutcomeText()}
                </span>
              </p>
              <p className="text-gray-600 text-lg mt-2 font-medium">
                You didn&apos;t participate in this market.
              </p>
            </div>
          )}

        {/* Unfulfilled Market Message */}
        {isMarketClosed() &&
          !isOutcomeResolved() &&
          (!isActiveMarket() ||
            (Number(yesPool) === 0 && Number(noPool) === 0)) && (
            <div className="p-6 bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-200 rounded-2xl text-center">
              <div className="text-4xl mb-4">⚠️</div>
              <h4 className="text-2xl font-bold text-yellow-800 mb-3">
                Market Unfulfilled
              </h4>
              <p className="text-lg text-yellow-700 font-bold mb-3">
                This market did not receive sufficient participation to be
                resolved.
              </p>
              <p className="text-yellow-600 text-lg font-medium">
                {Number(yesPool) === 0 && Number(noPool) === 0
                  ? "No initial liquidity was provided."
                  : "The opponent did not join the challenge."}
              </p>
              <p className="text-yellow-600 text-sm mt-3 font-medium">
                Participants can claim back their stakes.
              </p>

              {/* Claim button for unfulfilled markets */}
              {(Number(yesStake) > 0 || Number(noStake) > 0) && (
                <button
                  onClick={claim}
                  disabled={isPending || isLoading}
                  className="mt-4 px-6 py-4 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-xl hover:from-yellow-600 hover:to-orange-600 disabled:bg-gray-400 text-lg font-bold shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  {isLoading ? "Claiming..." : "💰 Claim Stakes"}
                </button>
              )}
            </div>
          )}

        {/* Resolution Options (available immediately when market closes) */}
        {isMarketClosed() &&
          !isOutcomeResolved() &&
          isActiveMarket() &&
          Number(yesPool) > 0 &&
          Number(noPool) > 0 &&
          endTime && (
            <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl">
              <h4 className="text-xl font-bold text-blue-900 mb-4 text-center">
                🎯 Choose Resolution Method
              </h4>

              {/* Resolution Method Selector */}
              <div className="mb-6">
                <label className="block text-lg font-bold text-blue-700 mb-3 text-center">
                  Resolution Method
                </label>
                <select
                  value={selectedResolutionMethod}
                  onChange={(e) =>
                    setSelectedResolutionMethod(e.target.value as "ftso" | "ai")
                  }
                  className="w-full px-4 py-3 border-2 border-blue-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg font-medium"
                >
                  <option value="ftso">📊 FTSO Price Feed (Recommended)</option>
                  <option value="ai">🧠 AI Analysis</option>
                </select>
                <p className="text-sm text-blue-600 mt-2 text-center font-medium">
                  Select how you want to resolve this market
                </p>

                {/* Selected Method Display */}
                <div className="mt-4 p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
                  <div className="flex items-center justify-center space-x-2">
                    <span className="text-blue-600 text-lg">🎯</span>
                    <span className="text-lg font-bold text-blue-800">
                      Selected:
                    </span>
                    <span className="text-lg text-blue-700 font-medium">
                      {selectedResolutionMethod === "ftso"
                        ? "📊 FTSO Price Feed"
                        : "🧠 AI Analysis"}
                    </span>
                  </div>
                  <p className="text-sm text-blue-600 mt-2 text-center font-medium">
                    {selectedResolutionMethod === "ftso"
                      ? "Will use real-time price data from Flare FTSO"
                      : "AI will analyze the question and determine the outcome"}
                  </p>
                </div>
              </div>

              {/* FTSO Resolution Section */}
              {selectedResolutionMethod === "ftso" && (
                <div className="mb-4">
                  {/* Current FTSO Price Display */}
                  {ftsoPrice && (
                    <div className="mb-4 p-4 bg-green-50 border-2 border-green-200 rounded-xl">
                      <div className="text-center">
                        <p className="text-lg text-green-700 font-bold mb-1">
                          Current FTSO Price
                        </p>
                        <p className="text-2xl font-bold text-green-800">
                          ${ftsoPrice}
                        </p>
                        <p className="text-sm text-green-600 mt-1 font-medium">
                          Threshold: ${formatUnits(priceThreshold as bigint, 7)}
                        </p>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={resolveWithStoredFTSO}
                    disabled={isPending || isLoading}
                    className="w-full px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:from-green-600 hover:to-emerald-600 disabled:bg-gray-400 flex items-center justify-center gap-3 text-lg font-bold shadow-lg hover:shadow-xl transition-all duration-300 mb-4"
                  >
                    {isLoading ? "Resolving..." : "📊 Resolve with FTSO"}
                  </button>

                  <div className="flex justify-between items-center text-sm text-green-600 font-medium">
                    <span>Uses real-time price data from Flare FTSO</span>
                    {isLoadingPrice && <span>Loading price...</span>}
                  </div>
                </div>
              )}

              {/* AI Resolution Section */}
              {selectedResolutionMethod === "ai" && (
                <div className="space-y-4">
                  <button
                    onClick={resolveWithAI}
                    disabled={isPending || isLoading}
                    className="w-full px-6 py-4 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl hover:from-blue-600 hover:to-indigo-600 disabled:bg-gray-400 flex items-center justify-center gap-3 text-lg font-bold shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    {isLoading ? "Analyzing..." : "🧠 Resolve with AI"}
                  </button>
                  <p className="text-sm text-blue-600 text-center font-medium">
                    AI will analyze the question and determine the outcome
                  </p>
                </div>
              )}
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
