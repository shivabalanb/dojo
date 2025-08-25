"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useReadContract, useReadContracts } from "wagmi";
import {
  MarketFactoryABI,
  MARKET_FACTORY_ADDRESS,
  ConstantProductMarketABI,
} from "../lib/abis";
import { MarketCard } from "./MarketCard";
import { Hex } from "viem";

export function MarketList() {
  const [activeMarkets, setActiveMarkets] = useState<
    Array<{
      address: Hex;
      endTime: number;
      outcome: number;
      marketState: number;
      title?: string;
      question?: string;
    }>
  >([]);

  const [closedMarkets, setClosedMarkets] = useState<
    Array<{
      address: Hex;
      endTime: number;
      outcome: number;
      marketState: number;
      title?: string;
      question?: string;
    }>
  >([]);

  const {
    data: allMarkets,
    isLoading,
    refetch,
  } = useReadContract({
    address: MARKET_FACTORY_ADDRESS,
    abi: MarketFactoryABI,
    functionName: "getAllMarkets",
  }) as {
    data: Hex[] | undefined;
    isLoading: boolean;
    refetch: () => void;
  };

  const calls = useMemo(
    () =>
      (allMarkets ?? []).map((address) => ({
        address,
        abi: ConstantProductMarketABI,
        functionName: "meta" as const,
      })),
    [allMarkets]
  );

  const { data } = useReadContracts({
    contracts: calls as any,
    query: { enabled: calls.length > 0 },
  });

  useEffect(() => {
    if (!data || !allMarkets) return;

    const marketsData = (allMarkets as Hex[]).map((address, marketIndex) => {
      const metaResult = data[marketIndex]?.result as
        | readonly [bigint, number, number, string, string]
        | undefined;

      const endTime = metaResult?.[0];
      const outcome = metaResult?.[1];
      const marketState = metaResult?.[2];
      const title = metaResult?.[3];
      const question = metaResult?.[4];

      return {
        address,
        endTime: endTime ? Number(endTime) : 0,
        outcome: outcome ?? 0,
        marketState: marketState ?? 0,
        title,
        question,
      };
    });

    // Separate active and closed markets
    const currentTime = Math.floor(Date.now() / 1000);
    const active = marketsData.filter((market) => market.endTime > currentTime);
    const closed = marketsData.filter(
      (market) => market.endTime <= currentTime
    );

    // Sort active markets by end time (earliest first)
    active.sort((a, b) => a.endTime - b.endTime);

    // Sort closed markets by end time (most recent first)
    closed.sort((a, b) => b.endTime - a.endTime);

    setActiveMarkets(active);
    setClosedMarkets(closed);
  }, [allMarkets, data]);

  return (
    <div className="space-y-8">
      {/* Active Markets Section */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Active Markets ({activeMarkets.length})
          </h2>
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
        ) : activeMarkets.length === 0 && closedMarkets.length === 0 ? (
          <div className="text-center py-8 bg-white rounded-lg border">
            <p className="text-gray-600">No markets available yet.</p>
            <p className="text-sm text-gray-500 mt-1">
              Create the first market to get started!
            </p>
          </div>
        ) : activeMarkets.length === 0 ? (
          <div className="text-center py-8 bg-white rounded-lg border">
            <p className="text-gray-600">No active markets.</p>
            <p className="text-sm text-gray-500 mt-1">
              All markets have ended.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {activeMarkets.map((marketData) => (
              <MarketCard key={marketData.address} {...marketData} />
            ))}
          </div>
        )}
      </div>

      {/* Closed Markets Section */}
      {closedMarkets.length > 0 && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Closed Markets ({closedMarkets.length})
            </h2>
          </div>
          <div className="space-y-4">
            {closedMarkets.map((marketData) => (
              <MarketCard key={marketData.address} {...marketData} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
