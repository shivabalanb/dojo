// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/MockUSDC.sol";
import "../src/MarketFactory.sol";

contract DeployAndVerify is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("Deploying contracts with address:", deployer);

        vm.startBroadcast(deployerPrivateKey);

        // Deploy MockUSDC first
        console.log("Deploying MockUSDC...");
        MockUSDC mockUSDC = new MockUSDC();
        console.log("MockUSDC deployed to:", address(mockUSDC));

        // Deploy MarketFactory
        console.log("Deploying MarketFactory...");
        MarketFactory marketFactory = new MarketFactory();
        console.log("MarketFactory deployed to:", address(marketFactory));

        vm.stopBroadcast();

        // Save deployment addresses to a file for easy reference
        string memory deploymentInfo = string.concat(
            "Deployment Info:\n",
            "================\n",
            "MockUSDC: ",
            vm.toString(address(mockUSDC)),
            "\n",
            "MarketFactory: ",
            vm.toString(address(marketFactory)),
            "\n",
            "Deployer: ",
            vm.toString(deployer),
            "\n",
            "Network: ",
            vm.toString(block.chainid),
            "\n"
        );

        vm.writeFile("deployment.txt", deploymentInfo);
        console.log("Deployment info saved to deployment.txt");

        console.log("\n=== DEPLOYMENT COMPLETE ===");
        console.log("MockUSDC:", address(mockUSDC));
        console.log("MarketFactory:", address(marketFactory));
        console.log("Deployer:", deployer);
    }
}
