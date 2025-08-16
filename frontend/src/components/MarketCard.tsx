'use client';

import { useState } from 'react';
import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { MarketABI } from '../lib/abis/Market';

interface MarketCardProps {
  address: `0x${string}`;
  question: string;
}

export function MarketCard({ address, question }: MarketCardProps) {
  const { address: userAddress } = useAccount();
  const [betAmount, setBetAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Read market data
  const { data: outcome } = useReadContract({
    address,
    abi: MarketABI,
    functionName: 'outcome',
  });

  const { data: endTime } = useReadContract({
    address,
    abi: MarketABI,
    functionName: 'endTime',
  });

  const { data: yesPool } = useReadContract({
    address,
    abi: MarketABI,
    functionName: 'yesPool',
  });

  const { data: noPool } = useReadContract({
    address,
    abi: MarketABI,
    functionName: 'noPool',
  });

  const { data: yesStake } = useReadContract({
    address,
    abi: MarketABI,
    functionName: 'yesStake',
    args: userAddress ? [userAddress] : undefined,
  });

  const { data: noStake } = useReadContract({
    address,
    abi: MarketABI,
    functionName: 'noStake',
    args: userAddress ? [userAddress] : undefined,
  });

  const { data: resolver } = useReadContract({
    address,
    abi: MarketABI,
    functionName: 'resolver',
  });

  // Write functions
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  // Helper functions
  const isMarketClosed = () => {
    if (!endTime) return false;
    return Date.now() / 1000 > Number(endTime);
  };

  const isResolved = () => outcome !== 0; // Outcome.Unresolved = 0

  const getOutcomeText = () => {
    if (outcome === 1) return 'YES';
    if (outcome === 2) return 'NO';
    return 'Unresolved';
  };

  const canClaim = () => {
    if (!isResolved() || !yesStake || !noStake) return false;
    return Number(yesStake) > 0 || Number(noStake) > 0;
  };

  const getWinningChance = () => {
    if (!yesPool || !noPool) return { yes: 50, no: 50 };
    const total = Number(yesPool) + Number(noPool);
    if (total === 0) return { yes: 50, no: 50 };
    return {
      yes: Math.round((Number(noPool) / total) * 100),
      no: Math.round((Number(yesPool) / total) * 100),
    };
  };

  // Contract interactions
  const buyYes = async () => {
    if (!betAmount) return;
    setIsLoading(true);
    try {
      writeContract({
        address,
        abi: MarketABI,
        functionName: 'buyYes',
        value: parseEther(betAmount),
      });
    } catch (err) {
      console.error('Error buying YES:', err);
    }
    setIsLoading(false);
  };

  const buyNo = async () => {
    if (!betAmount) return;
    setIsLoading(true);
    try {
      writeContract({
        address,
        abi: MarketABI,
        functionName: 'buyNo',
        value: parseEther(betAmount),
      });
    } catch (err) {
      console.error('Error buying NO:', err);
    }
    setIsLoading(false);
  };

  const claim = async () => {
    setIsLoading(true);
    try {
      writeContract({
        address,
        abi: MarketABI,
        functionName: 'claim',
      });
    } catch (err) {
      console.error('Error claiming:', err);
    }
    setIsLoading(false);
  };

  const resolve = async (resolveOutcome: number) => {
    setIsLoading(true);
    try {
      writeContract({
        address,
        abi: MarketABI,
        functionName: 'resolve',
        args: [resolveOutcome],
      });
    } catch (err) {
      console.error('Error resolving:', err);
    }
    setIsLoading(false);
  };

  const chances = getWinningChance();

  return (
    <div className="bg-white rounded-lg border shadow-sm p-6">
      {/* Market Info */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{question}</h3>
        <div className="flex justify-between text-sm text-gray-600">
          <span>Market: {address.slice(0, 8)}...{address.slice(-6)}</span>
          <span>
            Status: {isResolved() ? `Resolved: ${getOutcomeText()}` : isMarketClosed() ? 'Closed' : 'Active'}
          </span>
        </div>
        {endTime && (
          <div className="text-sm text-gray-600 mt-1">
            Ends: {new Date(Number(endTime) * 1000).toLocaleString()}
          </div>
        )}
      </div>

      {/* Pool Info */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-green-50 p-3 rounded">
          <div className="text-sm font-medium text-green-800">YES Pool</div>
          <div className="text-lg font-bold text-green-900">
            {yesPool ? formatEther(yesPool) : '0'} ETH
          </div>
          <div className="text-sm text-green-700">
            Win: {chances.yes}%
          </div>
        </div>
        <div className="bg-red-50 p-3 rounded">
          <div className="text-sm font-medium text-red-800">NO Pool</div>
          <div className="text-lg font-bold text-red-900">
            {noPool ? formatEther(noPool) : '0'} ETH
          </div>
          <div className="text-sm text-red-700">
            Win: {chances.no}%
          </div>
        </div>
      </div>

      {/* User Stakes */}
      {userAddress && (yesStake || noStake) && (
        <div className="mb-4 p-3 bg-gray-50 rounded">
          <div className="text-sm font-medium text-gray-700 mb-2">Your Stakes:</div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>YES: {yesStake ? formatEther(yesStake) : '0'} ETH</div>
            <div>NO: {noStake ? formatEther(noStake) : '0'} ETH</div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="space-y-3">
        {/* Betting Interface */}
        {!isMarketClosed() && !isResolved() && (
          <>
            <div className="flex gap-2">
              <input
                type="number"
                step="0.01"
                placeholder="Amount in ETH"
                value={betAmount}
                onChange={(e) => setBetAmount(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={buyYes}
                disabled={!betAmount || isPending || isLoading}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
              >
                Buy YES
              </button>
              <button
                onClick={buyNo}
                disabled={!betAmount || isPending || isLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400"
              >
                Buy NO
              </button>
            </div>
          </>
        )}

        {/* Claim Button */}
        {isResolved() && canClaim() && (
          <button
            onClick={claim}
            disabled={isPending || isLoading}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
          >
            Claim Winnings
          </button>
        )}

        {/* Resolve Buttons (for resolvers) */}
        {isMarketClosed() && !isResolved() && resolver === userAddress && (
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => resolve(1)}
              disabled={isPending || isLoading}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
            >
              Resolve YES
            </button>
            <button
              onClick={() => resolve(2)}
              disabled={isPending || isLoading}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400"
            >
              Resolve NO
            </button>
          </div>
        )}
      </div>

      {/* Transaction Status */}
      {isPending && (
        <div className="mt-3 text-sm text-blue-600">Transaction pending...</div>
      )}
      {isConfirming && (
        <div className="mt-3 text-sm text-yellow-600">Confirming transaction...</div>
      )}
      {isConfirmed && (
        <div className="mt-3 text-sm text-green-600">Transaction confirmed!</div>
      )}
      {error && (
        <div className="mt-3 text-sm text-red-600">Error: {error.message}</div>
      )}
    </div>
  );
}