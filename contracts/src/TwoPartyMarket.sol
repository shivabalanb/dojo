// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IERC20} from "openzeppelin/token/ERC20/IERC20.sol";
import {SafeERC20} from "openzeppelin/token/ERC20/utils/SafeERC20.sol";

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
        address _usdc
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

    // AI-powered resolution - anyone can call after market ends
    function resolveWithAI(Outcome o, string memory reasoning) external {
        require(outcome == Outcome.Unresolved, "already resolved");
        require(block.timestamp >= endTime + 1 minutes, "must wait 1 minute after market ends");
        require(o == Outcome.Yes || o == Outcome.No, "invalid outcome");
        require(yesPool > 0 && noPool > 0, "market must be active to resolve");

        outcome = o;

        // Emit event for transparency
        emit AIResolution(msg.sender, o, reasoning);
    }

    event AIResolution(address indexed resolver, Outcome outcome, string reasoning);

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