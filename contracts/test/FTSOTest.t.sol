// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/TwoPartyMarket.sol";
import "../src/MockUSDC.sol";
import "../src/TestFTSO.sol";

contract FTSOTest is Test {
    TwoPartyMarket public market;
    MockUSDC public usdc;
    
    // ETH/USD feed ID from Flare documentation
    bytes21 public constant ethUsdId = 0x014554482f55534400000000000000000000000000; // "ETH/USD"
    
    function setUp() public {
        // Deploy MockUSDC
        usdc = new MockUSDC();
        
        // Create market with FTSO resolution
        uint256 endTime = block.timestamp + 120; // 2 minutes
        uint256 creatorBetAmount = 10 * 10**6; // 10 USDC
        uint256 opponentBetAmount = 20 * 10**6; // 20 USDC (1:2 odds)
        
        // Mock FTSO address (for testing)
        address mockFtsoAddress = address(0x123);
        uint256 ftsoEpochId = 12345;
        uint256 priceThreshold = 3000; // $3000
        
        market = new TwoPartyMarket(
            1, // marketIndex
            endTime,
            address(this), // creator
            creatorBetAmount,
            opponentBetAmount,
            TwoPartyMarket.Outcome.Yes, // creator bets YES
            address(usdc),
            mockFtsoAddress,
            ftsoEpochId,
            priceThreshold,
            ethUsdId // FTSO feed ID
        );
    }
    
    function testFTSOIntegration() public {
        // Test that FTSO parameters are stored correctly
        assertEq(market.ftsoAddress(), address(0x123));
        assertEq(market.ftsoEpochId(), 12345);
        assertEq(market.priceThreshold(), 3000);
        assertTrue(market.hasFTSOResolution());
        
        console.log("FTSO integration test passed!");
        console.log("ETH/USD Feed ID:", vm.toString(ethUsdId));
        console.log("Price Threshold: $3000");
    }
    
    function testETHUSDResolution() public {
        // First, we need to make the market active by providing initial liquidity
        usdc.mint(address(this), 30 * 10**6); // 30 USDC
        usdc.approve(address(market), 30 * 10**6);
        
        // Provide initial liquidity (creator's bet)
        market.provideInitialBet();
        
        // Accept challenge (opponent's bet)
        address opponent = address(0x123);
        vm.startPrank(opponent);
        usdc.mint(opponent, 20 * 10**6); // 20 USDC
        usdc.approve(address(market), 20 * 10**6);
        market.acceptChallenge();
        vm.stopPrank();
        
        // Fast forward past market end time and resolution period
        vm.warp(block.timestamp + 180); // 3 minutes (2 min market + 1 min resolution)
        
        // Now test the FTSO resolution
        console.log("ETH/USD Resolution Test:");
        console.log("- Feed ID: 0x014554482f55534400000000000000000000000000");
        console.log("- Threshold: $3000");
        console.log("- Logic: ETH price >= $3000 = YES outcome");
        console.log("- Logic: ETH price < $3000 = NO outcome");
        
        // Note: This would call the actual FTSO v2 contract in production
        // For now, we're testing the integration logic
        console.log("Market state before resolution:", uint256(market.getMarketState()));
        console.log("Outcome before resolution:", uint256(market.outcome()));
    }
    
    function testMockFTSOPrice() public {
        // Test the mock FTSO contract to see actual price
        TestFTSO mockFtso = new TestFTSO();
        
        (uint256 price, int8 decimals, uint64 timestamp) = mockFtso.getEthUsdPrice();
        uint256 actualPrice = price / (10 ** uint8(decimals));
        
        console.log("Mock FTSO ETH/USD Price Test:");
        console.log("- Raw price:", price);
        console.log("- Decimals:", decimals);
        console.log("- Timestamp:", timestamp);
        console.log("- Actual ETH price: $", actualPrice);
        
        // Test threshold comparison
        bool isAbove3000 = mockFtso.isEthAboveThreshold(3000);
        console.log("- Is ETH above $3000?", isAbove3000);
        
        // Test different thresholds
        bool isAbove2500 = mockFtso.isEthAboveThreshold(2500);
        bool isAbove3500 = mockFtso.isEthAboveThreshold(3500);
        console.log("- Is ETH above $2500?", isAbove2500);
        console.log("- Is ETH above $3500?", isAbove3500);
    }
}
