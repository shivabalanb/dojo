// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;
import "openzeppelin/token/ERC20/ERC20.sol";

contract MockUSDC is ERC20 {
    constructor() ERC20("Mock USDC", "USDC") {}
    function decimals() public pure override returns (uint8) { return 6; }
    function mint(address to, uint256 amount) external { _mint(to, amount); } // amount in 1e6
}
