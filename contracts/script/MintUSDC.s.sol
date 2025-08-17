// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";

contract MintUSDC is Script {
    function run() external {
        // Load private key from environment
        string memory privateKeyString = vm.envString("PRIVATE_KEY");
        uint256 deployerPrivateKey;

        // Parse private key (handle both hex and decimal formats)
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

        // MockUSDC contract address on Flare Coston2 testnet
        address mockUSDC = 0xb910A29A10402D76aCD49bd10c28533Ef35C61c3;
        
        // Address to mint to
        address recipient = 0xD5BeD83a3d8f87B51ef6c92291556B634D5AE2F7;
        
        // Amount to mint (10,000 USDC with 6 decimals)
        uint256 amount = 10000000000; // 10,000 * 10^6

        console.log("Starting USDC mint...");
        console.log("MockUSDC Address:", mockUSDC);
        console.log("Recipient:", recipient);
        console.log("Amount:", amount, "wei (10,000 USDC)");

        vm.startBroadcast(deployerPrivateKey);

        // Call mint function on MockUSDC contract
        (bool success, bytes memory data) = mockUSDC.call(
            abi.encodeWithSignature("mint(address,uint256)", recipient, amount)
        );

        if (success) {
            console.log("USDC minted successfully!");
            console.log("Transaction data:", vm.toString(data));
        } else {
            console.log("Mint failed!");
            console.log("Error data:", vm.toString(data));
        }

        vm.stopBroadcast();

        console.log("Mint script completed!");
    }
}
