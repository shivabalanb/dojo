// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./Market.sol";

contract MarketFactory {
    address public owner;
    Market[] public markets;
    mapping(address => bool) public resolvers;

    event MarketCreated(address indexed marketAddress, string question, uint256 endTime, address resolver);

    event ResolverAdded(address indexed resolver);
    event ResolverRemoved(address indexed resolver);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call");
        _;
    }

    constructor() {
        owner = msg.sender;
        resolvers[msg.sender] = true; // Owner is default resolver
    }

    // Create a new prediction market
    function createMarket(
        string memory question,
        uint256 duration // in seconds
    ) external returns (address) {
        require(resolvers[msg.sender], "Only resolvers can create markets");
        require(duration > 0, "Duration must be positive");

        uint256 endTime = block.timestamp + duration;

        Market newMarket = new Market(
            markets.length, // Pass the current length as the market index
            endTime,
            msg.sender // Market creator becomes resolver
        );

        markets.push(newMarket);

        emit MarketCreated(address(newMarket), question, endTime, msg.sender);

        return address(newMarket);
    }

    // Add a resolver
    function addResolver(address resolver) external onlyOwner {
        resolvers[resolver] = true;
        emit ResolverAdded(resolver);
    }

    // Remove a resolver
    function removeResolver(address resolver) external onlyOwner {
        require(resolver != owner, "Cannot remove owner");
        resolvers[resolver] = false;
        emit ResolverRemoved(resolver);
    }

    // Get total number of markets
    function getMarketCount() external view returns (uint256) {
        return markets.length;
    }

    // Get market by index
    function getMarket(uint256 index) external view returns (address) {
        require(index < markets.length, "Index out of bounds");
        return address(markets[index]);
    }

    // Get all markets (be careful with gas for large arrays)
    function getAllMarkets() external view returns (Market[] memory) {
        return markets;
    }

    // Get markets by resolver
    function getMarketsByResolver(address resolver) external view returns (address[] memory) {
        address[] memory tempMarkets = new address[](markets.length);
        uint256 count = 0;

        for (uint256 i = 0; i < markets.length; i++) {
            if (markets[i].resolver() == resolver) {
                tempMarkets[count] = address(markets[i]);
                count++;
            }
        }

        // Create a fixed-size array to return
        address[] memory resolverMarkets = new address[](count);
        for (uint256 j = 0; j < count; j++) {
            resolverMarkets[j] = tempMarkets[j];
        }

        return resolverMarkets;
    }

    // Transfer ownership
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        owner = newOwner;
        resolvers[newOwner] = true;
    }
}
