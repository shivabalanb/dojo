// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./TwoPartyMarket.sol";
import "./LMSRMarket.sol";
import "openzeppelin/token/ERC20/IERC20.sol";

contract MarketFactory {
    error InvalidDuration();
    error InvalidAmount();
    error InvalidChoice();
    error InvalidValue();
    error InvalidBeta();

    address[] public allMarkets;
    mapping(address => uint8) public marketTypes; // 0=TwoPartyMarket, 1=LMSRMarket

    event MarketCreated(address indexed market, string question, uint256 endTime, address creator, uint8 marketType);
    
    function createTwoPartyMarket(string calldata question, uint256 duration, uint256 creatorBetAmount, uint256 opponentBetAmount, uint8 creatorChoice, address usdc) external returns (address market) {
        if (duration == 0) revert InvalidDuration();
        if (creatorBetAmount == 0 || opponentBetAmount == 0) revert InvalidAmount();
        if (creatorChoice != 1 && creatorChoice != 2) revert InvalidChoice();
        if (usdc == address(0)) revert InvalidValue();
        
        market = address(new TwoPartyMarket(allMarkets.length, block.timestamp + duration, msg.sender, creatorBetAmount, opponentBetAmount, TwoPartyMarket.Outcome(creatorChoice), usdc));
        allMarkets.push(market);
        marketTypes[market] = 0; // Set market type to 0 for TwoPartyMarket
        emit MarketCreated(market, question, block.timestamp + duration, msg.sender, 0);
    }
    


    function createLMSRMarket(
        address usdc,
        string calldata question, 
        uint256 duration, 
        uint256 beta,
        uint256 initialLiquidity
    ) external returns (address market) {
        if (duration == 0) revert InvalidDuration();
        if (beta == 0) revert InvalidBeta();
        if (usdc == address(0)) revert InvalidAmount();
        
        market = address(new LMSRMarket(usdc, question, block.timestamp + duration, beta, initialLiquidity));
        allMarkets.push(market);
        marketTypes[market] = 1;
        emit MarketCreated(market, question, block.timestamp + duration, msg.sender, 1);
    }

    function getAllMarketsCount() external view returns (uint256) { return allMarkets.length; }
    function getAllMarkets() external view returns (address[] memory) { return allMarkets; }
    function getMarketType(address market) external view returns (uint8) { return marketTypes[market]; }
}