// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract Market {
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

    uint256 public yesPool;
    uint256 public noPool;
    mapping(address => uint256) public yesStake;
    mapping(address => uint256) public noStake;
    uint256 public marketIndex;

    // Initial liquidity setup
    MarketState public marketState = MarketState.WaitingForOpponent;
    address public creator;
    uint256 public initialYesAmount; // Amount creator wants to bet on YES
    uint256 public initialNoAmount; // Amount creator wants to bet on NO
    Outcome public creatorChoice; // YES or NO (what creator chose)

    modifier onlyOpen() {
        require(outcome == Outcome.Unresolved && block.timestamp < endTime, "closed");
        _;
    }

    modifier onlyActive() {
        require(marketState == MarketState.Active, "market not active");
        _;
    }

    modifier onlyWaitingForOpponent() {
        require(marketState == MarketState.WaitingForOpponent, "not waiting for opponent");
        _;
    }

    constructor(
        uint256 _marketIndex,
        uint256 _endTime,
        address _creator,
        uint256 _yesAmount,
        uint256 _noAmount,
        Outcome _creatorChoice
    ) payable {
        require(_yesAmount > 0 && _noAmount > 0, "amounts must be positive");
        require(_creatorChoice == Outcome.Yes || _creatorChoice == Outcome.No, "invalid creator choice");
        require(msg.value == (_creatorChoice == Outcome.Yes ? _yesAmount : _noAmount), "incorrect ETH amount");

        marketIndex = _marketIndex;
        endTime = _endTime;
        resolver = _creator;
        creator = _creator;
        initialYesAmount = _yesAmount;
        initialNoAmount = _noAmount;
        creatorChoice = _creatorChoice;

        // Set creator's initial stake
        if (_creatorChoice == Outcome.Yes) {
            yesStake[_creator] = msg.value; 
            yesPool = msg.value;
        } else {
            noStake[_creator] = msg.value; 
            noPool = msg.value;
        }
    }

    // Opponent accepts the challenge by providing the required amount for the opposite side
    function acceptChallenge() external payable onlyWaitingForOpponent {
        uint256 requiredAmount = creatorChoice == Outcome.Yes ? initialNoAmount : initialYesAmount;
        require(msg.value == requiredAmount, "must match exact required amount");
        require(msg.sender != creator, "creator cannot accept own challenge");

        // Set opponent's stake (FIXED BUG)
        if (creatorChoice == Outcome.Yes) {
            noStake[msg.sender] = msg.value; // Use actual msg.value
            noPool = msg.value; // ADD to existing pool
        } else {
            yesStake[msg.sender] = msg.value; // Use actual msg.value
            yesPool = msg.value; // ADD to existing pool
        }

        // Market is now active for others to join
        marketState = MarketState.Active;
    }

    // users choose a side (only after market is active)
    function buyYes() external payable onlyOpen onlyActive {
        require(msg.value > 0, "no value");
        yesStake[msg.sender] += msg.value;
        yesPool += msg.value;
    }

    function buyNo() external payable onlyOpen onlyActive {
        require(msg.value > 0, "no value");
        noStake[msg.sender] += msg.value;
        noPool += msg.value;
    }

    // AI-powered resolution - anyone can call after market ends
    function resolveWithAI(Outcome o, string memory reasoning) external {
        require(outcome == Outcome.Unresolved, "already resolved");
        require(block.timestamp >= endTime + 1 minutes, "must wait 1 minute after market ends");
        require(o == Outcome.Yes || o == Outcome.No, "invalid outcome");
        require(marketState == MarketState.Active, "market must be active to resolve");

        outcome = o;
        marketState = MarketState.Resolved;

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

        (bool ok,) = payable(msg.sender).call{value: payout}("");
        require(ok, "xfer fail");
    }
}