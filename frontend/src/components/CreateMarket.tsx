"use client";

import React, { useState, useEffect } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { readContract } from "wagmi/actions";
import { config } from "../lib/wagmi";

import {
  MarketFactoryABI,
  MARKET_FACTORY_ADDRESS,
} from "../lib/abis/MarketFactory";

export function CreateMarket() {
  const [question, setQuestion] = useState("");
  const [durationInput, setDurationInput] = useState({
    days: "0",
    hours: "0",
    minutes: "0",
    seconds: "0",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [pendingQuestion, setPendingQuestion] = useState("");

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
      const marketIndex = Number(marketCount) -1 ;

      const marketData = {
        market_index: marketIndex,
        question: questionText,
      };

      console.log("Storing market in database:", marketData);

      const response = await fetch("/api/markets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(marketData),
      });

      if (response.ok) {
        const result = await response.json();
        console.log("Market stored in database:", result);
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
          setSuccessMessage("");
        }, 3000);
      } else {
        const errorData = await response.json();
        console.error("Error storing market in database:", errorData);
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

    if (!question || totalDurationInSeconds <= 0) return;

    setIsLoading(true);
    setSuccessMessage(""); // Clear previous messages

    // Store the values before they might be cleared
    const questionValue = question;
    const durationValue = totalDurationInSeconds;

    try {
      writeContract({
        address: MARKET_FACTORY_ADDRESS,
        abi: MarketFactoryABI,
        functionName: "createMarket",
        args: [question, BigInt(durationValue)],
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
