"use client";

import React, { useState, useEffect } from "react";
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
  useAccount,
} from "wagmi";
import { readContract } from "wagmi/actions";
import { config } from "../lib/wagmi";
import { parseEther, parseUnits, formatUnits } from "viem";

import {
  MarketFactoryABI,
  MARKET_FACTORY_ADDRESS,
  MarketType,
  MOCK_USDC_ADDRESS,
  MockUSDCABI,
} from "../lib/abis";

export function CreateMarket() {
  const [question, setQuestion] = useState("Will the price of ETH go up?");
  const [durationInput, setDurationInput] = useState({
    days: "0",
    hours: "0",
    minutes: "2",
    seconds: "0",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [pendingQuestion, setPendingQuestion] = useState("");

  // Market type selection
  const [marketType, setMarketType] = useState<"TwoParty" | "LMSR">("TwoParty");

  // TwoParty market fields
  const [creatorBetAmount, setCreatorBetAmount] = useState("10"); // USDC amount
  const [oddsRatio, setOddsRatio] = useState("1:2"); // Default odds ratio
  const [creatorSide, setCreatorSide] = useState<"yes" | "no">("yes");

  // FTSO market fields (hardcoded address)
  const ftsoAddress = "0xC4e9c78EA53db782E28f28Fdf80BaF59336B304d";
  const [ftsoEpochId, setFtsoEpochId] = useState("");
  const [priceThreshold, setPriceThreshold] = useState("");
  const [selectedFeedId, setSelectedFeedId] = useState(
    "0x01464c522f55534400000000000000000000000000"
  ); // Default to FLR/USD
  const [useFTSO, setUseFTSO] = useState(false);
  const [feedSearchTerm, setFeedSearchTerm] = useState("");

  // FTSO Feeds Data
  const ftsoFeeds = [
    {
      name: "FLR/USD",
      feedId: "0x01464c522f55534400000000000000000000000000",
      risk: "🟢",
    },
    {
      name: "SGB/USD",
      feedId: "0x015347422f55534400000000000000000000000000",
      risk: "🟡",
    },
    {
      name: "BTC/USD",
      feedId: "0x014254432f55534400000000000000000000000000",
      risk: "🟢",
    },
    {
      name: "XRP/USD",
      feedId: "0x015852502f55534400000000000000000000000000",
      risk: "🟢",
    },
    {
      name: "LTC/USD",
      feedId: "0x014c54432f55534400000000000000000000000000",
      risk: "🟢",
    },
    {
      name: "XLM/USD",
      feedId: "0x01584c4d2f55534400000000000000000000000000",
      risk: "🟢",
    },
    {
      name: "DOGE/USD",
      feedId: "0x01444f47452f555344000000000000000000000000",
      risk: "🟢",
    },
    {
      name: "ADA/USD",
      feedId: "0x014144412f55534400000000000000000000000000",
      risk: "🟢",
    },
    {
      name: "ALGO/USD",
      feedId: "0x01414c474f2f555344000000000000000000000000",
      risk: "🟡",
    },
    {
      name: "ETH/USD",
      feedId: "0x014554482f55534400000000000000000000000000",
      risk: "🟢",
    },
    {
      name: "FIL/USD",
      feedId: "0x0146494c2f55534400000000000000000000000000",
      risk: "🟢",
    },
    {
      name: "ARB/USD",
      feedId: "0x014152422f55534400000000000000000000000000",
      risk: "🟢",
    },
    {
      name: "AVAX/USD",
      feedId: "0x01415641582f555344000000000000000000000000",
      risk: "🟢",
    },
    {
      name: "BNB/USD",
      feedId: "0x01424e422f55534400000000000000000000000000",
      risk: "🟢",
    },
    {
      name: "POL/USD",
      feedId: "0x01504f4c2f55534400000000000000000000000000",
      risk: "🟢",
    },
    {
      name: "SOL/USD",
      feedId: "0x01534f4c2f55534400000000000000000000000000",
      risk: "🟢",
    },
    {
      name: "USDC/USD",
      feedId: "0x01555344432f555344000000000000000000000000",
      risk: "🟢",
    },
    {
      name: "USDT/USD",
      feedId: "0x01555344542f555344000000000000000000000000",
      risk: "🟢",
    },
    {
      name: "XDC/USD",
      feedId: "0x015844432f55534400000000000000000000000000",
      risk: "🟡",
    },
    {
      name: "TRX/USD",
      feedId: "0x015452582f55534400000000000000000000000000",
      risk: "🟢",
    },
    {
      name: "LINK/USD",
      feedId: "0x014c494e4b2f555344000000000000000000000000",
      risk: "🟢",
    },
    {
      name: "ATOM/USD",
      feedId: "0x0141544f4d2f555344000000000000000000000000",
      risk: "🟢",
    },
    {
      name: "DOT/USD",
      feedId: "0x01444f542f55534400000000000000000000000000",
      risk: "🟢",
    },
    {
      name: "TON/USD",
      feedId: "0x01544f4e2f55534400000000000000000000000000",
      risk: "🟢",
    },
    {
      name: "ICP/USD",
      feedId: "0x014943502f55534400000000000000000000000000",
      risk: "🟢",
    },
    {
      name: "SHIB/USD",
      feedId: "0x01534849422f555344000000000000000000000000",
      risk: "🟢",
    },
    {
      name: "USDS/USD",
      feedId: "0x01555344532f555344000000000000000000000000",
      risk: "🟢",
    },
    {
      name: "BCH/USD",
      feedId: "0x014243482f55534400000000000000000000000000",
      risk: "🟢",
    },
    {
      name: "NEAR/USD",
      feedId: "0x014e4541522f555344000000000000000000000000",
      risk: "🟢",
    },
    {
      name: "LEO/USD",
      feedId: "0x014c454f2f55534400000000000000000000000000",
      risk: "🔴",
    },
    {
      name: "UNI/USD",
      feedId: "0x01554e492f55534400000000000000000000000000",
      risk: "🟢",
    },
    {
      name: "ETC/USD",
      feedId: "0x014554432f55534400000000000000000000000000",
      risk: "🟢",
    },
    {
      name: "WIF/USD",
      feedId: "0x015749462f55534400000000000000000000000000",
      risk: "🟡",
    },
    {
      name: "BONK/USD",
      feedId: "0x01424f4e4b2f555344000000000000000000000000",
      risk: "🟡",
    },
    {
      name: "JUP/USD",
      feedId: "0x014a55502f55534400000000000000000000000000",
      risk: "🟢",
    },
    {
      name: "ETHFI/USD",
      feedId: "0x0145544846492f5553440000000000000000000000",
      risk: "🔴",
    },
    {
      name: "ENA/USD",
      feedId: "0x01454e412f55534400000000000000000000000000",
      risk: "🔴",
    },
    {
      name: "PYTH/USD",
      feedId: "0x01505954482f555344000000000000000000000000",
      risk: "🟢",
    },
    {
      name: "HNT/USD",
      feedId: "0x01484e542f55534400000000000000000000000000",
      risk: "🟡",
    },
    {
      name: "SUI/USD",
      feedId: "0x015355492f55534400000000000000000000000000",
      risk: "🟢",
    },
    {
      name: "PEPE/USD",
      feedId: "0x01504550452f555344000000000000000000000000",
      risk: "🟡",
    },
    {
      name: "QNT/USD",
      feedId: "0x01514e542f55534400000000000000000000000000",
      risk: "🟢",
    },
    {
      name: "AAVE/USD",
      feedId: "0x01414156452f555344000000000000000000000000",
      risk: "🟢",
    },
    {
      name: "S/USD",
      feedId: "0x01532f555344000000000000000000000000000000",
      risk: "🟡",
    },
    {
      name: "ONDO/USD",
      feedId: "0x014f4e444f2f555344000000000000000000000000",
      risk: "🟢",
    },
    {
      name: "TAO/USD",
      feedId: "0x0154414f2f55534400000000000000000000000000",
      risk: "🟡",
    },
    {
      name: "FET/USD",
      feedId: "0x014645542f55534400000000000000000000000000",
      risk: "🟢",
    },
    {
      name: "RENDER/USD",
      feedId: "0x0152454e4445522f55534400000000000000000000",
      risk: "🟢",
    },
    {
      name: "NOT/USD",
      feedId: "0x014e4f542f55534400000000000000000000000000",
      risk: "🟡",
    },
    {
      name: "RUNE/USD",
      feedId: "0x0152554e452f555344000000000000000000000000",
      risk: "🟡",
    },
    {
      name: "TRUMP/USD",
      feedId: "0x015452554d502f5553440000000000000000000000",
      risk: "🔴",
    },
    {
      name: "USDX/USD",
      feedId: "0x01555344582f555344000000000000000000000000",
      risk: "🟢",
    },
    {
      name: "JOULE/USD",
      feedId: "0x014a4f554c452f5553440000000000000000000000",
      risk: "⚫",
    },
    {
      name: "HBAR/USD",
      feedId: "0x01484241522f555344000000000000000000000000",
      risk: "🟡",
    },
    {
      name: "PENGU/USD",
      feedId: "0x0150454e47552f5553440000000000000000000000",
      risk: "🔴",
    },
    {
      name: "HYPE/USD",
      feedId: "0x01485950452f555344000000000000000000000000",
      risk: "🟢",
    },
    {
      name: "APT/USD",
      feedId: "0x014150542f55534400000000000000000000000000",
      risk: "🟢",
    },
    {
      name: "PAXG/USD",
      feedId: "0x01504158472f555344000000000000000000000000",
      risk: "🟢",
    },
    {
      name: "BERA/USD",
      feedId: "0x01424552412f555344000000000000000000000000",
      risk: "🟢",
    },
    {
      name: "OP/USD",
      feedId: "0x014f502f5553440000000000000000000000000000",
      risk: "🟢",
    },
    {
      name: "PUMP/USD",
      feedId: "0x0150554d502f555344000000000000000000000000",
      risk: "🟡",
    },
  ];

  // Filter FTSO feeds based on search term
  const filteredFeeds = ftsoFeeds.filter((feed) =>
    feed.name.toLowerCase().includes(feedSearchTerm.toLowerCase())
  );

  // Calculate opponent bet amount based on odds ratio
  const calculateOpponentBetAmount = (): number => {
    if (!oddsRatio || !creatorBetAmount) return 0;
    const [creator, opponent] = oddsRatio.split(":").map(Number);
    if (creator === 0) return 0;
    return (Number(creatorBetAmount) * opponent) / creator;
  };

  // Calculate FTSO epoch ID for a given timestamp
  const calculateFTSOEpoch = (timestamp: number): number => {
    // FTSO epochs are 90 seconds long
    const epochDuration = 90;
    return Math.floor(timestamp / epochDuration);
  };

  // Calculate future epoch ID based on market duration
  const getFutureEpochId = (): number => {
    const now = Math.floor(Date.now() / 1000);
    const totalDurationInSeconds =
      parseInt(durationInput.days || "0") * 24 * 60 * 60 +
      parseInt(durationInput.hours || "0") * 60 * 60 +
      parseInt(durationInput.minutes || "0") * 60 +
      parseInt(durationInput.seconds || "0");
    const futureTime = now + totalDurationInSeconds;
    return calculateFTSOEpoch(futureTime);
  };

  // Auto-calculate epoch ID when duration or FTSO is enabled
  useEffect(() => {
    if (useFTSO && durationInput) {
      const epochId = getFutureEpochId();
      setFtsoEpochId(epochId.toString());
    }
  }, [useFTSO, durationInput]);

  const opponentBetAmount = calculateOpponentBetAmount();

  // LMSR market fields
  const [initialLiquidity, setInitialLiquidity] = useState("0.01");
  const [liquidityLevel, setLiquidityLevel] = useState(2); // 1-5 scale

  // Calculate beta parameter for LMSR (makes it user-friendly)
  const getBetaParameter = () => {
    // Convert slider (1-5) to beta values
    // Higher liquidity level = higher beta = more stable prices
    const betaValues = {
      1: parseEther("0.01"), // Low liquidity, volatile prices
      2: parseEther("0.05"), // Medium-low liquidity
      3: parseEther("0.1"), // Medium liquidity
      4: parseEther("0.2"), // Medium-high liquidity
      5: parseEther("0.5"), // High liquidity, stable prices
    };
    return betaValues[liquidityLevel as keyof typeof betaValues];
  };

  // Get liquidity description
  const getLiquidityDescription = () => {
    const descriptions = {
      1: "Volatile prices, lower trading fees",
      2: "Moderately volatile prices",
      3: "Balanced volatility and fees",
      4: "Stable prices, moderate fees",
      5: "Very stable prices, higher fees",
    };
    return descriptions[liquidityLevel as keyof typeof descriptions];
  };

  const { writeContract, data: txHash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // Read user's USDC balance
  const { address: userAddress } = useAccount();
  const { data: usdcBalance } = useReadContract({
    address: MOCK_USDC_ADDRESS,
    abi: MockUSDCABI,
    functionName: "balanceOf",
    args: userAddress ? [userAddress] : undefined,
  });

  // Wait for transaction to complete, then store in database
  useEffect(() => {
    if (isSuccess && pendingQuestion) {
      storeMarketInDatabase(pendingQuestion);
      setPendingQuestion(""); // Clear pending question
    }
  }, [isSuccess, pendingQuestion]);

  const storeMarketInDatabase = async (questionText: string) => {
    try {
      // Get the total number of markets from the factory to determine the index
      const marketCount = await readContract(config, {
        address: MARKET_FACTORY_ADDRESS,
        abi: MarketFactoryABI,
        functionName: "getAllMarketsCount",
      });

      // The market index should be the count - 1 (since we just added a new market)
      const marketIndex = Number(marketCount) - 1;

      const marketData = {
        market_index: marketIndex,
        question: questionText,
      };

      console.log("🔍 Debug info:");
      console.log("- Market count from factory:", Number(marketCount));
      console.log("- Calculated market index:", marketIndex);
      console.log("- Question text:", questionText);
      console.log("- Full market data:", marketData);

      const response = await fetch("/api/markets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(marketData),
      });

      console.log("📡 API Response status:", response.status);
      console.log(
        "📡 API Response headers:",
        Object.fromEntries(response.headers.entries())
      );

      if (response.ok) {
        const result = await response.json();
        console.log("✅ Market stored in database:", result);
        setSuccessMessage("Market created and stored successfully!");

        // Reset form after successful creation
        setTimeout(() => {
          setQuestion("");
          setDurationInput({
            days: "0",
            hours: "0",
            minutes: "0",
            seconds: "0",
          });
          setCreatorBetAmount("10");
          setCreatorSide("yes");
          setSuccessMessage("");
        }, 3000);
      } else {
        console.log("❌ API Response not OK. Status:", response.status);
        try {
          const errorData = await response.json();
          console.error("❌ Error storing market in database:", errorData);
          console.error(
            "❌ Full error details:",
            JSON.stringify(errorData, null, 2)
          );
        } catch (jsonError) {
          console.error(
            "❌ Failed to parse error response as JSON:",
            jsonError
          );
          const textResponse = await response.text();
          console.error("❌ Raw error response:", textResponse);
        }
        setSuccessMessage(
          "Market created on-chain but failed to store metadata"
        );
      }
    } catch (error) {
      console.error("Error storing market in database:", error);
      setSuccessMessage("Market created on-chain but failed to store metadata");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const totalDurationInSeconds =
      parseInt(durationInput.days || "0") * 86400 +
      parseInt(durationInput.hours || "0") * 3600 +
      parseInt(durationInput.minutes || "0") * 60 +
      parseInt(durationInput.seconds || "0");

    // Validation
    if (!question || totalDurationInSeconds <= 0) return;

    if (
      marketType === "TwoParty" &&
      (!creatorBetAmount || Number(creatorBetAmount) <= 0)
    )
      return;
    if (
      marketType === "LMSR" &&
      (!initialLiquidity || Number(initialLiquidity) <= 0)
    )
      return;

    setIsLoading(true);
    setSuccessMessage(""); // Clear previous messages

    // Store the values before they might be cleared
    const questionValue = question;
    const durationValue = totalDurationInSeconds;

    try {
      if (marketType === "TwoParty") {
        // Create TwoParty market with USDC
        const creatorBetAmountUSDC = parseUnits(creatorBetAmount, 6); // USDC has 6 decimals
        const opponentBetAmountUSDC = parseUnits(
          opponentBetAmount.toString(),
          6
        ); // USDC has 6 decimals
        const creatorChoseYes = creatorSide === "yes";

        // Choose between regular or FTSO market creation
        if (useFTSO && ftsoAddress && priceThreshold) {
          // Create FTSO-based market
          const priceThresholdScaled = parseUnits(priceThreshold, 5); // FTSO prices are scaled by 5 decimals
          writeContract({
            address: MARKET_FACTORY_ADDRESS,
            abi: MarketFactoryABI,
            functionName: "createTwoPartyMarketWithFTSO",
            args: [
              question,
              BigInt(durationValue),
              creatorBetAmountUSDC,
              opponentBetAmountUSDC,
              creatorChoseYes ? 1 : 2, // 1 = Yes, 2 = No (Outcome enum)
              MOCK_USDC_ADDRESS, // USDC token address
              ftsoAddress, // FTSO contract address
              BigInt(getFutureEpochId()), // Auto-calculated FTSO epoch ID
              priceThresholdScaled, // Price threshold (scaled by 5 decimals)
              selectedFeedId, // FTSO feed ID
            ],
          });
        } else {
          // Create regular market
          writeContract({
            address: MARKET_FACTORY_ADDRESS,
            abi: MarketFactoryABI,
            functionName: "createTwoPartyMarket",
            args: [
              question,
              BigInt(durationValue),
              creatorBetAmountUSDC,
              opponentBetAmountUSDC,
              creatorChoseYes ? 1 : 2, // 1 = Yes, 2 = No (Outcome enum)
              MOCK_USDC_ADDRESS, // USDC token address
            ],
          });
        }
      } else if (marketType === "LMSR") {
        // Create LMSR market with USDC
        const liquidityUSDC = parseUnits(initialLiquidity, 6); // USDC has 6 decimals
        const betaParameter = getBetaParameter();

        // First approve USDC spending for the factory (LMSR transfers USDC during creation)
        writeContract({
          address: MOCK_USDC_ADDRESS,
          abi: MockUSDCABI,
          functionName: "approve",
          args: [MARKET_FACTORY_ADDRESS, liquidityUSDC],
        });

        // Then create the market (USDC will be transferred during market creation)
        writeContract({
          address: MARKET_FACTORY_ADDRESS,
          abi: MarketFactoryABI,
          functionName: "createLMSRMarket",
          args: [
            MOCK_USDC_ADDRESS, // USDC token address
            question,
            BigInt(durationValue),
            betaParameter,
            liquidityUSDC,
          ],
        });
      }

      // Set pending question - database storage will happen after transaction confirmation
      setPendingQuestion(questionValue);
    } catch (err) {
      console.error("Error creating market:", err);
    }
    setIsLoading(false);
  };

  return (
    <div className="bg-white rounded-lg border shadow-sm p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">
        Create New Market
      </h2>

      {/* USDC Balance Display */}
      {userAddress && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="text-sm text-green-800">
            Your USDC Balance:{" "}
            <span className="font-semibold">
              {usdcBalance ? formatUnits(usdcBalance as bigint, 6) : "0"} USDC
            </span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 text-black">
        {/* Market Type Toggle */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Market Type
          </label>
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setMarketType("TwoParty")}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                marketType === "TwoParty"
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-300 hover:border-blue-300"
              }`}
            >
              <div className="font-semibold text-blue-700">
                Two-Party Challenge
              </div>
              <div className="text-sm text-gray-600 mt-1">
                Someone needs to accept your challenge to start trading
              </div>
            </button>
            {/* <button
              type="button"
              onClick={() => setMarketType("LMSR")}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                marketType === "LMSR"
                  ? "border-purple-500 bg-purple-50"
                  : "border-gray-300 hover:border-purple-300"
              }`}
            >
              <div className="font-semibold text-purple-700">
                Automated Market
              </div>
              <div className="text-sm text-gray-600 mt-1">
                Trade immediately with continuous liquidity
              </div>
            </button> */}
          </div>
        </div>

        <div>
          <label
            htmlFor="question"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Market Question
          </label>
          <textarea
            id="question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g., Will Bitcoin reach $100k by end of 2024?"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Duration
          </label>
          <div className="flex space-x-2">
            <div className="flex flex-col items-center">
              <label className="text-xs text-gray-500">Days</label>
              <input
                type="number"
                value={durationInput.days}
                onChange={(e) => {
                  const value = e.target.value;
                  setDurationInput({
                    ...durationInput,
                    days: value,
                  });
                }}
                placeholder="0"
                min="0"
                className="w-16 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
              />
            </div>
            <div className="flex flex-col items-center">
              <label className="text-xs text-gray-500">Hours</label>
              <input
                type="number"
                value={durationInput.hours}
                onChange={(e) => {
                  const value = e.target.value;
                  setDurationInput({
                    ...durationInput,
                    hours: value,
                  });
                }}
                placeholder="0"
                min="0"
                className="w-16 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
              />
            </div>
            <div className="flex flex-col items-center">
              <label className="text-xs text-gray-500">Minutes</label>
              <input
                type="number"
                value={durationInput.minutes}
                onChange={(e) => {
                  const value = e.target.value;
                  setDurationInput({
                    ...durationInput,
                    minutes: value,
                  });
                }}
                placeholder="0"
                min="0"
                className="w-16 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
              />
            </div>
            <div className="flex flex-col items-center">
              <label className="text-xs text-gray-500">Seconds</label>
              <input
                type="number"
                value={durationInput.seconds}
                onChange={(e) => {
                  const value = e.target.value;
                  setDurationInput({
                    ...durationInput,
                    seconds: value,
                  });
                }}
                placeholder="0"
                min="0"
                className="w-16 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
              />
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Specify how long the market stays open for betting
          </p>
        </div>

        {/* Market-Specific Configuration */}
        {marketType === "TwoParty" ? (
          <div className="space-y-4 p-4 bg-blue-50 rounded-lg">
            <h3 className="text-lg font-medium text-blue-900">
              Challenge Setup
            </h3>

            {/* Your Side Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Position
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setCreatorSide("yes")}
                  className={`px-4 py-2 rounded-md border-2 transition-all ${
                    creatorSide === "yes"
                      ? "border-green-500 bg-green-50 text-green-700"
                      : "border-gray-300 text-gray-700 hover:border-green-300"
                  }`}
                >
                  YES
                </button>
                <button
                  type="button"
                  onClick={() => setCreatorSide("no")}
                  className={`px-4 py-2 rounded-md border-2 transition-all ${
                    creatorSide === "no"
                      ? "border-red-500 bg-red-50 text-red-700"
                      : "border-gray-300 text-gray-700 hover:border-red-300"
                  }`}
                >
                  NO
                </button>
              </div>
            </div>

            {/* Creator Bet Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Bet Amount (USDC)
              </label>
              <input
                type="number"
                value={creatorBetAmount}
                onChange={(e) => setCreatorBetAmount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="10.0"
                step="0.01"
                min="0"
                required
              />
            </div>

            {/* Odds Ratio */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Odds Ratio (Your Bet : Opponent Bet)
              </label>
              <input
                type="text"
                value={oddsRatio}
                onChange={(e) => setOddsRatio(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="1:2"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Example: 1:2 means if you bet 10 USDC, opponent needs to bet 20
                USDC
              </p>
            </div>

            {/* FTSO Resolution (Optional) */}
            <div>
              <label className="flex items-center mb-2">
                <input
                  type="checkbox"
                  checked={useFTSO}
                  onChange={(e) => setUseFTSO(e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm font-medium text-gray-700">
                  Use FTSO Price Feed for Resolution
                </span>
              </label>

              {useFTSO && (
                <div className="space-y-3 p-3 bg-green-50 rounded-md border border-green-200">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      FTSO Price Feed
                    </label>

                    {/* Search Input */}
                    <input
                      type="text"
                      value={feedSearchTerm}
                      onChange={(e) => setFeedSearchTerm(e.target.value)}
                      placeholder="Search assets (e.g., BTC, ETH, FLR)..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-sm mb-2"
                    />

                    {/* Dropdown with better styling */}
                    <div className="relative">
                      <select
                        value={selectedFeedId}
                        onChange={(e) => setSelectedFeedId(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                        required={useFTSO}
                        size={Math.min(filteredFeeds.length, 8)} // Show up to 8 options at once
                      >
                        {filteredFeeds.length === 0 ? (
                          <option disabled>No feeds found</option>
                        ) : (
                          filteredFeeds.map((feed) => (
                            <option key={feed.feedId} value={feed.feedId}>
                              {feed.risk} {feed.name}
                            </option>
                          ))
                        )}
                      </select>

                      {/* Show count of results */}
                      {feedSearchTerm && (
                        <p className="text-xs text-gray-500 mt-1">
                          {filteredFeeds.length} feed
                          {filteredFeeds.length !== 1 ? "s" : ""} found
                        </p>
                      )}
                    </div>

                    {/* Selected Feed Display */}
                    {selectedFeedId && (
                      <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="text-green-600">✓</span>
                            <span className="text-sm font-medium text-green-800">
                              Selected Feed:
                            </span>
                            <span className="text-sm text-green-700">
                              {
                                ftsoFeeds.find(
                                  (feed) => feed.feedId === selectedFeedId
                                )?.risk
                              }{" "}
                              {
                                ftsoFeeds.find(
                                  (feed) => feed.feedId === selectedFeedId
                                )?.name
                              }
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSelectedFeedId("")}
                            className="text-xs text-red-600 hover:text-red-800 underline"
                          >
                            Clear
                          </button>
                        </div>
                        <p className="text-xs text-green-600 mt-1">
                          This price feed will be used to resolve your market
                        </p>
                      </div>
                    )}

                    <p className="text-xs text-gray-500 mt-1">
                      Select the price feed for market resolution
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Price Threshold (USD)
                    </label>
                    <input
                      type="number"
                      value={priceThreshold}
                      onChange={(e) => setPriceThreshold(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                      placeholder="50000"
                      step="0.01"
                      min="0"
                      required={useFTSO}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Price ≥ threshold = YES, Price &lt; threshold = NO
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Preview */}
            {creatorBetAmount && oddsRatio && (
              <div className="p-3 bg-blue-50 rounded-md">
                <p className="text-sm text-blue-800">
                  <strong>Challenge Preview:</strong> You&apos;ll bet{" "}
                  {creatorBetAmount} USDC on {creatorSide.toUpperCase()}.
                  Someone needs to bet {opponentBetAmount.toFixed(2)} USDC on{" "}
                  {creatorSide === "yes" ? "NO" : "YES"} to activate this
                  challenge.
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Winner takes all (
                  {(Number(creatorBetAmount) + opponentBetAmount).toFixed(2)}{" "}
                  USDC total)
                </p>
                <p className="text-xs text-orange-600 mt-1">
                  <strong>Note:</strong> After creating the market, you&apos;ll
                  need to provide your initial USDC stake to start the
                  challenge.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4 p-4 bg-purple-50 rounded-lg">
            <h3 className="text-lg font-medium text-purple-900">
              Automated Market Setup
            </h3>

            {/* Initial Liquidity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Initial Liquidity (ETH)
              </label>
              <input
                type="number"
                value={initialLiquidity}
                onChange={(e) => setInitialLiquidity(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="0.01"
                step="0.001"
                min="0"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                This ETH will be used to provide initial market liquidity
              </p>
            </div>

            {/* Liquidity Level Slider */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Market Liquidity Level
              </label>
              <div className="space-y-3">
                <div className="flex items-center space-x-4">
                  <span className="text-sm font-medium text-purple-600 w-16">
                    Volatile
                  </span>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={liquidityLevel}
                    onChange={(e) => setLiquidityLevel(Number(e.target.value))}
                    className="flex-1 h-2 bg-gradient-to-r from-purple-200 to-purple-600 rounded-lg appearance-none cursor-pointer"
                  />
                  <span className="text-sm font-medium text-purple-600 w-16">
                    Stable
                  </span>
                </div>
                <div className="text-center">
                  <div className="text-sm font-medium text-purple-700">
                    Level {liquidityLevel}
                  </div>
                  <div className="text-xs text-gray-600">
                    {getLiquidityDescription()}
                  </div>
                </div>
              </div>
            </div>

            {/* Preview */}
            <div className="p-3 bg-purple-100 rounded-md">
              <p className="text-sm text-purple-800">
                <strong>Market Preview:</strong> Your {initialLiquidity} ETH
                will provide initial liquidity. Users can trade immediately at
                market-determined prices.
              </p>
              <p className="text-xs text-purple-600 mt-1">
                True LMSR pricing with constant liquidity. Share prices adjust
                based on trading activity and beta parameter.
              </p>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={isPending || isLoading}
          className={`w-full px-4 py-2 text-white rounded-md disabled:bg-gray-400 disabled:cursor-not-allowed ${
            marketType === "TwoParty"
              ? "bg-blue-600 hover:bg-blue-700"
              : "bg-purple-600 hover:bg-purple-700"
          }`}
        >
          {isPending || isLoading
            ? "Creating..."
            : `Create ${marketType === "TwoParty" ? "Challenge" : "Automated"} Market`}
        </button>
      </form>

      {/* Transaction Status */}
      {isPending && (
        <div className="mt-4 text-sm text-blue-600">Transaction pending...</div>
      )}
      {isConfirming && (
        <div className="mt-4 text-sm text-yellow-600">
          Confirming transaction...
        </div>
      )}
      {/* Transaction Hash Display */}
      {!isPending && !isConfirming && !error && txHash && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
          <p className="text-green-800 font-medium mb-2">
            {isSuccess
              ? successMessage || "Market created successfully!"
              : "Transaction submitted!"}
          </p>
          <div className="space-y-2">
            <p className="text-sm text-green-700">Transaction Hash:</p>
            <div className="flex items-center space-x-2">
              <code className="bg-white px-3 py-2 rounded border text-sm font-mono text-gray-800 flex-1 break-all">
                {txHash}
              </code>
              <button
                onClick={() => navigator.clipboard.writeText(txHash)}
                className="px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                title="Copy to clipboard"
              >
                Copy
              </button>
            </div>
            <a
              href={`https://sepolia.etherscan.io/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-sm text-blue-600 hover:text-blue-800 underline"
            >
              View on Etherscan →
            </a>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 text-sm text-red-600">Error: {error.message}</div>
      )}
    </div>
  );
}
