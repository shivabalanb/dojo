"use client";

import React, { useState, useEffect } from "react";
import { useReadContract } from "wagmi";
import {
  MarketFactoryABI,
  MARKET_FACTORY_ADDRESS,
  ConstantProductMarketABI,
} from "../lib/abis";
import { MarketCard } from "./MarketCard";
import { Hex } from "viem";

export function MarketList() {
  const [sortedMarkets, setSortedMarkets] = useState<
    Array<{ address: `0x${string}`; endTime: number }>
  >([]);

  // Read all markets from the factory
  const {
    data: allMarkets,
    isLoading,
    refetch,
  } = useReadContract({
    address: MARKET_FACTORY_ADDRESS as Hex,
    abi: MarketFactoryABI,
    functionName: "getAllMarkets",
  }) as {
    data: Hex[] | undefined;
    isLoading: boolean;
    refetch: () => void;
  };

  // Sort markets by time to expiration
  useEffect(() => {
    const sortMarketsByExpiration = async () => {
      if (!allMarkets || allMarkets.length === 0) {
        setSortedMarkets([]);
        return;
      }

      try {
        // For now, just use the original order since we can't easily fetch end times
        // In a production app, you'd want to fetch end times from each market contract
        setSortedMarkets(
          allMarkets.map((address) => ({ address, endTime: 0 }))
        );
      } catch (error) {
        console.error("Error sorting markets:", error);
        setSortedMarkets(
          allMarkets.map((address) => ({ address, endTime: 0 }))
        );
      }
    };

    sortMarketsByExpiration();
  }, [allMarkets]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Active Markets</h2>
        <button
          onClick={() => refetch()}
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
          {sortedMarkets.map(({ address }) => (
            <MarketCard key={address} address={address} />
          ))}
        </div>
      )}
    </div>
  );
}
