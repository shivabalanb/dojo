// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";

// FTSO v2 interface (simplified for testing)
interface ITestFTSOv2 {
    function getFeedById(bytes21 _feedId) external view returns (uint256 _price, int8 _decimals, uint64 _timestamp);
}

// Based on Flare FTSO v2 documentation
contract TestFTSO {
    // ETH/USD feed ID from Flare documentation
    bytes21 public constant ethUsdId = 0x014554482f55534400000000000000000000000000; // "ETH/USD"
    
    // Test function to get ETH/USD price
    function getEthUsdPrice() external view returns (uint256 price, int8 decimals, uint64 timestamp) {
        // This would call the actual FTSO v2 contract
        // For now, return mock data for testing
        return (3000000, 2, uint64(block.timestamp)); // $30,000.00
    }
    
    // Function to check if ETH price is above threshold
    function isEthAboveThreshold(uint256 threshold) external view returns (bool) {
        (uint256 price, int8 decimals,) = this.getEthUsdPrice();
        
        // Convert price to actual USD value
        uint256 actualPrice = price / (10 ** uint8(decimals));
        
        return actualPrice >= threshold;
    }
}
