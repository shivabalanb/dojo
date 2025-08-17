// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/TwoPartyMarket.sol";

contract CheckMarketState is Script {
    function run() external {
        // The market address from the failed transaction
        address marketAddress = 0x21dB64C708C00f26EDFc310e541f700885a900d9;
        
        console.log("Checking market state for:", marketAddress);
        console.log("==========================================");
        
        // Check outcome
        TwoPartyMarket.Outcome outcome = TwoPartyMarket(marketAddress).outcome();
        console.log("Outcome:", uint256(outcome), "(0=Unresolved, 1=Yes, 2=No)");
        
        // Check end time
        uint256 endTime = TwoPartyMarket(marketAddress).endTime();
        console.log("End time:", endTime);
        console.log("Current time:", block.timestamp);
        console.log("Time since end:", block.timestamp - endTime, "seconds");
        
        // Check if 1 minute has passed since end
        bool canResolve = block.timestamp >= endTime + 1 minutes;
        console.log("Can resolve (1 min passed):", canResolve);
        
        // Check pools
        uint256 yesPool = TwoPartyMarket(marketAddress).yesPool();
        uint256 noPool = TwoPartyMarket(marketAddress).noPool();
        console.log("YES pool:", yesPool);
        console.log("NO pool:", noPool);
        
        // Check if market is active
        bool isActive = yesPool > 0 && noPool > 0;
        console.log("Market is active:", isActive);
        
        // Check market state
        TwoPartyMarket.MarketState state = TwoPartyMarket(marketAddress).getMarketState();
        console.log("Market state:", uint256(state), "(0=WaitingForOpponent, 1=Active, 2=Resolved)");
        
        // Check creator and opponent amounts
        uint256 creatorBetAmount = TwoPartyMarket(marketAddress).creatorBetAmount();
        uint256 opponentBetAmount = TwoPartyMarket(marketAddress).opponentBetAmount();
        console.log("Creator bet amount:", creatorBetAmount);
        console.log("Opponent bet amount:", opponentBetAmount);
        
        // Check creator
        address creator = TwoPartyMarket(marketAddress).creator();
        console.log("Creator:", creator);
        
        console.log("==========================================");
        
        // Determine why resolution failed
        if (outcome != TwoPartyMarket.Outcome.Unresolved) {
            console.log("FAILED: Market already resolved");
        } else if (!canResolve) {
            console.log("FAILED: Must wait 1 minute after market ends");
        } else if (!isActive) {
            console.log("FAILED: Market not active (both pools must be > 0)");
            console.log("   - YES pool:", yesPool);
            console.log("   - NO pool:", noPool);
            console.log("   - Need both creator and opponent to have placed bets");
        } else {
            console.log("Market should be resolvable");
        }
    }
}
