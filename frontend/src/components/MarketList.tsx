'use client';

import { useState } from 'react';
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { MarketFactoryABI, CONTRACTS } from '../lib/abis';
import { MarketCard } from './MarketCard';

export function MarketList() {
  const [markets, setMarkets] = useState<string[]>([]);

  // Read all markets from the factory
  const { data: allMarkets, isLoading, refetch } = useReadContract({
    address: CONTRACTS.MARKET_FACTORY as `0x${string}`,
    abi: MarketFactoryABI,
    functionName: 'getAllMarkets',
  });

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
          <p className="text-sm text-gray-500 mt-1">Create the first market to get started!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {allMarkets.map((marketAddress, index) => (
            <MarketCard 
              key={marketAddress} 
              address={marketAddress as `0x${string}`} 
              question={`Market ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}