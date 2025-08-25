// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/ConstantProductMarket.sol";
import "../src/MockUSDC.sol";
import "../src/MarketFactory.sol";

contract ConstantProductMarketTest is Test {
    ConstantProductMarket public market;
    MockUSDC public usdc;
    MarketFactory public factory;

    address public creator = address(0x1);
    address public user1 = address(0x2);
    address public user2 = address(0x3);

    uint256 public constant INITIAL_LIQUIDITY = 1000e6; // 1000 USDC
    uint256 public constant MARKET_DURATION = 30 days;

    function setUp() public {
        // Deploy mock USDC
        usdc = new MockUSDC();

        // Deploy factory
        factory = new MarketFactory();

        // Mint USDC to users
        usdc.mint(creator, 2000e6); // 2000 USDC
        usdc.mint(user1, 1000e6);
        usdc.mint(user2, 1000e6);

        // Create Constant Product market
        vm.prank(creator);
        usdc.approve(address(factory), INITIAL_LIQUIDITY);

        vm.prank(creator);
        address marketAddress = factory.createMarket(
            address(usdc),
            "Test Market",
            "Will the test pass?",
            MARKET_DURATION,
            INITIAL_LIQUIDITY
        );

        market = ConstantProductMarket(marketAddress);

        // Approve USDC spending for users
        vm.prank(user1);
        usdc.approve(address(market), 1000e6);
        vm.prank(user2);
        usdc.approve(address(market), 1000e6);
    }

    function test_InitialState() public view {
        assertEq(address(market.usdc()), address(usdc));
        assertEq(market.title(), "Test Market");
        assertEq(market.question(), "Will the test pass?");
        assertEq(market.endTime(), block.timestamp + MARKET_DURATION);
        assertEq(market.qYes(), 0);
        assertEq(market.qNo(), 0);

        // Initial prices should be 50/50
        uint256 priceYes = market.priceYes();
        uint256 priceNo = market.priceNo();

        // Price should be close to 50% (0.5 * 1e18)
        assertApproxEqRel(priceYes, 0.5e18, 0.01e18); // Within 1% of 50%
        assertApproxEqRel(priceNo, 0.5e18, 0.01e18); // Within 1% of 50%
        assertEq(priceYes + priceNo, 1e18); // Should sum to 100%

        console.log("Initial YES price:", priceYes);
        console.log("Initial NO price:", priceNo);
    }

    function test_LowLiquidityScenario() public {
        console.log("=== Low Liquidity Test (10 USDC) ===");

        // Create a new market with only 10 USDC liquidity
        uint256 lowLiquidity = 10e6; // 10 USDC

        vm.prank(creator);
        usdc.approve(address(factory), lowLiquidity);

        vm.prank(creator);
        address lowLiquidityMarketAddress = factory.createMarket(
            address(usdc),
            "Low Liquidity Test",
            "Will this work?",
            MARKET_DURATION,
            lowLiquidity
        );

        ConstantProductMarket lowLiquidityMarket = ConstantProductMarket(
            lowLiquidityMarketAddress
        );

        // Approve USDC for the new market
        vm.prank(user1);
        usdc.approve(address(lowLiquidityMarket), 100e6);
        vm.prank(user2);
        usdc.approve(address(lowLiquidityMarket), 100e6);

        console.log("Initial liquidity:", lowLiquidity / 1e6, "USDC");
        console.log("Share scale:", lowLiquidityMarket.shareScale());

        // Test initial prices
        uint256 initialPriceYes = lowLiquidityMarket.priceYes();
        uint256 initialPriceNo = lowLiquidityMarket.priceNo();
        console.log("Initial YES price:", initialPriceYes / 1e16, "%");
        console.log("Initial NO price:", initialPriceNo / 1e16, "%");

        // Test buying 1 USDC worth of YES shares
        console.log("\nStep 1: Buying 1 USDC worth of YES shares");

        // Calculate how many shares 1 USDC buys
        uint256 targetCost = 1e6; // 1 USDC
        uint256 sharesToBuy = 1e6; // Start with 1e6 units (1 USDC worth)

        uint256 cost = lowLiquidityMarket.quoteBuyYes(sharesToBuy);
        console.log("Cost for shares:", cost / 1e6, "USDC");

        // Adjust to get closer to 1 USDC
        if (cost > targetCost) {
            sharesToBuy = (sharesToBuy * targetCost) / cost;
            cost = lowLiquidityMarket.quoteBuyYes(sharesToBuy);
            console.log("Adjusted cost:", cost / 1e6, "USDC");
        }

        vm.prank(user1);
        lowLiquidityMarket.buyYes(sharesToBuy);

        uint256 priceAfterYes = lowLiquidityMarket.priceYes();
        uint256 priceAfterNo = lowLiquidityMarket.priceNo();
        console.log("After YES trade - YES price:", priceAfterYes / 1e16, "%");
        console.log("After YES trade - NO price:", priceAfterNo / 1e16, "%");
        console.log("qYes:", lowLiquidityMarket.qYes());
        console.log("qNo:", lowLiquidityMarket.qNo());

        // Test buying 1 USDC worth of NO shares
        console.log("\nStep 2: Buying 1 USDC worth of NO shares");

        uint256 noSharesToBuy = 1e6; // Start with 1e6 units

        cost = lowLiquidityMarket.quoteBuyNo(noSharesToBuy);
        console.log("Cost for NO shares:", cost / 1e6, "USDC");

        // Adjust to get closer to 1 USDC
        if (cost > targetCost) {
            noSharesToBuy = (noSharesToBuy * targetCost) / cost;
            cost = lowLiquidityMarket.quoteBuyNo(noSharesToBuy);
            console.log("Adjusted NO cost:", cost / 1e6, "USDC");
        }

        vm.prank(user2);
        lowLiquidityMarket.buyNo(noSharesToBuy);

        uint256 finalPriceYes = lowLiquidityMarket.priceYes();
        uint256 finalPriceNo = lowLiquidityMarket.priceNo();
        console.log("After NO trade - YES price:", finalPriceYes / 1e16, "%");
        console.log("After NO trade - NO price:", finalPriceNo / 1e16, "%");
        console.log("Final qYes:", lowLiquidityMarket.qYes());
        console.log("Final qNo:", lowLiquidityMarket.qNo());

        // Verify prices sum to 100%
        assertEq(finalPriceYes + finalPriceNo, 1e18);

        console.log("\nSummary:");
        console.log("Total YES shares:", lowLiquidityMarket.qYes());
        console.log("Total NO shares:", lowLiquidityMarket.qNo());
        console.log("Final YES probability:", finalPriceYes / 1e16, "%");
        console.log("Final NO probability:", finalPriceNo / 1e16, "%");

        // Check that price movements are reasonable (not stuck at 100%)
        assertLt(finalPriceYes, 0.9e18); // YES < 90%
        assertGt(finalPriceNo, 0.1e18); // NO > 10%

        console.log(
            "SUCCESS: Low liquidity market works with reasonable price movements!"
        );
    }

    function test_LiquidityDistribution() public {
        console.log("=== Testing Liquidity Distribution ===");

        // Create market with 10 USDC initial liquidity
        uint256 initialLiquidity = 10e6; // 10 USDC

        vm.prank(creator);
        usdc.approve(address(factory), initialLiquidity);

        vm.prank(creator);
        address marketAddress = factory.createMarket(
            address(usdc),
            "Liquidity Test",
            "Will liquidity be distributed correctly?",
            MARKET_DURATION,
            initialLiquidity
        );

        ConstantProductMarket testMarket = ConstantProductMarket(marketAddress);

        // Approve USDC for trading
        vm.prank(user1);
        usdc.approve(address(testMarket), 1000e6);
        vm.prank(user2);
        usdc.approve(address(testMarket), 1000e6);

        console.log("Initial liquidity:", initialLiquidity / 1e6, "USDC");

        // User1 buys 1 YES share
        vm.prank(user1);
        testMarket.buyYes(1e6); // 1 share

        // User2 buys 2 NO shares
        vm.prank(user2);
        testMarket.buyNo(2e6); // 2 shares

        console.log("User1 YES shares:", testMarket.yesShares(user1) / 1e6);
        console.log("User2 NO shares:", testMarket.noShares(user2) / 1e6);
        console.log("Total YES shares:", testMarket.qYes() / 1e6);
        console.log("Total NO shares:", testMarket.qNo() / 1e6);

        // Warp time forward to end the market
        vm.warp(block.timestamp + MARKET_DURATION + 1);

        // Resolve market - YES wins
        vm.prank(creator);
        testMarket.resolve(ConstantProductMarket.Outcome.Yes);

        // Check USDC balance before claiming
        uint256 user1BalanceBefore = usdc.balanceOf(user1);
        uint256 user2BalanceBefore = usdc.balanceOf(user2);

        console.log(
            "User1 balance before claim:",
            user1BalanceBefore / 1e6,
            "USDC"
        );
        console.log(
            "User2 balance before claim:",
            user2BalanceBefore / 1e6,
            "USDC"
        );

        // User1 claims (YES winner)
        vm.prank(user1);
        testMarket.claim();

        // User2 shouldn't be able to claim (NO loser)
        vm.prank(user2);
        vm.expectRevert("no win");
        testMarket.claim();

        uint256 user1BalanceAfter = usdc.balanceOf(user1);
        uint256 user2BalanceAfter = usdc.balanceOf(user2);

        console.log(
            "User1 balance after claim:",
            user1BalanceAfter / 1e6,
            "USDC"
        );
        console.log(
            "User2 balance after claim:",
            user2BalanceAfter / 1e6,
            "USDC"
        );

        uint256 user1Payout = user1BalanceAfter - user1BalanceBefore;
        uint256 user2Payout = user2BalanceAfter - user2BalanceBefore;

        console.log("User1 payout:", user1Payout / 1e6, "USDC");
        console.log("User2 payout:", user2Payout / 1e6, "USDC");

        // Verify results
        assertGt(user1Payout, 0, "YES winner should get payout");
        assertEq(user2Payout, 0, "NO loser should get nothing");
        assertGt(
            user1Payout,
            1e6,
            "YES winner should get more than 1 USDC (includes liquidity)"
        );

        console.log("SUCCESS: Liquidity distributed correctly to winners!");
    }
}
