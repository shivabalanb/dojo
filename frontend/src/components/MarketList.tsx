"use client";

import { useState, useEffect } from "react";
import { useReadContract } from "wagmi";
import { MarketFactoryABI } from "../lib/abis";
import { MarketCard } from "./MarketCard";
import { MARKET_FACTORY_ADDRESS } from "@/lib/abis/MarketFactory";

interface MarketMetadata {
  market_index: number;
  question: string;
}

export function MarketList() {
  const [dbMarkets, setDbMarkets] = useState<MarketMetadata[]>([]);

  // Read all markets from the factory
  const {
    data: allMarkets,
    isLoading,
    refetch,
  } = useReadContract({
    address: MARKET_FACTORY_ADDRESS as `0x${string}`,
    abi: MarketFactoryABI,
    functionName: "getAllMarkets",
  });

  // Simple: fetch DB data once on mount
  useEffect(() => {
    fetch("/api/markets")
      .then((res) => res.json())
      .then((data) => {
        // Ensure we always set an array
        if (Array.isArray(data)) {
          setDbMarkets(data);
        } else {
          console.error("API returned non-array data:", data);
          setDbMarkets([]);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch markets:", err);
        setDbMarkets([]);
      });
  }, []);

  // Get question for a market index, fallback to generic title
  const getMarketQuestion = (index: number): string => {
    // Ensure dbMarkets is an array before calling find
    if (!Array.isArray(dbMarkets)) {
      return `Market ${index + 1}`;
    }
    const dbMarket = dbMarkets.find((market) => market.market_index === index);
    return dbMarket ? dbMarket.question : `Market ${index + 1}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Active Markets</h2>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Refresh
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading markets...</p>
        </div>
      ) : !allMarkets || allMarkets.length === 0 ? (
        <div className="text-center py-8 bg-white rounded-lg border">
          <p className="text-gray-600">No markets available yet.</p>
          <p className="text-sm text-gray-500 mt-1">
            Create the first market to get started!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {allMarkets
            // .slice()
            // .reverse()
            .map((marketAddress, index) => {
              const question = getMarketQuestion(index);
              const hasDbEntry = dbMarkets.some(
                (market) => market.market_index === index
              );

              return (
                <div key={marketAddress} className="relative">
                  <MarketCard
                    address={marketAddress as `0x${string}`}
                    question={question}
                  />
                  {/* Visual indicator if data comes from DB */}
                  {hasDbEntry && (
                    <div
                      className="absolute top-2 right-2 w-3 h-3 bg-green-500 rounded-full"
                      title="Has database entry"
                    ></div>
                  )}
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
