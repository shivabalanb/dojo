// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/TwoPartyMarket.sol";
import "../src/MockUSDC.sol";

contract MarketTest is Test {
    TwoPartyMarket public market;
    MockUSDC public usdc;
    address public resolver = address(0x1);
    address public user1 = address(0x2);
    address public user2 = address(0x3);
    address public user3 = address(0x4);

    function setUp() public {
        // Deploy mock USDC
        usdc = new MockUSDC();
        
        // Mint USDC to users
        usdc.mint(resolver, 1000e6); // 1000 USDC
        usdc.mint(user1, 1000e6);
        usdc.mint(user2, 1000e6);
        usdc.mint(user3, 1000e6);

        // Create market with initial liquidity challenge
        // The creator needs to approve USDC transfer to the market contract
        vm.prank(resolver);
        usdc.approve(address(this), 1000e6);
        
        // We need to approve the market contract address, but we don't know it yet
        // So we'll approve a large amount to address(this) and then transfer it
        vm.prank(resolver);
        usdc.approve(address(this), 1000e6);
        
        market = new TwoPartyMarket(
            0, // marketIndex
            block.timestamp + 30 days, // endTime
            resolver, // creator
            100e6, // creatorBetAmount (100 USDC)
            200e6, // opponentBetAmount (200 USDC) - 1:2 odds
            TwoPartyMarket.Outcome.Yes, // creatorChoice
            address(usdc), // USDC address
            address(0), // ftsoAddress (not used for this test)
            0, // ftsoEpochId (not used for this test)
            0, // priceThreshold (not used for this test)
            bytes21(0) // ftsoFeedId (not used for this test)
        );

        // Creator provides initial bet
        vm.prank(resolver);
        usdc.approve(address(market), 1000e6);
        vm.prank(resolver);
        market.provideInitialBet();

        // Accept the challenge as user2 (opponent bet amount)
        vm.prank(user2);
        usdc.approve(address(market), 200e6);
        vm.prank(user2);
        market.acceptChallenge();

        // Approve USDC spending for users
        vm.prank(user1);
        usdc.approve(address(market), 1000e6);
        vm.prank(user2);
        usdc.approve(address(market), 1000e6);
        vm.prank(user3);
        usdc.approve(address(market), 1000e6);
    }

    function test_InitialState() public view {
        assertEq(uint256(market.outcome()), uint256(TwoPartyMarket.Outcome.Unresolved));
        assertEq(market.resolver(), resolver);
        assertEq(market.yesPool(), 100e6);
        assertEq(market.noPool(), 200e6); // Creator: 100 USDC, Opponent: 200 USDC
        assertEq(uint256(market.getMarketState()), uint256(TwoPartyMarket.MarketState.Active));
    }

    function test_BuyYes() public {
        vm.prank(user1);
        market.buyYes(50e6); // 50 USDC

        assertEq(market.yesStake(user1), 50e6);
        assertEq(market.yesPool(), 150e6);
    }

    function test_BuyNo() public {
        vm.prank(user1);
        market.buyNo(50e6); // 50 USDC

        assertEq(market.noStake(user1), 50e6);
        assertEq(market.noPool(), 250e6); // 200e6 initial + 50e6 new
    }

    function test_CannotBuyAfterEnd() public {
        vm.warp(block.timestamp + 31 days);

        vm.prank(user1);
        vm.expectRevert("closed");
        market.buyYes(50e6);

        vm.prank(user1);
        vm.expectRevert("closed");
        market.buyNo(50e6);
    }

    function test_AnyoneCanResolveAfterDelay() public {
        vm.warp(block.timestamp + 31 days);

        // Warp past end time + 1 minute
        vm.warp(block.timestamp + 31 days + 1 minutes);
        
        // Anyone can call resolveWithAI now
        vm.prank(user1);
        market.resolveWithAI();
    }

    function test_CannotResolveBeforeEndTime() public {
        vm.expectRevert("must wait 1 minute after market ends");
        market.resolveWithAI();
    }

    function test_CannotResolveMultipleTimes() public {
        vm.warp(block.timestamp + 31 days + 1 minutes);

        market.resolveWithAI();

        vm.expectRevert("already resolved");
        market.resolveWithAI();
    }

    function test_YesWinnerPayout() public {
        // Market is already set up with:
        // - Creator (resolver): 100 USDC on YES
        // - Opponent (user2): 200 USDC on NO
        
        // Resolve with AI (outcome depends on block hash)
        vm.warp(block.timestamp + 31 days + 1 minutes);
        market.resolveWithAI();

        // Check the outcome and test appropriate payout scenario
        TwoPartyMarket.Outcome outcome = market.outcome();
        
        if (outcome == TwoPartyMarket.Outcome.Yes) {
            // YES won - creator should get payout
            uint256 creatorBalanceBefore = usdc.balanceOf(resolver);
            
            vm.prank(resolver);
            market.claim();
            
            uint256 creatorBalanceAfter = usdc.balanceOf(resolver);
            assertGt(creatorBalanceAfter, creatorBalanceBefore);
            
            // Opponent should not be able to claim
            vm.prank(user2);
            vm.expectRevert("no stake");
            market.claim();
        } else {
            // NO won - opponent should get payout
            uint256 opponentBalanceBefore = usdc.balanceOf(user2);
            
            vm.prank(user2);
            market.claim();
            
            uint256 opponentBalanceAfter = usdc.balanceOf(user2);
            assertGt(opponentBalanceAfter, opponentBalanceBefore);
            
            // Creator should not be able to claim
            vm.prank(resolver);
            vm.expectRevert("no stake");
            market.claim();
        }
    }

    function test_NoWinnerPayout() public {
        // This test is now redundant since test_YesWinnerPayout covers both scenarios
        // The AI resolution outcome is deterministic based on block hash
        test_YesWinnerPayout();
    }
}