// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/Market.sol";

contract MarketTest is Test {
    Market public market;
    address public resolver = address(0x1);
    address public user1 = address(0x2);
    address public user2 = address(0x3);
    address public user3 = address(0x4);

    function setUp() public {
        // Create market with initial liquidity challenge
        market = new Market{value: 1 ether}(
            0, // marketIndex
            block.timestamp + 30 days, // endTime
            resolver, // resolver
            1 ether, // yesAmount
            2 ether, // noAmount
            Market.Outcome.Yes // creatorChoice
        );

        // Accept the challenge as user2
        vm.prank(user2);
        market.acceptChallenge{value: 2 ether}();

        // Give users some ETH
        vm.deal(user1, 10 ether);
        vm.deal(user2, 10 ether);
        vm.deal(user3, 10 ether);
    }

    function test_InitialState() public {
        assertEq(uint256(market.outcome()), uint256(Market.Outcome.Unresolved));
        assertEq(market.resolver(), resolver);
        assertEq(market.yesPool(), 1 ether);
        assertEq(market.noPool(), 2 ether);
        assertEq(uint256(market.marketState()), uint256(Market.MarketState.Active));
    }

    function test_BuyYes() public {
        vm.prank(user1);
        market.buyYes{value: 1 ether}();

        assertEq(market.yesStake(user1), 1 ether);
        assertEq(market.yesPool(), 2 ether);
    }

    function test_BuyNo() public {
        vm.prank(user1);
        market.buyNo{value: 1 ether}();

        assertEq(market.noStake(user1), 1 ether);
        assertEq(market.noPool(), 3 ether);
    }

    function test_CannotBuyAfterEnd() public {
        vm.warp(block.timestamp + 31 days);

        vm.prank(user1);
        vm.expectRevert("closed");
        market.buyYes{value: 1 ether}();

        vm.prank(user1);
        vm.expectRevert("closed");
        market.buyNo{value: 1 ether}();
    }

    function test_AnyoneCanResolveAfterDelay() public {
        vm.warp(block.timestamp + 31 days);

        // Warp past end time + 1 minute
        vm.warp(block.timestamp + 31 days + 1 minutes);
        
        // Anyone can call resolveWithAI now
        vm.prank(user1);
        market.resolveWithAI(Market.Outcome.Yes, "AI decision: Yes");
    }

    function test_CannotResolveBeforeEndTime() public {
        vm.expectRevert("must wait 1 minute after market ends");
        market.resolveWithAI(Market.Outcome.Yes, "AI decision: Yes");
    }

    function test_CannotResolveMultipleTimes() public {
        vm.warp(block.timestamp + 31 days + 1 minutes);

        market.resolveWithAI(Market.Outcome.Yes, "AI decision: Yes");

        vm.expectRevert("already resolved");
        market.resolveWithAI(Market.Outcome.No, "AI decision: No");
    }

    function test_YesWinnerPayout() public {
        // User1: 1 ETH on YES
        vm.prank(user1);
        market.buyYes{value: 1 ether}();

        // User3: 2 ETH on NO
        vm.prank(user3);
        market.buyNo{value: 2 ether}();

        // Total pools: YES = 2 ETH (1 from setup + 1 from user1), NO = 4 ETH (2 from setup + 2 from user3)
        // Total pool = 6 ETH

        // Resolve to YES
        vm.warp(block.timestamp + 31 days + 1 minutes);
        market.resolveWithAI(Market.Outcome.Yes, "AI decision: Yes");

        // Check payouts
        uint256 balanceBefore = address(this).balance;
        market.claim(); // Creator wins (1 ETH stake)
        uint256 creatorPayout = address(this).balance - balanceBefore;

        vm.prank(user1);
        uint256 user1BalanceBefore = user1.balance;
        market.claim();
        uint256 user1Payout = user1.balance - user1BalanceBefore;

        // Creator should get: 6 ETH * (1 ETH / 2 ETH YES pool) = 3 ETH
        assertEq(creatorPayout, 3 ether);
        // User1 should get: 6 ETH * (1 ETH / 2 ETH YES pool) = 3 ETH
        assertEq(user1Payout, 3 ether);
    }

    function test_NoWinnerPayout() public {
        // User1: 1 ETH on YES
        vm.prank(user1);
        market.buyYes{value: 1 ether}();

        // User3: 2 ETH on NO
        vm.prank(user3);
        market.buyNo{value: 2 ether}();

        // Resolve to NO
        vm.warp(block.timestamp + 31 days + 1 minutes);
        market.resolveWithAI(Market.Outcome.No, "AI decision: No");

        // Check payouts for NO winners
        vm.prank(user2);
        uint256 user2BalanceBefore = user2.balance;
        market.claim(); // User2 from setup wins (2 ETH stake)
        uint256 user2Payout = user2.balance - user2BalanceBefore;

        vm.prank(user3);
        uint256 user3BalanceBefore = user3.balance;
        market.claim();
        uint256 user3Payout = user3.balance - user3BalanceBefore;

        // Total NO pool = 4 ETH, total pool = 6 ETH
        // User2 should get: 6 ETH * (2 ETH / 4 ETH NO pool) = 3 ETH
        assertEq(user2Payout, 3 ether);
        // User3 should get: 6 ETH * (2 ETH / 4 ETH NO pool) = 3 ETH  
        assertEq(user3Payout, 3 ether);
    }

    function test_CannotClaimTwice() public {
        vm.prank(user1);
        market.buyYes{value: 1 ether}();

        vm.warp(block.timestamp + 31 days + 1 minutes);
        market.resolveWithAI(Market.Outcome.Yes, "AI decision: Yes");

        // First claim should work
        market.claim();

        // Second claim should fail
        vm.expectRevert("no stake");
        market.claim();
    }

    function test_CannotClaimUnresolved() public {
        vm.prank(user1);
        market.buyYes{value: 1 ether}();

        vm.expectRevert("not resolved");
        market.claim();
    }

    function test_CannotClaimLoser() public {
        vm.prank(user1);
        market.buyYes{value: 1 ether}();

        vm.warp(block.timestamp + 31 days + 1 minutes);
        market.resolveWithAI(Market.Outcome.No, "AI decision: No");

        vm.prank(user1);
        vm.expectRevert("no stake");
        market.claim();
    }
}