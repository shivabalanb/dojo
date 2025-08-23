// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./TwoPartyMarket.sol";
import "./LMSRMarket.sol";
import "openzeppelin/token/ERC20/IERC20.sol";
import "openzeppelin/token/ERC20/utils/SafeERC20.sol";

contract MarketFactory {
    using SafeERC20 for IERC20;

    error InvalidDuration();
    error InvalidAmount();
    error InvalidChoice();
    error InvalidValue();
    error InvalidBeta();

    address[] public allMarkets;
    mapping(address => uint8) public marketTypes; // 0=TwoPartyMarket, 1=LMSRMarket

    event MarketCreated(
        address indexed market,
        string question,
        uint256 endTime,
        address creator,
        uint8 marketType
    );

    function createLMSRMarket(
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
            new LMSRMarket(
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
        marketTypes[market] = 1;
        emit MarketCreated(
            market,
            question,
            block.timestamp + duration,
            msg.sender,
            1
        );
    }

    function createTwoPartyMarket(
        string calldata question,
        uint256 duration,
        uint256 creatorBetAmount,
        uint256 opponentBetAmount,
        uint8 creatorChoice,
        address usdc
    ) external returns (address market) {
        if (duration == 0) revert InvalidDuration();
        if (creatorBetAmount == 0 || opponentBetAmount == 0)
            revert InvalidAmount();
        if (creatorChoice != 1 && creatorChoice != 2) revert InvalidChoice();
        if (usdc == address(0)) revert InvalidValue();

        market = address(
            new TwoPartyMarket(
                allMarkets.length,
                block.timestamp + duration,
                msg.sender,
                creatorBetAmount,
                opponentBetAmount,
                TwoPartyMarket.Outcome(creatorChoice),
                usdc,
                address(0),
                0,
                0,
                bytes21(0)
            )
        );
        allMarkets.push(market);
        marketTypes[market] = 0; // Set market type to 0 for TwoPartyMarket
        emit MarketCreated(
            market,
            question,
            block.timestamp + duration,
            msg.sender,
            0
        );
    }

    function createTwoPartyMarketWithFTSO(
        string calldata question,
        uint256 duration,
        uint256 creatorBetAmount,
        uint256 opponentBetAmount,
        uint8 creatorChoice,
        address usdc,
        address ftsoAddress,
        uint256 ftsoEpochId,
        uint256 priceThreshold,
        bytes21 ftsoFeedId
    ) external returns (address market) {
        if (duration == 0) revert InvalidDuration();
        if (creatorBetAmount == 0 || opponentBetAmount == 0)
            revert InvalidAmount();
        if (creatorChoice != 1 && creatorChoice != 2) revert InvalidChoice();
        if (usdc == address(0)) revert InvalidValue();
        if (ftsoAddress == address(0)) revert InvalidValue();
        if (ftsoEpochId == 0) revert InvalidValue();
        if (priceThreshold == 0) revert InvalidValue();
        if (ftsoFeedId == bytes21(0)) revert InvalidValue();

        market = address(
            new TwoPartyMarket(
                allMarkets.length,
                block.timestamp + duration,
                msg.sender,
                creatorBetAmount,
                opponentBetAmount,
                TwoPartyMarket.Outcome(creatorChoice),
                usdc,
                ftsoAddress,
                ftsoEpochId,
                priceThreshold,
                ftsoFeedId
            )
        );
        allMarkets.push(market);
        marketTypes[market] = 0; // Set market type to 0 for TwoPartyMarket
        emit MarketCreated(
            market,
            question,
            block.timestamp + duration,
            msg.sender,
            0
        );
    }

    function getAllMarketsCount() external view returns (uint256) {
        return allMarkets.length;
    }
    function getAllMarkets() external view returns (address[] memory) {
        return allMarkets;
    }
    function getMarketType(address market) external view returns (uint8) {
        return marketTypes[market];
    }
}
