// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/MarketFactory.sol";

contract DeployMarkets is Script {
    function run() external {
        vm.startBroadcast();

        // Deploy the MarketFactory contract
        MarketFactory marketFactory = new MarketFactory();

        console.log("MarketFactory deployed to:", address(marketFactory));

        vm.stopBroadcast();
    }
}
