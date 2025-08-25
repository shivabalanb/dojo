"use client";

import React, { useState, useEffect, Fragment } from "react";
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
  useAccount,
} from "wagmi";
import { writeContract } from "wagmi/actions";
import { parseUnits, formatUnits } from "viem";
import {
  MarketFactoryABI,
  MARKET_FACTORY_ADDRESS,
  MOCK_USDC_ADDRESS,
  MockUSDCABI,
} from "../lib/abis";
import { MAX_UINT256 } from "../lib/utils";

import { Input, Textarea, DurationPicker, PreviewCard } from "./ui";

// Reusable components - defined outside to avoid recreation on every render
const Pill = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-emerald-500/15 to-cyan-500/15 px-3 py-1 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-300/40">
    {children}
  </span>
);

const Card = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-3xl border border-slate-200 bg-white shadow-[0_10px_40px_-15px_rgba(0,0,0,0.2)]">
    {children}
  </div>
);

// CSS constants - defined outside to avoid recreation on every render
const inputCls =
  "w-full px-3 py-2 border-2 border-slate-300 rounded-xl bg-white text-slate-900 placeholder-slate-400 text-sm font-medium";

const chipBase =
  "w-full h-11 rounded-xl border font-extrabold flex items-center justify-center transition";
const chipOn = "border-white/40 bg-white/30 text-slate-900 shadow";
const chipOff = "border-white/20 bg-white/10 text-slate-800 hover:bg-white/20";

const inputGlass =
  "h-11 w-full rounded-xl border border-white/30 bg-white/70 backdrop-blur-sm px-3 text-slate-900 placeholder-slate-500 shadow-inner";

// Helper functions - defined outside to avoid recreation on every render
const formatUSDC = (amount: number | string) => {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "0 USDC";

  // If it's a whole number, don't show decimals
  if (Number.isInteger(num)) {
    return `${num} USDC`;
  }

  // Otherwise show up to 2 decimal places, removing trailing zeros
  return `${num.toFixed(2).replace(/\.?0+$/, "")} USDC`;
};

export function CreateMarket() {
  const [title, setTitle] = useState("ETH Price Prediction");
  const [question, setQuestion] = useState("Will the price of ETH go up?");
  const [durationInput, setDurationInput] = useState({
    days: "0",
    hours: "1",
    minutes: "0",
    seconds: "0",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [pendingQuestion, setPendingQuestion] = useState("");
  const [initialLiquidity, setInitialLiquidity] = useState("10");
  const [hasInfiniteApproval, setHasInfiniteApproval] = useState(false);

  const { writeContract, data: txHash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });
  const { address: userAddress } = useAccount();
  const { data: usdcBalance } = useReadContract({
    address: MOCK_USDC_ADDRESS,
    abi: MockUSDCABI,
    functionName: "balanceOf",
    args: userAddress ? [userAddress] : undefined,
  });

  const { data: factoryAllowance } = useReadContract({
    address: MOCK_USDC_ADDRESS,
    abi: MockUSDCABI,
    functionName: "allowance",
    args: userAddress ? [userAddress, MARKET_FACTORY_ADDRESS] : undefined,
  });

  useEffect(() => {
    if (isSuccess && pendingQuestion) {
      setSuccessMessage("Market created successfully!");
      setTimeout(() => {
        setTitle("ETH Price Prediction");
        setQuestion("");
        setDurationInput({
          days: "0",
          hours: "0",
          minutes: "0",
          seconds: "0",
        });
        setInitialLiquidity("10");
        setSuccessMessage("");
      }, 1200);
      setPendingQuestion("");
    }
  }, [isSuccess, pendingQuestion]);

  useEffect(() => {
    if (factoryAllowance !== undefined && factoryAllowance !== null) {
      setHasInfiniteApproval((factoryAllowance as bigint) >= MAX_UINT256);
    }
  }, [factoryAllowance]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const total =
      parseInt(durationInput.days || "0") * 86400 +
      parseInt(durationInput.hours || "0") * 3600 +
      parseInt(durationInput.minutes || "0") * 60 +
      parseInt(durationInput.seconds || "0");
    if (!question || total <= 0) return;
    if (!initialLiquidity || Number(initialLiquidity) <= 0) return;

    setIsLoading(true);
    const qVal = question;
    try {
      // Validate initial liquidity
      const liquidityAmount = Number(initialLiquidity);
      if (liquidityAmount <= 0 || liquidityAmount > 1000) {
        alert("Initial liquidity must be between 0.01 and 1000 USDC");
        return;
      }

      // Parse values with proper validation
      const liquidityUSDC = parseUnits(initialLiquidity, 6);

      console.log("Constant Product Market Creation Parameters:");
      console.log("- Initial Liquidity (UI):", initialLiquidity, "USDC");
      console.log(
        "- Initial Liquidity (parsed):",
        liquidityUSDC.toString(),
        "wei"
      );
      console.log("- Duration:", total, "seconds");
      console.log("- Question:", question);

      writeContract({
        address: MARKET_FACTORY_ADDRESS,
        abi: MarketFactoryABI,
        functionName: "createMarket",
        args: [
          MOCK_USDC_ADDRESS,
          title,
          question,
          BigInt(total),
          liquidityUSDC,
        ],
      });

      setPendingQuestion(qVal);
    } catch {}
    setIsLoading(false);
  };

  // Test AI Resolution function (for testing only)
  const handleTestAIResolve = async () => {
    setIsLoading(true);
    try {
      console.log("🧪 Testing AI Resolution...");

      const response = await fetch("/api/ai-resolve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: "Will Bitcoin reach $100,000 by the end of 2024?",
          marketAddress: "0x1234567890123456789012345678901234567890",
          endTime: Math.floor(Date.now() / 1000),
        }),
      });

      if (!response.ok) {
        throw new Error(`AI resolution failed: ${response.status}`);
      }

      const aiResult = await response.json();
      console.log("🧪 Test AI Resolution Result:", aiResult);

      // Show result in alert for testing
      alert(
        `AI Test Result:\nOutcome: ${aiResult.outcome}\nConfidence: ${aiResult.confidence}\nReasoning: ${aiResult.reasoning}`
      );
    } catch (err) {
      console.error("Error with test AI resolution:", err);
      alert(
        `Test failed: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    }
    setIsLoading(false);
  };

  return (
    <div className="max-w-5xl mx-auto p-2">
      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 drop-shadow-sm">
              Create Market
            </h2>
            {userAddress && (
              <div className="flex items-center gap-3">
                <Pill>
                  Balance:{" "}
                  <span className="font-black">
                    {usdcBalance
                      ? Number(formatUnits(usdcBalance as bigint, 6)).toFixed(2)
                      : "0.00"}{" "}
                    USDC
                  </span>
                </Pill>
                {factoryAllowance !== undefined &&
                  (factoryAllowance as bigint) < MAX_UINT256 && (
                    <button
                      type="button"
                      onClick={() => {
                        writeContract({
                          address: MOCK_USDC_ADDRESS,
                          abi: MockUSDCABI,
                          functionName: "approve",
                          args: [MARKET_FACTORY_ADDRESS, MAX_UINT256],
                        });
                      }}
                      disabled={isLoading}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 text-sm font-bold"
                    >
                      🔓 Approve Infinite USDC
                    </button>
                  )}
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label="Market Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., ETH Price Prediction"
              required
            />

            <Textarea
              label="Market Question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={3}
              placeholder="e.g., Will ETH be ≥ $4,000 by midnight UTC?"
              required
            />

            <DurationPicker value={durationInput} onChange={setDurationInput} />

            <div className="space-y-4">
              <Input
                label="Initial Liquidity (USDC)"
                value={initialLiquidity}
                onChange={(e) => setInitialLiquidity(e.target.value)}
                type="number"
                min="0"
                step="0.01"
                required
                helper="Provides seed funding for the market. Higher liquidity = smoother trading with less slippage. This amount gets distributed to winners at resolution."
              />

              <PreviewCard
                title={title}
                duration={`${durationInput.days}d ${durationInput.hours}h ${durationInput.minutes}m`}
                liquidity={initialLiquidity}
              />
            </div>

            <button
              type="submit"
              disabled={isPending || isLoading}
              className="w-full h-12 rounded-2xl bg-green-600 text-white text-sm font-extrabold shadow-lg disabled:bg-slate-300 hover:bg-green-700 transition-colors"
            >
              {isPending || isLoading ? "Creating…" : "Create AMM Market"}
            </button>
          </form>

          {/* Test AI Button - Remove this in production */}
          <div className="mt-6 pt-6 border-t border-slate-200">
            <button
              onClick={handleTestAIResolve}
              disabled={isPending || isLoading}
              className="w-full h-12 rounded-2xl bg-yellow-500 text-white text-sm font-extrabold shadow-lg disabled:bg-slate-300 hover:bg-yellow-600 transition-colors"
            >
              🧪 Test AI Resolution
            </button>
            <p className="mt-2 text-xs text-slate-500 text-center">
              Test the AI resolution functionality with a sample question
            </p>
          </div>

          {isPending && (
            <div className="mt-4 text-sm font-semibold text-blue-700">
              Transaction pending…
            </div>
          )}
          {isConfirming && (
            <div className="mt-4 text-sm font-semibold text-yellow-700">
              Confirming transaction…
            </div>
          )}
          {!isPending && !isConfirming && !error && txHash && (
            <div className="mt-4 rounded-xl border-2 border-green-300 bg-green-50 p-4">
              <p className="text-green-900 font-extrabold mb-2">
                {isSuccess
                  ? successMessage || "Market created!"
                  : "Transaction submitted!"}
              </p>
              <div className="space-y-2">
                <p className="text-sm text-green-800">Transaction Hash:</p>
                <div className="flex items-center gap-2">
                  <code className="bg-white px-3 py-2 rounded border-2 text-xs font-mono text-slate-900 flex-1 break-all">
                    {txHash}
                  </code>
                  <button
                    onClick={() => navigator.clipboard.writeText(txHash)}
                    className="px-3 py-2 rounded-xl bg-green-600 text-white text-xs font-bold hover:bg-green-700"
                  >
                    Copy
                  </button>
                </div>
                <a
                  href={`https://sepolia.etherscan.io/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block text-sm font-bold text-green-700 underline"
                >
                  View on Etherscan →
                </a>
              </div>
            </div>
          )}
          {error && (
            <div className="mt-4 text-sm font-bold text-red-700">
              Error: {error.message}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
