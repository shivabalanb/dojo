"use client";

import React, { useState, useEffect, Fragment } from "react";
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
  useAccount,
} from "wagmi";
import { readContract } from "wagmi/actions";
import { config } from "../lib/wagmi";
import { parseEther, parseUnits, formatUnits } from "viem";
import {
  MarketFactoryABI,
  MARKET_FACTORY_ADDRESS,
  MOCK_USDC_ADDRESS,
  MockUSDCABI,
} from "../lib/abis";
import { Switch, RadioGroup, Combobox, Transition } from "@headlessui/react";
import { Check, ChevronDown, ChevronUp, Search } from "lucide-react";

const Pill = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-emerald-500/15 to-cyan-500/15 px-3 py-1 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-300/40">
    {children}
  </span>
);

export function CreateMarket() {
  const [question, setQuestion] = useState("Will the price of ETH go up?");
  const [durationInput, setDurationInput] = useState({
    days: "0",
    hours: "0",
    minutes: "2",
    seconds: "0",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [pendingQuestion, setPendingQuestion] = useState("");
  const [marketType, setMarketType] = useState<"TwoParty" | "LMSR">("TwoParty");
  const [creatorBetAmount, setCreatorBetAmount] = useState("10");
  const [oddsRatio, setOddsRatio] = useState("1:2");
  const [creatorSide, setCreatorSide] = useState<"yes" | "no">("yes");
  const ftsoAddress = "0xC4e9c78EA53db782E28f28Fdf80BaF59336B304d";
  const [ftsoEpochId, setFtsoEpochId] = useState("");
  const [priceThreshold, setPriceThreshold] = useState("");
  const [useFTSO, setUseFTSO] = useState(false);
  const [feedSearchTerm, setFeedSearchTerm] = useState("");

  const [selectedFeed, setSelectedFeed] = useState(ftsoFeeds[3]);
  const filteredFeeds =
    feedSearchTerm === ""
      ? ftsoFeeds
      : ftsoFeeds.filter((f) =>
          f.name.toLowerCase().includes(feedSearchTerm.toLowerCase())
        );
  // Helper function to format USDC amounts
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

  // Calculate opponent bet amount based on odds ratio
  const calculateOpponentBetAmount = () => {
    if (!oddsRatio || !creatorBetAmount) return 0;
    const [c, o] = oddsRatio.split(":").map(Number);
    if (!c) return 0;
    return (Number(creatorBetAmount) * o) / c;
  };
  const opponentBetAmount = calculateOpponentBetAmount();
  const calculateFTSOEpoch = (t: number) => Math.floor(t / 90);
  const getFutureEpochId = () => {
    const now = Math.floor(Date.now() / 1000);
    const total =
      parseInt(durationInput.days || "0") * 86400 +
      parseInt(durationInput.hours || "0") * 3600 +
      parseInt(durationInput.minutes || "0") * 60 +
      parseInt(durationInput.seconds || "0");
    return calculateFTSOEpoch(now + total);
  };
  useEffect(() => {
    if (useFTSO) setFtsoEpochId(String(getFutureEpochId()));
  }, [useFTSO, durationInput]);
  const [initialLiquidity, setInitialLiquidity] = useState("0.01");
  const [liquidityLevel, setLiquidityLevel] = useState(2);
  const getBetaParameter = () =>
    (
      ({
        1: parseEther("0.01"),
        2: parseEther("0.05"),
        3: parseEther("0.1"),
        4: parseEther("0.2"),
        5: parseEther("0.5"),
      }) as const
    )[liquidityLevel as 1 | 2 | 3 | 4 | 5];

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

  useEffect(() => {
    if (isSuccess && pendingQuestion) {
      (async () => {
        try {
          const marketCount = await readContract(config, {
            address: MARKET_FACTORY_ADDRESS,
            abi: MarketFactoryABI,
            functionName: "getAllMarketsCount",
          });
          const marketIndex = Number(marketCount) - 1;
          const r = await fetch("/api/markets", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              market_index: marketIndex,
              question: pendingQuestion,
            }),
          });
          setSuccessMessage(
            r.ok
              ? "Market created and stored successfully!"
              : "Market created on-chain but failed to store metadata"
          );
        } catch {
          setSuccessMessage(
            "Market created on-chain but failed to store metadata"
          );
        } finally {
          setTimeout(() => {
            setQuestion("");
            setDurationInput({
              days: "0",
              hours: "0",
              minutes: "0",
              seconds: "0",
            });
            setCreatorBetAmount("10");
            setCreatorSide("yes");
            setSuccessMessage("");
          }, 1200);
        }
      })();
      setPendingQuestion("");
    }
  }, [isSuccess, pendingQuestion]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const total =
      parseInt(durationInput.days || "0") * 86400 +
      parseInt(durationInput.hours || "0") * 3600 +
      parseInt(durationInput.minutes || "0") * 60 +
      parseInt(durationInput.seconds || "0");
    if (!question || total <= 0) return;
    if (
      marketType === "TwoParty" &&
      (!creatorBetAmount || Number(creatorBetAmount) <= 0)
    )
      return;
    if (
      marketType === "LMSR" &&
      (!initialLiquidity || Number(initialLiquidity) <= 0)
    )
      return;

    setIsLoading(true);
    const qVal = question;
    try {
      if (marketType === "TwoParty") {
        const creatorAmt = parseUnits(creatorBetAmount, 6);
        const opponentAmt = parseUnits(opponentBetAmount.toString(), 6);
        const creatorChoseYes = creatorSide === "yes";
        if (useFTSO && ftsoAddress && priceThreshold) {
          const priceScaled = parseUnits(priceThreshold, 5);
          writeContract({
            address: MARKET_FACTORY_ADDRESS,
            abi: MarketFactoryABI,
            functionName: "createTwoPartyMarketWithFTSO",
            args: [
              question,
              BigInt(total),
              creatorAmt,
              opponentAmt,
              creatorChoseYes ? 1 : 2,
              MOCK_USDC_ADDRESS,
              ftsoAddress,
              BigInt(getFutureEpochId()),
              priceScaled,
              selectedFeed.feedId,
            ],
          });
        } else {
          writeContract({
            address: MARKET_FACTORY_ADDRESS,
            abi: MarketFactoryABI,
            functionName: "createTwoPartyMarket",
            args: [
              question,
              BigInt(total),
              creatorAmt,
              opponentAmt,
              creatorChoseYes ? 1 : 2,
              MOCK_USDC_ADDRESS,
            ],
          });
        }
      } else {
        const liquidityUSDC = parseUnits(initialLiquidity, 6);
        const beta = getBetaParameter();
        writeContract({
          address: MOCK_USDC_ADDRESS,
          abi: MockUSDCABI,
          functionName: "approve",
          args: [MARKET_FACTORY_ADDRESS, liquidityUSDC],
        });
        writeContract({
          address: MARKET_FACTORY_ADDRESS,
          abi: MarketFactoryABI,
          functionName: "createLMSRMarket",
          args: [
            MOCK_USDC_ADDRESS,
            question,
            BigInt(total),
            beta,
            liquidityUSDC,
          ],
        });
      }
      setPendingQuestion(qVal);
    } catch {}
    setIsLoading(false);
  };

  const Card = ({ children }: { children: React.ReactNode }) => (
    <div className="rounded-3xl border border-slate-200 bg-white shadow-[0_10px_40px_-15px_rgba(0,0,0,0.2)]">
      {children}
    </div>
  );

  const inputCls =
    "w-full px-3 py-2 border-2 border-slate-300 rounded-xl bg-white text-slate-900 placeholder-slate-400 text-sm font-medium";

  const chipBase =
    "w-full h-11 rounded-xl border font-extrabold flex items-center justify-center transition";
  const chipOn = "border-white/40 bg-white/30 text-slate-900 shadow";
  const chipOff =
    "border-white/20 bg-white/10 text-slate-800 hover:bg-white/20";

  const inputGlass =
    "h-11 w-full rounded-xl border border-white/30 bg-white/70 backdrop-blur-sm px-3 text-slate-900 placeholder-slate-500 shadow-inner";

  return (
    <div className="max-w-5xl mx-auto p-2">
      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 drop-shadow-sm">
              Create Market
            </h2>
            {userAddress && (
              <Pill>
                Balance:{" "}
                <span className="font-black">
                  {usdcBalance ? formatUnits(usdcBalance as bigint, 6) : "0"}{" "}
                  USDC
                </span>
              </Pill>
            )}
          </div>

          <div className="mb-6">
            <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-slate-100 border border-slate-200">
              {(["TwoParty", "LMSR"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setMarketType(t)}
                  className={`h-11 rounded-xl text-sm font-bold transition-colors ${
                    marketType === t
                      ? "bg-white text-slate-900 border-2 border-slate-300 shadow-sm"
                      : "bg-transparent text-slate-700 hover:bg-white/50 border-2 border-transparent"
                  }`}
                >
                  {t === "TwoParty"
                    ? "Two-Party Challenge"
                    : "Automated Market"}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[13px] text-slate-600">
              {marketType === "TwoParty"
                ? "Post a head-to-head challenge. A friend accepts to start."
                : "Trade instantly with LMSR liquidity."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="text-sm font-semibold text-slate-800">
                Market Question
              </label>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                rows={3}
                placeholder="e.g., Will ETH be ≥ $4,000 by midnight UTC?"
                className={`${inputCls}`}
                required
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-800">
                Duration
              </label>
              <div className="mt-2 grid grid-cols-4 gap-2">
                {(["days", "hours", "minutes", "seconds"] as const).map((k) => (
                  <div key={k} className="flex flex-col">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                      {k}
                    </span>
                    <input
                      type="number"
                      min="0"
                      value={durationInput[k]}
                      onChange={(e) =>
                        setDurationInput({
                          ...durationInput,
                          [k]: e.target.value,
                        })
                      }
                      className={`${inputCls} text-center`}
                    />
                  </div>
                ))}
              </div>
              <p className="mt-1 text-xs text-slate-600">
                How long betting stays open.
              </p>
            </div>

            {marketType === "TwoParty" ? (
              <Card>
                <div className="p-4 space-y-5">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-slate-900">
                      Challenge Setup
                    </h3>
                    <div className="text-[11px] font-bold text-slate-700 uppercase">
                      Winner takes all
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-slate-800">
                      Your Position
                    </label>
                    <RadioGroup
                      value={creatorSide}
                      onChange={setCreatorSide}
                      className="mt-2 grid grid-cols-2 gap-2"
                    >
                      {(["yes", "no"] as const).map((v) => (
                        <RadioGroup.Option
                          key={v}
                          value={v}
                          className="focus:outline-none"
                        >
                          {({ checked }) => (
                            <div
                              className={`rounded-xl border-2 px-4 py-2 text-center text-sm font-extrabold transition ${
                                checked
                                  ? v === "yes"
                                    ? "border-green-500 bg-green-500 text-white"
                                    : "border-red-500 bg-red-500 text-white"
                                  : "border-slate-300 bg-white text-slate-800 hover:border-slate-400"
                              }`}
                            >
                              {v.toUpperCase()}
                            </div>
                          )}
                        </RadioGroup.Option>
                      ))}
                    </RadioGroup>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-semibold text-slate-800">
                        Your Bet (USDC)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={creatorBetAmount}
                        onChange={(e) => setCreatorBetAmount(e.target.value)}
                        className={inputCls}
                        required
                      />
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-slate-800">
                        Odds (You : Opponent)
                      </label>
                      <input
                        type="text"
                        value={oddsRatio}
                        onChange={(e) => setOddsRatio(e.target.value)}
                        placeholder="1:2"
                        className={inputCls}
                        required
                      />
                      <p className="mt-1 text-[11px] text-slate-600">
                        Example: 1:2 → if you bet 10, opponent stakes 20
                      </p>
                    </div>
                  </div>

                  {creatorBetAmount && oddsRatio && (
                    <div className="rounded-xl bg-slate-50 p-6 text-sm border-2 border-slate-200">
                      <div className="space-y-4">
                        <div className="flex items-center space-x-2">
                          <span className="text-slate-600 font-medium">
                            You stake
                          </span>
                          <span className="text-lg font-bold text-slate-900">
                            {formatUSDC(creatorBetAmount)}
                          </span>
                          <span className="text-slate-600 font-medium">on</span>
                          <span
                            className={`text-lg font-bold px-3 py-1 rounded-lg ${creatorSide === "yes" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                          >
                            {creatorSide.toUpperCase()}
                          </span>
                        </div>

                        <div className="flex items-center space-x-2">
                          <span className="text-slate-600 font-medium">
                            Opponent must stake
                          </span>
                          <span className="text-lg font-bold text-slate-900">
                            {formatUSDC(opponentBetAmount)}
                          </span>
                          <span className="text-slate-600 font-medium">on</span>
                          <span
                            className={`text-lg font-bold px-3 py-1 rounded-lg ${creatorSide === "yes" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}
                          >
                            {creatorSide === "yes" ? "NO" : "YES"}
                          </span>
                        </div>

                        <div className="pt-3 border-t-2 border-slate-300">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-700 font-semibold text-base">
                              Total Pot:
                            </span>
                            <span className="text-xl font-bold text-slate-900">
                              {formatUSDC(
                                Number(creatorBetAmount) + opponentBetAmount
                              )}
                            </span>
                          </div>
                        </div>

                        <div className="pt-3 border-t-2 border-slate-300">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-700 font-semibold text-base">
                              Your Potential Winnings:
                            </span>
                            <span className="text-xl font-bold text-green-700">
                              {formatUSDC(opponentBetAmount)}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 mt-2">
                            If you win, you get your stake back + opponent's
                            stake
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-slate-800">
                        Use FTSO Price Feed for resolution
                      </div>
                      <div className="text-xs text-slate-600">
                        Auto-resolve from an oracle at market close
                      </div>
                    </div>
                    <Switch
                      checked={useFTSO}
                      onChange={setUseFTSO}
                      className={`${useFTSO ? "bg-green-600" : "bg-slate-300"} relative inline-flex h-7 w-12 items-center rounded-full transition`}
                    >
                      <span
                        className={`${useFTSO ? "translate-x-6" : "translate-x-1"} inline-block h-5 w-5 transform rounded-full bg-white shadow transition`}
                      />
                    </Switch>
                  </div>

                  {useFTSO && (
                    <div className="rounded-xl border-2 border-green-300 bg-green-50 p-4 space-y-3">
                      <div>
                        <label className="text-sm font-semibold text-slate-800">
                          FTSO Price Feed
                        </label>
                        <Combobox
                          value={selectedFeed}
                          onChange={setSelectedFeed}
                        >
                          <div className="relative mt-2">
                            <div className="relative w-full overflow-hidden rounded-xl border-2 border-slate-300 bg-white text-left">
                              <Combobox.Input
                                className="w-full border-none py-2 pl-10 pr-8 leading-5 text-slate-900 placeholder-slate-400"
                                displayValue={(f: any) =>
                                  f ? `${f.risk} ${f.name}` : ""
                                }
                                onChange={(e) =>
                                  setFeedSearchTerm(e.target.value)
                                }
                                placeholder="Search assets…"
                              />
                              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                              <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
                                <ChevronDown className="h-4 w-4 text-slate-500" />
                              </Combobox.Button>
                            </div>
                            <Transition
                              as={Fragment}
                              leave="transition ease-in duration-100"
                              leaveFrom="opacity-100"
                              leaveTo="opacity-0"
                              afterLeave={() => setFeedSearchTerm("")}
                            >
                              <Combobox.Options className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-xl border-2 border-slate-300 bg-white py-1 text-sm shadow-lg">
                                {filteredFeeds.length === 0 ? (
                                  <div className="cursor-default select-none px-3 py-2 text-slate-500">
                                    No feeds found
                                  </div>
                                ) : (
                                  filteredFeeds.map((f) => (
                                    <Combobox.Option
                                      key={f.feedId}
                                      value={f}
                                      className={({ active }) =>
                                        `relative cursor-default select-none px-3 py-2 ${active ? "bg-green-50 text-green-700" : "text-slate-900"}`
                                      }
                                    >
                                      {({ selected }) => (
                                        <div className="flex items-center justify-between">
                                          <span>
                                            {f.risk} {f.name}
                                          </span>
                                          {selected && (
                                            <Check className="h-4 w-4 text-green-600" />
                                          )}
                                        </div>
                                      )}
                                    </Combobox.Option>
                                  ))
                                )}
                              </Combobox.Options>
                            </Transition>
                          </div>
                        </Combobox>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-sm font-semibold text-slate-800">
                            Price Threshold (USD)
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={priceThreshold}
                            onChange={(e) => setPriceThreshold(e.target.value)}
                            className={inputCls}
                            required={useFTSO}
                          />
                          <p className="mt-1 text-[11px] text-slate-600">
                            Price ≥ threshold = YES, else NO
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-semibold text-slate-800">
                            Auto Epoch (90s)
                          </label>
                          <div className="mt-2 flex items-center justify-between rounded-xl border-2 border-slate-300 bg-white px-3 py-2">
                            <span className="text-sm font-semibold text-slate-800">
                              {ftsoEpochId || "—"}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setFtsoEpochId(String(getFutureEpochId()))
                              }
                              className="text-xs font-bold text-green-700 hover:underline"
                            >
                              Refresh
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            ) : (
              <Card>
                <div className="p-4 space-y-4">
                  <h3 className="font-semibold text-slate-900">
                    Automated Market Setup
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-semibold text-slate-800">
                        Initial Liquidity (USDC)
                      </label>
                      <input
                        type="number"
                        value={initialLiquidity}
                        onChange={(e) => setInitialLiquidity(e.target.value)}
                        min="0"
                        step="0.01"
                        className={inputCls}
                        required
                      />
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-slate-800">
                        Liquidity Level
                      </label>
                      <div className="mt-2 flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() =>
                            setLiquidityLevel(Math.max(1, liquidityLevel - 1))
                          }
                          className="rounded-xl border-2 px-2 py-1 text-slate-800"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </button>
                        <input
                          type="range"
                          min="1"
                          max="5"
                          value={liquidityLevel}
                          onChange={(e) =>
                            setLiquidityLevel(Number(e.target.value))
                          }
                          className="w-full accent-green-600"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setLiquidityLevel(Math.min(5, liquidityLevel + 1))
                          }
                          className="rounded-xl border-2 px-2 py-1 text-slate-800"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </button>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">
                        Level {liquidityLevel} (higher = stabler prices)
                      </p>
                    </div>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3 text-sm border-2 border-slate-200">
                    <span className="font-bold text-slate-800">Preview:</span>{" "}
                    {initialLiquidity} USDC seeds the pool. LMSR with β set from
                    your level.
                  </div>
                </div>
              </Card>
            )}

            <button
              type="submit"
              disabled={isPending || isLoading}
              className="w-full h-12 rounded-2xl bg-green-600 text-white text-sm font-extrabold shadow-lg disabled:bg-slate-300 hover:bg-green-700 transition-colors"
            >
              {isPending || isLoading
                ? "Creating…"
                : `Create ${marketType === "TwoParty" ? "Challenge" : "Automated"} Market`}
            </button>
          </form>

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

const ftsoFeeds = [
  {
    name: "FLR/USD",
    feedId: "0x01464c522f55534400000000000000000000000000",
    risk: "🟢",
  },
  {
    name: "SGB/USD",
    feedId: "0x015347422f55534400000000000000000000000000",
    risk: "🟡",
  },
  {
    name: "BTC/USD",
    feedId: "0x014254432f55534400000000000000000000000000",
    risk: "🟢",
  },
  {
    name: "XRP/USD",
    feedId: "0x015852502f55534400000000000000000000000000",
    risk: "🟢",
  },
  {
    name: "LTC/USD",
    feedId: "0x014c54432f55534400000000000000000000000000",
    risk: "🟢",
  },
  {
    name: "XLM/USD",
    feedId: "0x01584c4d2f55534400000000000000000000000000",
    risk: "🟢",
  },
  {
    name: "DOGE/USD",
    feedId: "0x01444f47452f555344000000000000000000000000",
    risk: "🟢",
  },
  {
    name: "ADA/USD",
    feedId: "0x014144412f55534400000000000000000000000000",
    risk: "🟢",
  },
  {
    name: "ALGO/USD",
    feedId: "0x01414c474f2f555344000000000000000000000000",
    risk: "🟡",
  },
  {
    name: "ETH/USD",
    feedId: "0x014554482f55534400000000000000000000000000",
    risk: "🟢",
  },
  {
    name: "FIL/USD",
    feedId: "0x0146494c2f55534400000000000000000000000000",
    risk: "🟢",
  },
  {
    name: "ARB/USD",
    feedId: "0x014152422f55534400000000000000000000000000",
    risk: "🟢",
  },
  {
    name: "AVAX/USD",
    feedId: "0x01415641582f555344000000000000000000000000",
    risk: "🟢",
  },
  {
    name: "BNB/USD",
    feedId: "0x01424e422f55534400000000000000000000000000",
    risk: "🟢",
  },
  {
    name: "POL/USD",
    feedId: "0x01504f4c2f55534400000000000000000000000000",
    risk: "🟢",
  },
  {
    name: "SOL/USD",
    feedId: "0x01534f4c2f55534400000000000000000000000000",
    risk: "🟢",
  },
  {
    name: "USDC/USD",
    feedId: "0x01555344432f555344000000000000000000000000",
    risk: "🟢",
  },
  {
    name: "USDT/USD",
    feedId: "0x01555344542f555344000000000000000000000000",
    risk: "🟢",
  },
  {
    name: "XDC/USD",
    feedId: "0x015844432f55534400000000000000000000000000",
    risk: "🟡",
  },
  {
    name: "TRX/USD",
    feedId: "0x015452582f55534400000000000000000000000000",
    risk: "🟢",
  },
  {
    name: "LINK/USD",
    feedId: "0x014c494e4b2f555344000000000000000000000000",
    risk: "🟢",
  },
  {
    name: "ATOM/USD",
    feedId: "0x0141544f4d2f555344000000000000000000000000",
    risk: "🟢",
  },
  {
    name: "DOT/USD",
    feedId: "0x01444f542f55534400000000000000000000000000",
    risk: "🟢",
  },
  {
    name: "TON/USD",
    feedId: "0x01544f4e2f55534400000000000000000000000000",
    risk: "🟢",
  },
  {
    name: "ICP/USD",
    feedId: "0x014943502f55534400000000000000000000000000",
    risk: "🟢",
  },
  {
    name: "SHIB/USD",
    feedId: "0x01534849422f555344000000000000000000000000",
    risk: "🟢",
  },
  {
    name: "USDS/USD",
    feedId: "0x01555344532f555344000000000000000000000000",
    risk: "🟢",
  },
  {
    name: "BCH/USD",
    feedId: "0x014243482f55534400000000000000000000000000",
    risk: "🟢",
  },
  {
    name: "NEAR/USD",
    feedId: "0x014e4541522f555344000000000000000000000000",
    risk: "🟢",
  },
  {
    name: "LEO/USD",
    feedId: "0x014c454f2f55534400000000000000000000000000",
    risk: "🔴",
  },
  {
    name: "UNI/USD",
    feedId: "0x01554e492f55534400000000000000000000000000",
    risk: "🟢",
  },
  {
    name: "ETC/USD",
    feedId: "0x014554432f55534400000000000000000000000000",
    risk: "🟢",
  },
  {
    name: "WIF/USD",
    feedId: "0x015749462f55534400000000000000000000000000",
    risk: "🟡",
  },
  {
    name: "BONK/USD",
    feedId: "0x01424f4e4b2f555344000000000000000000000000",
    risk: "🟡",
  },
  {
    name: "JUP/USD",
    feedId: "0x014a55502f55534400000000000000000000000000",
    risk: "🟢",
  },
  {
    name: "ETHFI/USD",
    feedId: "0x0145544846492f5553440000000000000000000000",
    risk: "🔴",
  },
  {
    name: "ENA/USD",
    feedId: "0x01454e412f55534400000000000000000000000000",
    risk: "🔴",
  },
  {
    name: "PYTH/USD",
    feedId: "0x01505954482f555344000000000000000000000000",
    risk: "🟢",
  },
  {
    name: "HNT/USD",
    feedId: "0x01484e542f55534400000000000000000000000000",
    risk: "🟡",
  },
  {
    name: "SUI/USD",
    feedId: "0x015355492f55534400000000000000000000000000",
    risk: "🟢",
  },
  {
    name: "PEPE/USD",
    feedId: "0x01504550452f555344000000000000000000000000",
    risk: "🟡",
  },
  {
    name: "QNT/USD",
    feedId: "0x01514e542f55534400000000000000000000000000",
    risk: "🟢",
  },
  {
    name: "AAVE/USD",
    feedId: "0x01414156452f555344000000000000000000000000",
    risk: "🟢",
  },
  {
    name: "S/USD",
    feedId: "0x01532f555344000000000000000000000000000000",
    risk: "🟡",
  },
  {
    name: "ONDO/USD",
    feedId: "0x014f4e444f2f555344000000000000000000000000",
    risk: "🟢",
  },
  {
    name: "TAO/USD",
    feedId: "0x0154414f2f55534400000000000000000000000000",
    risk: "🟡",
  },
  {
    name: "FET/USD",
    feedId: "0x014645542f55534400000000000000000000000000",
    risk: "🟢",
  },
  {
    name: "RENDER/USD",
    feedId: "0x0152454e4445522f55534400000000000000000000",
    risk: "🟢",
  },
  {
    name: "NOT/USD",
    feedId: "0x014e4f542f55534400000000000000000000000000",
    risk: "🟡",
  },
  {
    name: "RUNE/USD",
    feedId: "0x0152554e452f555344000000000000000000000000",
    risk: "🟡",
  },
  {
    name: "TRUMP/USD",
    feedId: "0x015452554d502f5553440000000000000000000000",
    risk: "🔴",
  },
  {
    name: "USDX/USD",
    feedId: "0x01555344582f555344000000000000000000000000",
    risk: "🟢",
  },
  {
    name: "JOULE/USD",
    feedId: "0x014a4f554c452f5553440000000000000000000000",
    risk: "⚫",
  },
  {
    name: "HBAR/USD",
    feedId: "0x01484241522f555344000000000000000000000000",
    risk: "🟡",
  },
  {
    name: "PENGU/USD",
    feedId: "0x0150454e47552f5553440000000000000000000000",
    risk: "🔴",
  },
  {
    name: "HYPE/USD",
    feedId: "0x01485950452f555344000000000000000000000000",
    risk: "🟢",
  },
  {
    name: "APT/USD",
    feedId: "0x014150542f55534400000000000000000000000000",
    risk: "🟢",
  },
  {
    name: "PAXG/USD",
    feedId: "0x01504158472f555344000000000000000000000000",
    risk: "🟢",
  },
  {
    name: "BERA/USD",
    feedId: "0x01424552412f555344000000000000000000000000",
    risk: "🟢",
  },
  {
    name: "OP/USD",
    feedId: "0x014f502f5553440000000000000000000000000000",
    risk: "🟢",
  },
  {
    name: "PUMP/USD",
    feedId: "0x0150554d502f555344000000000000000000000000",
    risk: "🟡",
  },
];
