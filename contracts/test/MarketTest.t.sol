// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Test, console} from "forge-std/Test.sol";
import {MarketFactory} from "../src/MarketFactory.sol";
import {Market} from "../src/Market.sol";
import {PositionToken} from "../src/PositionToken.sol";

contract MarketTest is Test {
    MarketFactory public factory;
    Market public market;
    
    address public resolver = address(0x1);
    address public user1 = address(0x2);
    address public user2 = address(0x3);
    
    function setUp() public {
        factory = new MarketFactory();
        
        // Create a test market
        vm.prank(address(this)); // Factory owner can create markets
        address marketAddress = factory.createMarket(
            "Will ETH reach $5000 by end of year?",
            30 days
        );
        market = Market(marketAddress);
        
        // Give users some ETH
        vm.deal(user1, 10 ether);
        vm.deal(user2, 10 ether);
    }
    
    function test_CreateMarket() public view {
        assertEq(factory.getMarketCount(), 1);
        assertEq(market.question(), "Will ETH reach $5000 by end of year?");
        assertEq(market.resolver(), address(this));
    }
    
    function test_MintPositions() public {
        vm.startPrank(user1);
        
        // Mint 1 ETH worth of positions
        market.mintPositions{value: 1 ether}(1 ether);
        
        (address yesToken, address noToken) = market.getTokenAddresses();
        
        // Should have 1 YES and 1 NO token
        assertEq(PositionToken(yesToken).balanceOf(user1), 1 ether);
        assertEq(PositionToken(noToken).balanceOf(user1), 1 ether);
        
        vm.stopPrank();
    }
    
    function test_RedeemPositions() public {
        vm.startPrank(user1);
        
        // Mint positions
        market.mintPositions{value: 1 ether}(1 ether);
        
        uint256 balanceBefore = user1.balance;
        
        // Redeem half the positions
        market.redeemPositions(0.5 ether);
        
        // Should get 0.5 ETH back
        assertEq(user1.balance, balanceBefore + 0.5 ether);
        
        vm.stopPrank();
    }
    
    function test_ResolveAndClaim() public {
        // User1 mints positions
        vm.prank(user1);
        market.mintPositions{value: 1 ether}(1 ether);
        
        // Fast forward past end time
        vm.warp(block.timestamp + 31 days);
        
        // Resolve market to YES
        market.resolve(Market.Outcome.Yes);
        
        // User1 claims winnings
        vm.prank(user1);
        uint256 balanceBefore = user1.balance;
        market.claim();
        
        // Should receive 1 ETH for winning YES tokens
        assertEq(user1.balance, balanceBefore + 1 ether);
    }
    
    function test_AddResolver() public {
        factory.addResolver(resolver);
        assertTrue(factory.resolvers(resolver));
    }
}
