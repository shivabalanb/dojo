// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/MockUSDC.sol";

contract DeployMockUSDC is Script {
    function run() external {
        vm.startBroadcast();

        // Deploy the MockUSDC contract
        MockUSDC mockUSDC = new MockUSDC();
        
        console.log("MockUSDC deployed to:", address(mockUSDC));
        console.log("Token name:", mockUSDC.name());
        console.log("Token symbol:", mockUSDC.symbol());
        console.log("Token decimals:", mockUSDC.decimals());

        vm.stopBroadcast();
    }
}
