// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./PositionToken.sol";

contract Market {
    enum MarketState { Open, Resolved }
    enum Outcome { Unresolved, Yes, No }
    
    string public question;
    uint256 public endTime;
    address public resolver;
    address public factory;
    
    MarketState public state;
    Outcome public outcome;
    
    PositionToken public yesToken;
    PositionToken public noToken;
    
    // For simplicity, using ETH as collateral instead of USDC
    mapping(address => uint256) public deposits;
    uint256 public totalDeposits;
    
    event PositionsMinted(address indexed user, uint256 amount);
    event PositionsRedeemed(address indexed user, uint256 amount);
    event MarketResolved(Outcome outcome);
    event Claimed(address indexed user, uint256 amount);
    
    modifier onlyResolver() {
        require(msg.sender == resolver, "Only resolver can call");
        _;
    }
    
    modifier onlyOpen() {
        require(state == MarketState.Open, "Market not open");
        require(block.timestamp < endTime, "Market expired");
        _;
    }
    
    modifier onlyResolved() {
        require(state == MarketState.Resolved, "Market not resolved");
        _;
    }
    
    constructor(
        string memory _question,
        uint256 _endTime,
        address _resolver,
        address _factory
    ) {
        question = _question;
        endTime = _endTime;
        resolver = _resolver;
        factory = _factory;
        state = MarketState.Open;
        outcome = Outcome.Unresolved;
        
        // Create position tokens
        yesToken = new PositionToken(
            string(abi.encodePacked("YES - ", _question)),
            "YES",
            address(this)
        );
        
        noToken = new PositionToken(
            string(abi.encodePacked("NO - ", _question)),
            "NO", 
            address(this)
        );
    }
    
    // Mint position tokens by depositing ETH
    // 1 ETH = 1 YES + 1 NO token
    function mintPositions(uint256 amount) external payable onlyOpen {
        require(msg.value == amount, "Incorrect ETH amount");
        
        deposits[msg.sender] += amount;
        totalDeposits += amount;
        
        yesToken.mint(msg.sender, amount);
        noToken.mint(msg.sender, amount);
        
        emit PositionsMinted(msg.sender, amount);
    }
    
    // Redeem position tokens for ETH (before resolution)
    // Must have equal amounts of YES and NO tokens
    function redeemPositions(uint256 amount) external onlyOpen {
        require(yesToken.balanceOf(msg.sender) >= amount, "Insufficient YES tokens");
        require(noToken.balanceOf(msg.sender) >= amount, "Insufficient NO tokens");
        
        yesToken.burn(msg.sender, amount);
        noToken.burn(msg.sender, amount);
        
        deposits[msg.sender] -= amount;
        totalDeposits -= amount;
        
        payable(msg.sender).transfer(amount);
        
        emit PositionsRedeemed(msg.sender, amount);
    }
    
    // Resolve the market (only resolver can call)
    function resolve(Outcome _outcome) external onlyResolver {
        require(_outcome == Outcome.Yes || _outcome == Outcome.No, "Invalid outcome");
        require(block.timestamp >= endTime, "Market not expired");
        
        state = MarketState.Resolved;
        outcome = _outcome;
        
        emit MarketResolved(_outcome);
    }
    
    // Claim winnings after resolution
    function claim() external onlyResolved {
        uint256 winningTokens;
        
        if (outcome == Outcome.Yes) {
            winningTokens = yesToken.balanceOf(msg.sender);
            yesToken.burn(msg.sender, winningTokens);
        } else {
            winningTokens = noToken.balanceOf(msg.sender);
            noToken.burn(msg.sender, winningTokens);
        }
        
        require(winningTokens > 0, "No winning tokens to claim");
        
        payable(msg.sender).transfer(winningTokens);
        
        emit Claimed(msg.sender, winningTokens);
    }
    
    // View functions
    function getTokenAddresses() external view returns (address, address) {
        return (address(yesToken), address(noToken));
    }
    
    function getMarketInfo() external view returns (
        string memory,
        uint256,
        MarketState,
        Outcome,
        uint256
    ) {
        return (question, endTime, state, outcome, totalDeposits);
    }
}
