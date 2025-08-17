// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IERC20} from "openzeppelin/token/ERC20/IERC20.sol";
import {SafeERC20} from "openzeppelin/token/ERC20/utils/SafeERC20.sol";

// FTSO v2 Interface for composable price feed resolution
interface IFTSOv2 {
    function getFeedById(bytes21 _feedId) external view returns (uint256 _price, int8 _decimals, uint64 _timestamp);
}

contract TwoPartyMarket {
    using SafeERC20 for IERC20;
    enum Outcome {
        Unresolved,
        Yes,
        No
    }

    enum MarketState {
        WaitingForOpponent,
        Active,
        Resolved
    }

    Outcome public outcome = Outcome.Unresolved;
    uint256 public endTime;
    address public resolver;
    IERC20 public immutable usdc;

    uint256 public yesPool;
    uint256 public noPool;
    mapping(address => uint256) public yesStake;
    mapping(address => uint256) public noStake;
    uint256 public marketIndex;

    // Odds-based bet setup
    address public creator;
    uint256 public creatorBetAmount; // Amount creator is betting
    uint256 public opponentBetAmount; // Amount opponent needs to bet (calculated from odds)
    Outcome public creatorChoice; // YES or NO (what creator chose)

    // Optional FTSO resolution parameters
    address public ftsoAddress;
    uint256 public ftsoEpochId;
    uint256 public priceThreshold;
    bytes21 public ftsoFeedId;
    bool public hasFTSOResolution;

    modifier onlyOpen() {
        require(outcome == Outcome.Unresolved && block.timestamp < endTime, "closed");
        _;
    }

    modifier onlyActive() {
        require(yesPool > 0 && noPool > 0, "market not active");
        _;
    }

    modifier onlyWaitingForOpponent() {
        require(yesPool == 0 && noPool == 0, "not waiting for opponent");
        _;
    }

    constructor(
        uint256 _marketIndex,
        uint256 _endTime,
        address _creator,
        uint256 _creatorBetAmount,
        uint256 _opponentBetAmount,
        Outcome _creatorChoice,
        address _usdc,
        address _ftsoAddress,
        uint256 _ftsoEpochId,
        uint256 _priceThreshold,
        bytes21 _ftsoFeedId
    ) {
        require(_creatorBetAmount > 0, "creator bet amount must be positive");
        require(_opponentBetAmount > 0, "opponent bet amount must be positive");
        require(_creatorChoice == Outcome.Yes || _creatorChoice == Outcome.No, "invalid creator choice");
        require(_usdc != address(0), "invalid USDC");

        marketIndex = _marketIndex;
        endTime = _endTime;
        resolver = _creator;
        creator = _creator;
        creatorBetAmount = _creatorBetAmount;
        opponentBetAmount = _opponentBetAmount;
        creatorChoice = _creatorChoice;
        usdc = IERC20(_usdc);

        // Set FTSO parameters if provided
        ftsoAddress = _ftsoAddress;
        ftsoEpochId = _ftsoEpochId;
        priceThreshold = _priceThreshold;
        ftsoFeedId = _ftsoFeedId;
        hasFTSOResolution = _ftsoAddress != address(0) && _ftsoEpochId > 0 && _priceThreshold > 0 && _ftsoFeedId != bytes21(0);

        // Initial stake will be set when creator provides liquidity
        // This allows for proper approval flow
    }

    // Creator provides initial bet
    function provideInitialBet() external {
        require(msg.sender == creator, "only creator");
        require(yesPool == 0 && noPool == 0, "bet already provided");
        
        // Transfer USDC from creator and set initial stake
        usdc.safeTransferFrom(creator, address(this), creatorBetAmount);
        if (creatorChoice == Outcome.Yes) {
            yesStake[creator] = creatorBetAmount; 
            yesPool = creatorBetAmount;
        } else {
            noStake[creator] = creatorBetAmount; 
            noPool = creatorBetAmount;
        }
    }

    // Opponent accepts the challenge by betting the required amount on the opposite side
    function acceptChallenge() external {
        require(yesPool > 0 || noPool > 0, "no initial bet");
        require(msg.sender != creator, "creator cannot accept own challenge");

        // Transfer USDC from opponent (calculated amount based on odds)
        usdc.safeTransferFrom(msg.sender, address(this), opponentBetAmount);

        // Set opponent's stake on the opposite side
        if (creatorChoice == Outcome.Yes) {
            noStake[msg.sender] = opponentBetAmount;
            noPool = opponentBetAmount; // This is the first NO stake
        } else {
            yesStake[msg.sender] = opponentBetAmount;
            yesPool = opponentBetAmount; // This is the first YES stake
        }

        // Market is now active for others to join
    }

    // users choose a side (only after market is active)
    function buyYes(uint256 amount) external onlyOpen onlyActive {
        require(amount > 0, "no amount");
        usdc.safeTransferFrom(msg.sender, address(this), amount);
        yesStake[msg.sender] += amount;
        yesPool += amount;
    }

    function buyNo(uint256 amount) external onlyOpen onlyActive {
        require(amount > 0, "no amount");
        usdc.safeTransferFrom(msg.sender, address(this), amount);
        noStake[msg.sender] += amount;
        noPool += amount;
    }

    // AI-powered resolution - anyone can call immediately when market ends
    function resolveWithAI() external {
        require(outcome == Outcome.Unresolved, "already resolved");
        require(block.timestamp >= endTime, "market must be ended");
        require(yesPool > 0 && noPool > 0, "market must be active to resolve");

        // For now, use a simple deterministic outcome based on block hash
        // In production, this would call an AI service
        uint256 blockHash = uint256(blockhash(block.number - 1));
        outcome = (blockHash % 2 == 0) ? Outcome.Yes : Outcome.No;

        // Emit event for transparency
        emit AIResolution(msg.sender, outcome, "AI determined outcome based on blockchain randomness");
    }

    // FTSO v2-powered resolution - anyone can call immediately when market ends
    function resolveWithFTSO(address _ftsoAddress, uint256 _epochId, uint256 _priceThreshold, bytes21 _ftsoFeedId) external {
        require(outcome == Outcome.Unresolved, "already resolved");
        require(block.timestamp >= endTime, "market must be ended");
        require(_ftsoAddress != address(0), "invalid FTSO address");
        require(_epochId > 0, "invalid epoch ID");
        require(_priceThreshold > 0, "invalid price threshold");
        require(_ftsoFeedId != bytes21(0), "invalid FTSO feed ID");
        require(yesPool > 0 && noPool > 0, "market must be active to resolve");
        
        // Get price from FTSO v2 using provided feed ID
        IFTSOv2 ftso = IFTSOv2(_ftsoAddress);
        (uint256 price, int8 decimals, uint64 timestamp) = ftso.getFeedById(_ftsoFeedId);
        require(timestamp > 0, "FTSO price not available");

        // Convert price to actual USD value (accounting for decimals)
        uint256 actualPrice = price / (10 ** uint8(decimals));

        // Resolve based on price threshold
        outcome = actualPrice >= _priceThreshold ? Outcome.Yes : Outcome.No;

        // Emit event for transparency
        emit FTSOResolution(msg.sender, _ftsoAddress, _epochId, actualPrice, _priceThreshold, outcome);
    }

    // Simple FTSO v2 resolution using stored parameters
    function resolveWithStoredFTSO() external {
        require(outcome == Outcome.Unresolved, "already resolved");
        require(block.timestamp >= endTime, "market must be ended");
        require(hasFTSOResolution, "no FTSO resolution configured");
        require(yesPool > 0 && noPool > 0, "market must be active to resolve");

        // Get price from stored FTSO v2 address using stored feed ID
        IFTSOv2 ftso = IFTSOv2(ftsoAddress);
        (uint256 price, int8 decimals, uint64 timestamp) = ftso.getFeedById(ftsoFeedId);
        require(timestamp > 0, "FTSO price not available");

        // Convert price to actual USD value (accounting for decimals)
        uint256 actualPrice = price / (10 ** uint8(decimals));

        // Resolve based on stored price threshold
        outcome = actualPrice >= priceThreshold ? Outcome.Yes : Outcome.No;

        // Emit event for transparency
        emit FTSOResolution(msg.sender, ftsoAddress, ftsoEpochId, actualPrice, priceThreshold, outcome);
    }

    event AIResolution(address indexed resolver, Outcome outcome, string reasoning);
    event FTSOResolution(address indexed resolver, address ftsoAddress, uint256 epochId, uint256 price, uint256 threshold, Outcome outcome);

    function claim() external {
        require(outcome != Outcome.Unresolved, "not resolved");
        uint256 totalPool = yesPool + noPool;
        uint256 payout;

        if (outcome == Outcome.Yes) {
            uint256 s = yesStake[msg.sender];
            require(s > 0, "no stake");
            payout = (totalPool * s) / yesPool;
            yesStake[msg.sender] = 0;
        } else {
            uint256 s = noStake[msg.sender];
            require(s > 0, "no stake");
            payout = (totalPool * s) / noPool;
            noStake[msg.sender] = 0;
        }

        usdc.safeTransfer(msg.sender, payout);
    }

    function getMarketState() external view returns (MarketState) {
        if (outcome != Outcome.Unresolved) return MarketState.Resolved;
        if (block.timestamp < endTime) {
            // Check if initial liquidity has been provided
            if (yesPool == 0 && noPool == 0) return MarketState.WaitingForOpponent;
            return MarketState.Active;
        }
        return MarketState.Active; // Keep active even after end time until resolved
    }
}