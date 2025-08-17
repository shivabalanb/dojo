// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/MarketFactory.sol";
import "../src/MockUSDC.sol";

contract DeployToTestnet is Script {
    function run() external {
        // Load environment variables - handle both hex and decimal formats
        string memory privateKeyString = vm.envString("PRIVATE_KEY");
        uint256 deployerPrivateKey;
        
        // Check if it's already a hex string
        if (bytes(privateKeyString).length == 66 && bytes(privateKeyString)[0] == 0x30 && bytes(privateKeyString)[1] == 0x78) {
            // Already has 0x prefix
            deployerPrivateKey = vm.parseUint(privateKeyString);
        } else if (bytes(privateKeyString).length == 64) {
            // Hex string without 0x prefix
            deployerPrivateKey = vm.parseUint(string.concat("0x", privateKeyString));
        } else {
            // Assume it's a decimal string
            deployerPrivateKey = vm.parseUint(privateKeyString);
        }
        
        console.log("Starting deployment to testnet...");
        
        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy MockUSDC first
        console.log("Deploying MockUSDC...");
        MockUSDC mockUSDC = new MockUSDC();
        console.log("MockUSDC deployed at:", address(mockUSDC));

        // 2. Deploy MarketFactory
        console.log("Deploying MarketFactory...");
        MarketFactory factory = new MarketFactory();
        console.log("MarketFactory deployed at:", address(factory));

        // 3. Mint some USDC to the deployer for testing
        console.log("Minting USDC to deployer...");
        address deployer = vm.addr(deployerPrivateKey);
        mockUSDC.mint(deployer, 10000e6); // 10,000 USDC
        console.log("Minted 10,000 USDC to:", deployer);

        vm.stopBroadcast();

        // 4. Print deployment summary
        console.log("\nDeployment Complete!");
        console.log("==================================");
        console.log("MockUSDC:", address(mockUSDC));
        console.log("MarketFactory:", address(factory));
        console.log("Deployer:", deployer);
        console.log("==================================");
        
        // 5. Save addresses to a file for frontend
        string memory deploymentInfo = string.concat(
            "MockUSDC=", vm.toString(address(mockUSDC)), "\n",
            "MarketFactory=", vm.toString(address(factory)), "\n",
            "Deployer=", vm.toString(deployer), "\n"
        );
        
        vm.writeFile("deployment.txt", deploymentInfo);
        console.log("Deployment addresses saved to deployment.txt");
    }
}
