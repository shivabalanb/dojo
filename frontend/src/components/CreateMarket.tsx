"use client";

import React, { useState, useEffect } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { readContract } from "wagmi/actions";
import { config } from "../lib/wagmi";
import { parseEther } from "viem";

import { MarketFactoryABI, MARKET_FACTORY_ADDRESS } from "../lib/abis";

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

  // New fields for initial liquidity
  const [totalAmount, setTotalAmount] = useState("0.001");
  const [yesPercentage, setYesPercentage] = useState(70);
  const [creatorSide, setCreatorSide] = useState<"yes" | "no">("yes");

  // Calculate amounts based on percentage
  const yesAmount = totalAmount
    ? ((yesPercentage / 100) * Number(totalAmount)).toFixed(4)
    : "";
  const noAmount = totalAmount
    ? (((100 - yesPercentage) / 100) * Number(totalAmount)).toFixed(4)
    : "";

  const { writeContract, data: txHash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
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
        functionName: "getMarketCount",
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
          setTotalAmount("");
          setYesPercentage(50);
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

    if (
      !question ||
      totalDurationInSeconds <= 0 ||
      !totalAmount ||
      Number(totalAmount) <= 0
    )
      return;

    setIsLoading(true);
    setSuccessMessage(""); // Clear previous messages

    // Store the values before they might be cleared
    const questionValue = question;
    const durationValue = totalDurationInSeconds;
    const yesAmountWei = parseEther(yesAmount);
    const noAmountWei = parseEther(noAmount);
    const creatorChoseYes = creatorSide === "yes";
    const creatorAmountWei = creatorChoseYes ? yesAmountWei : noAmountWei;

    try {
      writeContract({
        address: MARKET_FACTORY_ADDRESS,
        abi: MarketFactoryABI,
        functionName: "createMarket",
        args: [
          question,
          BigInt(durationValue),
          yesAmountWei,
          noAmountWei,
          creatorChoseYes ? 1 : 2, // 1 = Yes, 2 = No (Outcome enum)
        ],
        value: creatorAmountWei,
      });

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

      <form onSubmit={handleSubmit} className="space-y-4 text-black">
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

        {/* Initial Liquidity Setup */}
        <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-medium text-gray-900">
            Initial Liquidity Challenge
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

          {/* Total Pool Size */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Total Pool Size (ETH)
            </label>
            <input
              type="number"
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="1.0"
              step="0.001"
              min="0"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Total liquidity that will be in the market
            </p>
          </div>

          {/* Odds Slider */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Initial Odds
            </label>
            <div className="space-y-3">
              <div className="flex items-center space-x-4">
                <span className="text-sm font-medium text-green-600 w-12">
                  YES
                </span>
                <input
                  type="range"
                  min="10"
                  max="90"
                  value={yesPercentage}
                  onChange={(e) => setYesPercentage(Number(e.target.value))}
                  className="flex-1 h-2 bg-gradient-to-r from-green-200 via-yellow-200 to-red-200 rounded-lg appearance-none cursor-pointer slider"
                  style={{
                    background: `linear-gradient(to right, #10b981 0%, #10b981 ${yesPercentage}%, #ef4444 ${yesPercentage}%, #ef4444 100%)`,
                  }}
                />
                <span className="text-sm font-medium text-red-600 w-12">
                  NO
                </span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>{yesPercentage}% YES</span>
                <span>{100 - yesPercentage}% NO</span>
              </div>
            </div>
          </div>

          {/* Amount Breakdown */}
          <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 rounded-lg">
            <div className="text-center">
              <div className="text-sm font-medium text-gray-700">YES Pool</div>
              <div className="text-lg font-bold text-green-600">
                {yesAmount || "0"} ETH
              </div>
              {creatorSide === "yes" && (
                <p className="text-xs text-green-600 mt-1">
                  ← You&apos;ll pay this
                </p>
              )}
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-gray-700">NO Pool</div>
              <div className="text-lg font-bold text-red-600">
                {noAmount || "0"} ETH
              </div>
              {creatorSide === "no" && (
                <p className="text-xs text-red-600 mt-1">
                  ← You&apos;ll pay this
                </p>
              )}
            </div>
          </div>

          {/* Preview */}
          {totalAmount && yesAmount && noAmount && (
            <div className="p-3 bg-blue-50 rounded-md">
              <p className="text-sm text-blue-800">
                <strong>Challenge Preview:</strong> You&apos;ll bet{" "}
                {creatorSide === "yes" ? yesAmount : noAmount} ETH on{" "}
                {creatorSide.toUpperCase()}. Someone needs to bet{" "}
                {creatorSide === "yes" ? noAmount : yesAmount} ETH on{" "}
                {creatorSide === "yes" ? "NO" : "YES"} to activate this{" "}
                {totalAmount} ETH market.
              </p>
              <p className="text-xs text-blue-600 mt-1">
                Market will start at {yesPercentage}% YES /{" "}
                {100 - yesPercentage}% NO odds
              </p>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={isPending || isLoading}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isPending || isLoading ? "Creating..." : "Create Market"}
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
