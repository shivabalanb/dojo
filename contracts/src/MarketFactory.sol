// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./Market.sol";

contract MarketFactory {
    Market[] public markets;

    event MarketCreated(address indexed marketAddress, string question, uint256 endTime, address creator);

    // Create a new prediction market with initial liquidity challenge
    function createMarket(
        string memory question,
        uint256 duration, // in seconds
        uint256 yesAmount, // Amount creator wants to put in YES pool
        uint256 noAmount, // Amount creator wants to put in NO pool
        uint8 creatorChoice // 1 for YES, 2 for NO
    ) external payable returns (address) {
        require(duration > 0, "Duration must be positive");
        require(yesAmount > 0 && noAmount > 0, "Amounts must be positive");
        require(creatorChoice == 1 || creatorChoice == 2, "Invalid choice: must be 1 (YES) or 2 (NO)");

        uint256 creatorAmount = creatorChoice == 1 ? yesAmount : noAmount;
        require(msg.value == creatorAmount, "Must send exact creator amount");

        uint256 endTime = block.timestamp + duration;

        Market newMarket = new Market{value: msg.value}(
            markets.length, // Pass the current length as the market index
            endTime,
            msg.sender, // Pass the actual user as creator
            yesAmount,
            noAmount,
            Market.Outcome(creatorChoice) // Cast uint8 to Outcome enum
        );

        markets.push(newMarket);

        emit MarketCreated(address(newMarket), question, endTime, msg.sender);

        return address(newMarket);
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
}