"use client";

import React, { useState } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import {
  MarketFactoryABI,
  MARKET_FACTORY_ADDRESS,
} from "../lib/abis/MarketFactory";
import { Hex } from "viem";

export function CreateMarket() {
  const [question, setQuestion] = useState("");
  const [duration, setDuration] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [transactionHash, setTransactionHash] = useState<Hex | null>(null);
  const [successMessage, setSuccessMessage] = useState("");

  const { writeContract, data: txHash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question || !duration) return;

    setIsLoading(true);
    try {
      writeContract({
        address: MARKET_FACTORY_ADDRESS,
        abi: MarketFactoryABI,
        functionName: "createMarket",
        args: [question, BigInt(parseInt(duration) * 3600)],
      });
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
          <label
            htmlFor="duration"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Duration (hours)
          </label>
          <input
            type="number"
            id="duration"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="24"
            min="1"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <p className="text-sm text-gray-500 mt-1">
            How long the market stays open for betting
          </p>
        </div>

        <button
          type="submit"
          disabled={!question || !duration || isPending || isLoading}
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

      {error && (
        <div className="mt-4 text-sm text-red-600">Error: {error.message}</div>
      )}

      {/* Info */}
      <div className="mt-6 p-4 bg-gray-50 rounded-md">
        <h3 className="text-sm font-medium text-gray-700 mb-2">
          How it works:
        </h3>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Create a yes/no question about a future event</li>
          <li>• Users can bet ETH on YES or NO outcomes</li>
          <li>• After the duration expires, you can resolve the market</li>
          <li>• Winners share the total pool proportionally</li>
        </ul>
      </div>

      {successMessage && (
        <div>
          <p style={{ color: "green" }}>{successMessage}</p>
          <p>
            Transaction Hash:{" "}
            <a
              href={`https://sepolia.etherscan.io/tx/${transactionHash}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {transactionHash}
            </a>
          </p>
        </div>
      )}
    </div>
  );
}
