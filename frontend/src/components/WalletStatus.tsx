"use client";

import { useAccount, useBalance, useDisconnect } from "wagmi";
import { useEffect, useState } from "react";
import { formatEther } from "viem";

export function WalletStatus() {
  const { address, isConnected, chain } = useAccount();
  const { disconnect } = useDisconnect();
  const [mounted, setMounted] = useState(false);

  // Get ETH balance
  const { data: balance, isLoading: balanceLoading } = useBalance({
    address: address,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !isConnected || !address) {
    return null;
  }

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const getNetworkName = () => {
    if (chain?.id === 31337) return "Anvil Local";
    return chain?.name || "Unknown";
  };

  const getNetworkColor = () => {
    if (chain?.id === 31337) return "bg-green-100 text-green-800";
    if (chain?.id === 1) return "bg-blue-100 text-blue-800";
    return "bg-gray-100 text-gray-800";
  };

  return (
    <div className="bg-white rounded-lg border shadow-sm p-4 mb-6 text-black">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-900">Wallet Status</h3>
        <button
          onClick={() => disconnect()}
          className="text-sm text-red-600 hover:text-red-800 hover:underline"
        >
          Disconnect
        </button>
      </div>

      <div className="space-y-3">
        {/* Address */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Address:</span>
          <div className="flex items-center gap-2">
            <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
              {formatAddress(address)}
            </code>
            <button
              onClick={() => navigator.clipboard.writeText(address)}
              className="text-blue-600 hover:text-blue-800 text-sm"
              title="Copy full address"
            >
              📋
            </button>
          </div>
        </div>

        {/* Network */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Network:</span>
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${getNetworkColor()}`}
          >
            {getNetworkName()}
          </span>
        </div>

        {/* Balance */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">ETH Balance:</span>
          <div className="text-right">
            {balanceLoading ? (
              <span className="text-sm text-gray-400">Loading...</span>
            ) : balance ? (
              <div>
                <div className="font-medium">
                  {parseFloat(formatEther(balance.value)).toFixed(4)} ETH
                </div>
                <div className="text-xs text-gray-500">
                  ${(parseFloat(formatEther(balance.value)) * 2000).toFixed(2)}{" "}
                  USD
                </div>
              </div>
            ) : (
              <span className="text-sm text-gray-400">-</span>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-4 pt-3 border-t border-gray-200">
        <div className="text-xs text-gray-500 mb-2">Quick Actions:</div>
        <div className="flex gap-2">
          <button
            onClick={() =>
              window.open(`https://faucet.paradigm.xyz/`, "_blank")
            }
            className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded hover:bg-blue-100"
          >
            🚰 Get Testnet ETH
          </button>
          <button
            onClick={() =>
              window.open(`https://etherscan.io/address/${address}`, "_blank")
            }
            className="text-xs bg-gray-50 text-gray-700 px-2 py-1 rounded hover:bg-gray-100"
          >
            🔍 View on Explorer
          </button>
        </div>
      </div>

      {/* Network Warning for Local */}
      {chain?.id === 31337 && (
        <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
          <div className="flex items-center gap-1 text-yellow-800">
            ⚠️ <span className="font-medium">Local Network</span>
          </div>
          <div className="text-yellow-700 mt-1">
            You're connected to Anvil localhost. Perfect for testing!
          </div>
        </div>
      )}
    </div>
  );
}
