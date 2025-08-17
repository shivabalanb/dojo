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
  const [dbQuestion, setDbQuestion] = useState<string | null>(null);
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

  // Use database question if available, fallback to prop, then generic
  const displayQuestion =
    dbQuestion || propQuestion || `Market ${Number(marketIndex) + 1}`;

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
    <div className="bg-white rounded-lg border shadow-sm p-6 text-black">
      {/* Market Info */}
      <div className="mb-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900 flex-1">
            {displayQuestion}
          </h3>
          <div
            className={`ml-3 px-2 py-1 rounded-full text-xs font-medium ${
              isLMSRMarket
                ? "bg-purple-100 text-purple-700"
                : "bg-blue-100 text-blue-700"
            }`}
          >
            {isLMSRMarket ? "🤖 LMSR" : "⚔️ Challenge"}
          </div>
        </div>
        <div className="flex justify-between text-sm text-gray-600">
          <span>Market:{address}</span>
          <span>
            Status:{" "}
            {isOutcomeResolved()
              ? `Resolved: ${getOutcomeText()}`
              : isLMSRMarket
                ? isMarketClosed()
                  ? "Closed"
                  : "Active"
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

        {/* USDC Balance Display */}
        {userAddress && (
          <div className="text-sm text-gray-600 mt-1">
            Your USDC Balance:{" "}
            <span className="font-medium text-green-600">
              {usdcBalance ? formatUnits(usdcBalance as bigint, 6) : "0"} USDC
            </span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="space-y-3">
        {/* Accept Challenge (for waiting markets or active markets with only one side bet) - TwoParty markets only */}
        {!isMarketClosed() &&
          (isWaitingForOpponent() ||
            (isActiveMarket() &&
              !isLMSRMarket &&
              ((yesPool as bigint) === BigInt(0) ||
                (noPool as bigint) === BigInt(0)))) &&
          userAddress !== creator &&
          !isLMSRMarket && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="text-md font-semibold text-yellow-800 mb-2">
                Accept Challenge
              </h4>
              <p className="text-sm text-yellow-700 mb-3">
                Creator bet {formatUnits(creatorBetAmount || BigInt(0), 6)} USDC
                on {creatorChoice === 1 ? "YES" : "NO"}. You need{" "}
                {formatUnits(getRequiredOpponentAmount() || BigInt(0), 6)} USDC
                to bet on {creatorChoice === 1 ? "NO" : "YES"}.
              </p>
              <button
                onClick={acceptChallenge}
                disabled={isPending || isLoading}
                className="w-full px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:bg-gray-400"
              >
                Accept Challenge (
                {formatUnits(getRequiredOpponentAmount() || BigInt(0), 6)} USDC)
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
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              {yesPool === BigInt(0) && noPool === BigInt(0) ? (
                <>
                  <h4 className="text-md font-semibold text-green-800 mb-2">
                    Provide Initial Liquidity
                  </h4>
                  <p className="text-sm text-green-700 mb-3">
                    You need to provide your initial stake of{" "}
                    {formatUnits(creatorBetAmount || BigInt(0), 6)} USDC on{" "}
                    {creatorChoice === 1 ? "YES" : "NO"} to start the market.
                  </p>
                  <button
                    onClick={provideInitialBet}
                    disabled={isPending || isLoading}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
                  >
                    Provide Initial Bet (
                    {formatUnits(creatorBetAmount || BigInt(0), 6)} USDC)
                  </button>
                </>
              ) : (
                <>
                  <h4 className="text-md font-semibold text-blue-800 mb-2">
                    Waiting for Opponent
                  </h4>
                  <p className="text-sm text-blue-700">
                    You bet {formatUnits(creatorBetAmount || BigInt(0), 6)} USDC
                    on {creatorChoice === 1 ? "YES" : "NO"}. Waiting for someone
                    to bet{" "}
                    {formatUnits(getRequiredOpponentAmount() || BigInt(0), 6)}{" "}
                    USDC on {creatorChoice === 1 ? "NO" : "YES"}.
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
            <div className="bg-purple-50 rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-xs text-purple-600 bg-purple-100 px-2 py-1 rounded">
                  Continuous Liquidity
                </div>
              </div>

              {/* Current Prices Display */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="bg-green-100 p-3 rounded-lg text-center">
                  <div className="font-semibold text-green-800">YES</div>
                  <div className="text-lg font-bold text-green-600">
                    {yesProb ? (Number(yesProb) / 1e16).toFixed(2) : "50.00"}%
                  </div>
                  <div className="text-xs text-green-600">per share</div>
                </div>
                <div className="bg-red-100 p-3 rounded-lg text-center">
                  <div className="font-semibold text-red-800">NO</div>
                  <div className="text-lg font-bold text-red-600">
                    {noProb ? (Number(noProb) / 1e16).toFixed(2) : "50.00"}%
                  </div>
                  <div className="text-xs text-red-600">per share</div>
                </div>
              </div>

              {/* Your Holdings */}
              {userAddress && (userYesShares || userNoShares) && (
                <div className="bg-white p-3 rounded-lg border">
                  <h5 className="font-medium text-gray-800 mb-2">
                    Your Holdings
                  </h5>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      YES: {userYesShares ? formatEther(userYesShares) : "0"}{" "}
                      shares
                    </div>
                    <div>
                      NO: {userNoShares ? formatEther(userNoShares) : "0"}{" "}
                      shares
                    </div>
                  </div>
                </div>
              )}

              {/* Buy Interface */}
              <div className="space-y-3">
                <h5 className="font-medium text-gray-800">Buy Shares</h5>

                <input
                  type="number"
                  placeholder="USDC Amount"
                  value={lmsrAmount}
                  onChange={(e) => setLmsrAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                />

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={buyLMSRYes}
                    disabled={!lmsrAmount || isPending || isLoading}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 text-sm font-medium"
                  >
                    Buy YES
                  </button>
                  <button
                    onClick={buyLMSRNo}
                    disabled={!lmsrAmount || isPending || isLoading}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 text-sm font-medium"
                  >
                    Buy NO
                  </button>
                </div>
              </div>

              {/* Sell Interface */}
              {userAddress && (userYesShares || userNoShares) && (
                <div className="space-y-3 border-t pt-3">
                  <h5 className="font-medium text-gray-800">Sell Shares</h5>

                  <input
                    type="number"
                    placeholder="Shares to Sell"
                    value={sellShares}
                    onChange={(e) => setSellShares(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                  />

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={sellLMSRYes}
                      disabled={
                        !sellShares || !userYesShares || isPending || isLoading
                      }
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 text-sm font-medium"
                    >
                      Sell YES
                    </button>
                    <button
                      onClick={sellLMSRNo}
                      disabled={
                        !sellShares || !userNoShares || isPending || isLoading
                      }
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 text-sm font-medium"
                    >
                      Sell NO
                    </button>
                  </div>
                </div>
              )}

              <div className="text-xs text-purple-600 bg-purple-100 p-2 rounded">
                💡 Prices adjust automatically based on trading activity.
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
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="text-md font-semibold text-green-800 mb-2">
                🎯 Challenge Active
              </h4>
              <p className="text-sm text-green-700 mb-3">
                The challenge is now active! Both sides have placed their bets.
              </p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-white p-3 rounded border">
                  <div className="font-medium text-green-600">YES Pool</div>
                  <div className="text-lg font-bold">
                    {formatUnits((yesPool as bigint) || BigInt(0), 6)} USDC
                  </div>
                </div>
                <div className="bg-white p-3 rounded border">
                  <div className="font-medium text-red-600">NO Pool</div>
                  <div className="text-lg font-bold">
                    {formatUnits((noPool as bigint) || BigInt(0), 6)} USDC
                  </div>
                </div>
              </div>
              <p className="text-xs text-green-600 mt-3">
                Market will resolve automatically when the end time is reached.
              </p>
            </div>
          )}

        {/* Winner Celebration Message */}
        {isOutcomeResolved() && canClaim() && userAddress && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
            <div className="text-2xl mb-2">🎉</div>
            <h4 className="text-lg font-bold text-green-800 mb-2">You Won!</h4>
            <p className="text-sm text-green-700 mb-3">
              Congratulations! You bet on {Number(yesStake) > 0 ? "YES" : "NO"}{" "}
              and the market resolved to {getOutcomeText()}.
            </p>

            {/* Show FTSO price for resolved markets */}
            {(hasFTSOResolution as boolean) && (
              <div className="mb-3 p-2 bg-white border border-green-300 rounded-lg">
                {ftsoPrice ? (
                  <>
                    <p className="text-xs text-green-600 font-medium">
                      Final FTSO Price
                    </p>
                    <p className="text-sm font-bold text-green-800">
                      ${ftsoPrice}
                    </p>
                    {priceThreshold && typeof priceThreshold === "bigint" && (
                      <p className="text-xs text-green-600">
                        Threshold: ${formatUnits(priceThreshold, 7)}
                      </p>
                    )}
                  </>
                ) : (
                  <div className="text-center">
                    <p className="text-xs text-green-600 font-medium mb-2">
                      FTSO Price
                    </p>
                    <button
                      onClick={fetchFTSOPrice}
                      disabled={isLoadingPrice}
                      className="px-3 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200"
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
              className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 font-semibold"
            >
              🎉 Claim Your Winnings
            </button>
          </div>
        )}

        {/* Message for Losers */}
        {isOutcomeResolved() &&
          userAddress &&
          !canClaim() &&
          (Number(yesStake) > 0 || Number(noStake) > 0) && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-center">
              <div className="text-2xl mb-2">😔</div>
              <h4 className="text-lg font-bold text-red-800 mb-2">You Lost</h4>
              <p className="text-red-700 font-medium mb-2">
                You bet on {Number(yesStake) > 0 ? "YES" : "NO"} but the market
                resolved to {getOutcomeText()}
              </p>
              <p className="text-red-600 text-sm">Better luck next time!</p>
            </div>
          )}

        {/* Market Result (for non-participants) */}
        {isOutcomeResolved() &&
          userAddress &&
          Number(yesStake) === 0 &&
          Number(noStake) === 0 && (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-center">
              <div className="text-2xl mb-2">📊</div>
              <h4 className="text-lg font-bold text-gray-800 mb-2">
                Market Result
              </h4>
              <p className="text-gray-700 font-medium">
                The market resolved to{" "}
                <span className="font-bold">{getOutcomeText()}</span>
              </p>
              <p className="text-gray-600 text-sm mt-1">
                You didn&apos;t participate in this market.
              </p>
            </div>
          )}

        {/* Unfulfilled Market Message */}
        {isMarketClosed() &&
          !isOutcomeResolved() &&
          (!isActiveMarket() ||
            (Number(yesPool) === 0 && Number(noPool) === 0)) && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
              <div className="text-2xl mb-2">⚠️</div>
              <h4 className="text-lg font-bold text-yellow-800 mb-2">
                Market Unfulfilled
              </h4>
              <p className="text-yellow-700 font-medium mb-2">
                This market did not receive sufficient participation to be
                resolved.
              </p>
              <p className="text-yellow-600 text-sm">
                {Number(yesPool) === 0 && Number(noPool) === 0
                  ? "No initial liquidity was provided."
                  : "The opponent did not join the challenge."}
              </p>
              <p className="text-yellow-600 text-xs mt-2">
                Participants can claim back their stakes.
              </p>

              {/* Claim button for unfulfilled markets */}
              {(Number(yesStake) > 0 || Number(noStake) > 0) && (
                <button
                  onClick={claim}
                  disabled={isPending || isLoading}
                  className="mt-3 px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:bg-gray-400 font-semibold"
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
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="text-lg font-semibold text-blue-900 mb-3">
                Choose Resolution Method
              </h4>

              {/* Resolution Method Selector */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-blue-700 mb-2">
                  Resolution Method
                </label>
                <select
                  value={selectedResolutionMethod}
                  onChange={(e) =>
                    setSelectedResolutionMethod(e.target.value as "ftso" | "ai")
                  }
                  className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="ftso">📊 FTSO Price Feed (Recommended)</option>
                  <option value="ai">🧠 AI Analysis</option>
                </select>
                <p className="text-xs text-blue-600 mt-1">
                  Select how you want to resolve this market
                </p>

                {/* Selected Method Display */}
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="flex items-center space-x-2">
                    <span className="text-blue-600">🎯</span>
                    <span className="text-sm font-medium text-blue-800">
                      Selected Method:
                    </span>
                    <span className="text-sm text-blue-700">
                      {selectedResolutionMethod === "ftso"
                        ? "📊 FTSO Price Feed"
                        : "🧠 AI Analysis"}
                    </span>
                  </div>
                  <p className="text-xs text-blue-600 mt-1">
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
                    <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="text-center">
                        <p className="text-sm text-green-700 font-medium">
                          Current FTSO Price
                        </p>
                        <p className="text-lg font-bold text-green-800">
                          ${ftsoPrice}
                        </p>
                        <p className="text-xs text-green-600 mt-1">
                          Threshold: ${formatUnits(priceThreshold as bigint, 7)}
                        </p>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={resolveWithStoredFTSO}
                    disabled={isPending || isLoading}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 flex items-center justify-center gap-2 mb-3"
                  >
                    {isLoading ? "Resolving..." : "📊 Resolve with FTSO"}
                  </button>

                  <div className="flex justify-between items-center text-xs text-green-600">
                    <span>Uses real-time price data from Flare FTSO</span>
                    {isLoadingPrice && <span>Loading price...</span>}
                  </div>
                </div>
              )}

              {/* AI Resolution Section */}
              {selectedResolutionMethod === "ai" && (
                <div className="space-y-3">
                  <button
                    onClick={resolveWithAI}
                    disabled={isPending || isLoading}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 flex items-center justify-center gap-2"
                  >
                    {isLoading ? "Analyzing..." : "🧠 Resolve with AI"}
                  </button>
                  <p className="text-xs text-blue-600 text-center">
                    AI will analyze the question and determine the outcome
                  </p>
                </div>
              )}
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
