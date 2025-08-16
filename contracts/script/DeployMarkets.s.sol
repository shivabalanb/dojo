// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Script, console} from "forge-std/Script.sol";
import {MarketFactory} from "../src/MarketFactory.sol";
import {Market} from "../src/Market.sol";
import {PositionToken} from "../src/PositionToken.sol";

contract DeployMarketsScript is Script {
    MarketFactory public factory;
    
    // Sepolia testnet configuration
    uint256 constant SEPOLIA_CHAIN_ID = 11155111;
    
    function setUp() public {}

    function run() public {
        // Verify we're deploying to Sepolia
        require(block.chainid == SEPOLIA_CHAIN_ID, "This script is configured for Sepolia testnet only");
        
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("=== Kleos Market Deployment on Sepolia ===");
        console.log("Deployer address:", deployer);
        console.log("Deployer balance:", deployer.balance / 1e18, "ETH");
        console.log("Chain ID:", block.chainid);
        console.log("");
        
        // Check deployer has sufficient balance (at least 0.1 ETH)
        require(deployer.balance >= 0.1 ether, "Insufficient ETH balance for deployment");
        
        vm.startBroadcast(deployerPrivateKey);

        // Deploy MarketFactory
        console.log("Deploying MarketFactory...");
        factory = new MarketFactory();
        console.log("✓ MarketFactory deployed at:", address(factory));
        console.log("");
        
        // Create a test market for verification
        console.log("Creating test market...");
        string memory question = "Will Bitcoin reach $100,000 by end of 2024?";
        string memory description = "This market resolves to YES if Bitcoin (BTC) reaches or exceeds $100,000 USD at any point before January 1, 2025.";
        uint256 resolutionTime = block.timestamp + 365 days; // 1 year from now
        
        address testMarket = factory.createMarket(
            question,
            description,
            resolutionTime,
            deployer // deployer as initial resolver
        );
        
        console.log("✓ Test market created at:", testMarket);
        console.log("  Question:", question);
        console.log("  Resolution time:", resolutionTime);
        console.log("");
        
        vm.stopBroadcast();
        
        // Save deployment info
        console.log("=== Deployment Summary ===");
        console.log("Network: Sepolia Testnet");
        console.log("MarketFactory:", address(factory));
        console.log("Test Market:", testMarket);
        console.log("Deployer:", deployer);
        console.log("");
        console.log("=== Next Steps ===");
        console.log("1. Verify contracts on Etherscan:");
        console.log("   forge verify-contract", address(factory), "src/MarketFactory.sol:MarketFactory --chain sepolia");
        console.log("2. Update frontend configuration with deployed addresses");
        console.log("3. Test market creation and trading on frontend");
    }
}
