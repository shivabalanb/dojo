// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Script, console} from "forge-std/Script.sol";
import {MarketFactory} from "../src/MarketFactory.sol";

contract DeployMarketsScript is Script {
    MarketFactory public factory;

    function setUp() public {}

    function run() public {
        vm.startBroadcast();

        factory = new MarketFactory();

        console.log("MarketFactory deployed at:", address(factory));

        vm.stopBroadcast();
    }
}
