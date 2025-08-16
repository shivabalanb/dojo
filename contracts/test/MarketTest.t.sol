// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Test, console} from "forge-std/Test.sol";
import {Market} from "../src/Market.sol";

contract MarketTest is Test {
    Market public market;

    address public resolver = address(0x1);
    address public user1 = address(0x2);
    address public user2 = address(0x3);
    address public user3 = address(0x4);

    function setUp() public {
        // Create market ending in 30 days
        market = new Market(block.timestamp + 30 days, resolver);

        // Give users some ETH
        vm.deal(user1, 10 ether);
        vm.deal(user2, 10 ether);
        vm.deal(user3, 10 ether);
    }

    function test_InitialState() public {
        assertEq(uint256(market.outcome()), uint256(Market.Outcome.Unresolved));
        assertEq(market.resolver(), resolver);
        assertEq(market.yesPool(), 0);
        assertEq(market.noPool(), 0);
    }

    function test_BuyYes() public {
        vm.prank(user1);
        market.buyYes{value: 1 ether}();

        assertEq(market.yesPool(), 1 ether);
        assertEq(market.yesStake(user1), 1 ether);
        assertEq(market.noStake(user1), 0);
    }

    function test_BuyNo() public {
        vm.prank(user1);
        market.buyNo{value: 1 ether}();

        assertEq(market.noPool(), 1 ether);
        assertEq(market.noStake(user1), 1 ether);
        assertEq(market.yesStake(user1), 0);
    }

    function test_MultipleBuys() public {
        // User1 buys YES
        vm.prank(user1);
        market.buyYes{value: 1 ether}();

        // User2 buys NO
        vm.prank(user2);
        market.buyNo{value: 2 ether}();

        // User3 buys YES
        vm.prank(user3);
        market.buyYes{value: 3 ether}();

        assertEq(market.yesPool(), 4 ether);
        assertEq(market.noPool(), 2 ether);
        assertEq(market.yesStake(user1), 1 ether);
        assertEq(market.yesStake(user3), 3 ether);
        assertEq(market.noStake(user2), 2 ether);
    }

    function test_CannotBuyAfterEndTime() public {
        // Fast forward past end time
        vm.warp(block.timestamp + 31 days);

        vm.prank(user1);
        vm.expectRevert("closed");
        market.buyYes{value: 1 ether}();

        vm.prank(user1);
        vm.expectRevert("closed");
        market.buyNo{value: 1 ether}();
    }

    function test_OnlyResolverCanResolve() public {
        vm.warp(block.timestamp + 31 days);

        vm.prank(user1);
        vm.expectRevert("resolver only");
        market.resolve(Market.Outcome.Yes);

        vm.prank(resolver);
        market.resolve(Market.Outcome.Yes);
    }

    function test_CannotResolveBeforeEndTime() public {
        vm.prank(resolver);
        vm.expectRevert("too early");
        market.resolve(Market.Outcome.Yes);
    }

    function test_CannotResolveMultipleTimes() public {
        vm.warp(block.timestamp + 31 days);

        vm.startPrank(resolver);
        market.resolve(Market.Outcome.Yes);

        vm.expectRevert("already");
        market.resolve(Market.Outcome.No);
        vm.stopPrank();
    }

    function test_YesWinnerPayout() public {
        // User1: 1 ETH on YES
        vm.prank(user1);
        market.buyYes{value: 1 ether}();

        // User2: 2 ETH on NO
        vm.prank(user2);
        market.buyNo{value: 2 ether}();

        // User3: 3 ETH on YES
        vm.prank(user3);
        market.buyYes{value: 3 ether}();

        // Total pool: 6 ETH (4 ETH YES, 2 ETH NO)

        // Resolve YES wins
        vm.warp(block.timestamp + 31 days);
        vm.prank(resolver);
        market.resolve(Market.Outcome.Yes);

        // User1 claims (1/4 of total pool = 1.5 ETH)
        vm.prank(user1);
        uint256 user1BalanceBefore = user1.balance;
        market.claim();
        assertEq(user1.balance - user1BalanceBefore, 1.5 ether);

        // User3 claims (3/4 of total pool = 4.5 ETH)
        vm.prank(user3);
        uint256 user3BalanceBefore = user3.balance;
        market.claim();
        assertEq(user3.balance - user3BalanceBefore, 4.5 ether);

        // User2 (NO) can't claim
        vm.prank(user2);
        vm.expectRevert("no stake");
        market.claim();
    }

    function test_NoWinnerPayout() public {
        // User1: 2 ETH on YES
        vm.prank(user1);
        market.buyYes{value: 2 ether}();

        // User2: 1 ETH on NO
        vm.prank(user2);
        market.buyNo{value: 1 ether}();

        // User3: 3 ETH on NO
        vm.prank(user3);
        market.buyNo{value: 3 ether}();

        // Total pool: 6 ETH (2 ETH YES, 4 ETH NO)

        // Resolve NO wins
        vm.warp(block.timestamp + 31 days);
        vm.prank(resolver);
        market.resolve(Market.Outcome.No);

        // User2 claims (1/4 of total pool = 1.5 ETH)
        vm.prank(user2);
        uint256 user2BalanceBefore = user2.balance;
        market.claim();
        assertEq(user2.balance - user2BalanceBefore, 1.5 ether);

        // User3 claims (3/4 of total pool = 4.5 ETH)
        vm.prank(user3);
        uint256 user3BalanceBefore = user3.balance;
        market.claim();
        assertEq(user3.balance - user3BalanceBefore, 4.5 ether);

        // User1 (YES) can't claim
        vm.prank(user1);
        vm.expectRevert("no stake");
        market.claim();
    }

    function test_CannotClaimBeforeResolution() public {
        vm.prank(user1);
        market.buyYes{value: 1 ether}();

        vm.prank(user1);
        vm.expectRevert("not resolved");
        market.claim();
    }

    function test_CannotBuyZero() public {
        vm.prank(user1);
        vm.expectRevert("no value");
        market.buyYes{value: 0}();

        vm.prank(user1);
        vm.expectRevert("no value");
        market.buyNo{value: 0}();
    }
}
