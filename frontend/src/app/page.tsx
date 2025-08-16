'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { MarketList } from '../components/MarketList';
import { CreateMarket } from '../components/CreateMarket';
import { WalletStatus } from '../components/WalletStatus';

export default function Home() {
  const { isConnected } = useAccount();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Kleos Markets</h1>
          <ConnectButton />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {!isConnected ? (
          <div className="text-center py-12">
            <h2 className="text-xl text-gray-600 mb-4">Connect your wallet to start betting</h2>
            <ConnectButton />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Market List */}
            <div className="lg:col-span-2">
              <MarketList />
            </div>
            
            {/* Sidebar */}
            <div>
              <WalletStatus />
              <CreateMarket />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
