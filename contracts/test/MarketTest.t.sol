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
            resolver, // resolver
            100e6, // creatorBetAmount (100 USDC)
            200e6, // opponentBetAmount (200 USDC) - 1:2 odds
            TwoPartyMarket.Outcome.Yes, // creatorChoice
            address(usdc) // USDC address
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
        market.resolveWithAI(TwoPartyMarket.Outcome.Yes, "AI decision: Yes");
    }

    function test_CannotResolveBeforeEndTime() public {
        vm.expectRevert("must wait 1 minute after market ends");
        market.resolveWithAI(TwoPartyMarket.Outcome.Yes, "AI decision: Yes");
    }

    function test_CannotResolveMultipleTimes() public {
        vm.warp(block.timestamp + 31 days + 1 minutes);

        market.resolveWithAI(TwoPartyMarket.Outcome.Yes, "AI decision: Yes");

        vm.expectRevert("already resolved");
        market.resolveWithAI(TwoPartyMarket.Outcome.No, "AI decision: No");
    }

    function test_YesWinnerPayout() public {
        // User1: 50 USDC on YES
        vm.prank(user1);
        market.buyYes(50e6);

        // User2: 100 USDC on NO
        vm.prank(user2);
        market.buyNo(100e6);

        // Resolve as YES
        vm.warp(block.timestamp + 31 days + 1 minutes);
        market.resolveWithAI(TwoPartyMarket.Outcome.Yes, "AI decision: Yes");

        // Check balances before claim
        uint256 user1BalanceBefore = usdc.balanceOf(user1);
        uint256 user2BalanceBefore = usdc.balanceOf(user2);

        // User1 claims (should get proportional payout)
        vm.prank(user1);
        market.claim();

        // User2 claims (should fail since NO lost)
        vm.prank(user2);
        vm.expectRevert("no stake");
        market.claim();

        // Check balances after claim
        uint256 user1BalanceAfter = usdc.balanceOf(user1);
        uint256 user2BalanceAfter = usdc.balanceOf(user2);

        // User1 should have received payout
        assertGt(user1BalanceAfter, user1BalanceBefore);
        // User2 should have same balance (failed claim doesn't change balance)
        assertEq(user2BalanceAfter, user2BalanceBefore);
    }

    function test_NoWinnerPayout() public {
        // User1: 50 USDC on YES
        vm.prank(user1);
        market.buyYes(50e6);

        // User2: 100 USDC on NO
        vm.prank(user2);
        market.buyNo(100e6);

        // Resolve as NO
        vm.warp(block.timestamp + 31 days + 1 minutes);
        market.resolveWithAI(TwoPartyMarket.Outcome.No, "AI decision: No");

        // Check balances before claim
        uint256 user1BalanceBefore = usdc.balanceOf(user1);
        uint256 user2BalanceBefore = usdc.balanceOf(user2);

        // User1 claims (should fail since YES lost)
        vm.prank(user1);
        vm.expectRevert("no stake");
        market.claim();

        // User2 claims (should get proportional payout)
        vm.prank(user2);
        market.claim();

        // Check balances after claim
        uint256 user1BalanceAfter = usdc.balanceOf(user1);
        uint256 user2BalanceAfter = usdc.balanceOf(user2);

        // User1 should have same balance (failed claim doesn't change balance)
        assertEq(user1BalanceAfter, user1BalanceBefore);
        // User2 should have received payout
        assertGt(user2BalanceAfter, user2BalanceBefore);
    }
}