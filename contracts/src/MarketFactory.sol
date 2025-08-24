// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./ConstantProductMarket.sol";
import "openzeppelin/token/ERC20/IERC20.sol";
import "openzeppelin/token/ERC20/utils/SafeERC20.sol";

contract MarketFactory {
    using SafeERC20 for IERC20;

    error InvalidDuration();
    error InvalidAmount();

    address[] public allMarkets;

    event MarketCreated(
        address indexed market,
        string question,
        uint256 endTime,
        address creator
    );

    function createMarket(
        address usdc,
        string calldata title,
        string calldata question,
        uint256 duration,
        uint256 initialLiquidity
    ) external returns (address market) {
        if (duration == 0) revert InvalidDuration();
        if (initialLiquidity == 0) revert InvalidAmount();
        if (usdc == address(0)) revert InvalidAmount();

        // Transfer USDC from caller to factory first
        IERC20(usdc).safeTransferFrom(
            msg.sender,
            address(this),
            initialLiquidity
        );

        market = address(
            new ConstantProductMarket(
                usdc,
                title,
                question,
                block.timestamp + duration,
                initialLiquidity
            )
        );

        // Transfer USDC from factory to the new market
        IERC20(usdc).safeTransfer(market, initialLiquidity);

        allMarkets.push(market);
        emit MarketCreated(
            market,
            question,
            block.timestamp + duration,
            msg.sender
        );
    }

    function getAllMarketsCount() external view returns (uint256) {
        return allMarkets.length;
    }
    function getAllMarkets() external view returns (address[] memory) {
        return allMarkets;
    }
}
