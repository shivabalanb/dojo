// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract Market {
    enum Outcome {
        Unresolved,
        Yes,
        No
    }

    Outcome public outcome = Outcome.Unresolved;
    uint256 public endTime;
    address public resolver;

    uint256 public yesPool;
    uint256 public noPool;
    mapping(address => uint256) public yesStake;
    mapping(address => uint256) public noStake;

    modifier onlyOpen() {
        require(outcome == Outcome.Unresolved && block.timestamp < endTime, "closed");
        _;
    }

    modifier onlyResolver() {
        require(msg.sender == resolver, "resolver only");
        _;
    }

    constructor(uint256 _endTime, address _resolver) {
        endTime = _endTime;
        resolver = _resolver;
    }

    // users choose a side
    function buyYes() external payable onlyOpen {
        require(msg.value > 0, "no value");
        yesStake[msg.sender] += msg.value;
        yesPool += msg.value;
    }

    function buyNo() external payable onlyOpen {
        require(msg.value > 0, "no value");
        noStake[msg.sender] += msg.value;
        noPool += msg.value;
    }

    function resolve(Outcome o) external onlyResolver {
        require(outcome == Outcome.Unresolved, "already");
        require(block.timestamp >= endTime, "too early");
        require(o == Outcome.Yes || o == Outcome.No, "bad");
        outcome = o;
    }

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
