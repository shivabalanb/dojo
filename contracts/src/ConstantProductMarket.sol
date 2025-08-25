// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IERC20} from "openzeppelin/token/ERC20/IERC20.sol";
import {SafeERC20} from "openzeppelin/token/ERC20/utils/SafeERC20.sol";

contract ConstantProductMarket {
    using SafeERC20 for IERC20;

    IERC20 public immutable usdc; // 6 decimals
    string public title;
    string public question;
    uint256 public endTime;
    uint256 public k; // liquidity parameter in USDC units (6d)

    // Scaling factor to make shares proportional to liquidity
    // This allows for reasonable price movements with low liquidity
    uint256 public immutable shareScale;
    uint256 public qYes; // total YES shares (scaled units)
    uint256 public qNo; // total NO shares (scaled units)

    mapping(address => uint256) public yesShares;
    mapping(address => uint256) public noShares;

    enum MarketState {
        Open,
        Resolved,
        Expired
    }

    enum Outcome {
        Unresolved,
        Yes,
        No
    }
    Outcome public outcome = Outcome.Unresolved;

    event Buy(address indexed user, bool yes, uint256 dQ, uint256 costUSDC);
    event Sell(address indexed user, bool yes, uint256 dQ, uint256 refundUSDC);
    event Resolved(Outcome o);
    event Claimed(address indexed user, uint256 amountUSDC);

    modifier active() {
        require(
            outcome == Outcome.Unresolved && block.timestamp < endTime,
            "closed"
        );
        _;
    }

    /// @param _initialLiquidity USDC units (6d). This becomes the liquidity parameter k.
    constructor(
        address _usdc,
        string memory _title,
        string memory _question,
        uint256 _end,
        uint256 _initialLiquidity
    ) {
        require(_usdc != address(0), "usdc");
        require(_initialLiquidity > 0, "liquidity");
        require(_end > block.timestamp, "end");

        usdc = IERC20(_usdc);
        title = _title;
        question = _question;
        endTime = _end;

        // Use initialLiquidity directly as the liquidity parameter k
        // This makes the market behave like a constant product AMM
        k = _initialLiquidity;

        // Calculate share scale to make shares much smaller
        // Use a much smaller scale to allow reasonable price movements
        shareScale = 1e6; // 1e6 units = 1 USDC worth of shares

        // USDC will be transferred by the MarketFactory
        // start neutral: qYes = qNo = 0 → 50/50
    }

    // ---- Constant Product AMM (like Polymarket) ----
    function _cost(uint256 qY, uint256 qN) internal view returns (uint256) {
        if (qY == 0 && qN == 0) return 0;

        // Use constant product formula: (qY + k) * (qN + k) = k^2
        // Where k is the initial liquidity parameter
        // This provides smooth price movements like Polymarket
        uint256 k_param = k; // k is in USDC units (6 decimals)

        // Cost = sqrt((qY + k) * (qN + k)) - k
        uint256 term1 = qY + k_param;
        uint256 term2 = qN + k_param;
        uint256 product = term1 * term2;
        uint256 sqrt = _sqrt(product);
        return sqrt > k_param ? sqrt - k_param : 0;
    }

    // ---- prices (probabilities, WAD) ----
    function priceYes() public view returns (uint256) {
        if (qYes == 0 && qNo == 0) return 0.5e18; // 50% when no shares

        // Constant product pricing: YES probability = (qY + k) / (qY + qN + 2k)
        uint256 k_param = k; // k is in USDC units (6 decimals)
        return ((qYes + k_param) * 1e18) / (qYes + qNo + 2 * k_param);
    }
    function priceNo() public view returns (uint256) {
        return 1e18 - priceYes();
    }

    // ---- quotes (inputs: dQ scaled units; outputs: USDC 6d) ----
    function quoteBuyYes(uint256 dQ) external view returns (uint256) {
        require(dQ > 0, "dQ");
        return _cost(qYes + dQ, qNo) - _cost(qYes, qNo);
    }
    function quoteBuyNo(uint256 dQ) external view returns (uint256) {
        require(dQ > 0, "dQ");
        return _cost(qYes, qNo + dQ) - _cost(qYes, qNo);
    }
    function quoteSellYes(uint256 dQ) external view returns (uint256) {
        require(dQ > 0 && dQ <= qYes, "dQ");
        return _cost(qYes, qNo) - _cost(qYes - dQ, qNo);
    }
    function quoteSellNo(uint256 dQ) external view returns (uint256) {
        require(dQ > 0 && dQ <= qNo, "dQ");
        return _cost(qYes, qNo) - _cost(qYes, qNo - dQ);
    }

    // ---- trading (USDC transfers) ----
    function buyYes(uint256 dQ) external active {
        require(dQ > 0, "dQ");
        uint256 cost = _cost(qYes + dQ, qNo) - _cost(qYes, qNo);
        require(cost > 0, "dust");
        usdc.safeTransferFrom(msg.sender, address(this), cost);
        qYes += dQ;
        yesShares[msg.sender] += dQ;
        emit Buy(msg.sender, true, dQ, cost);
    }
    function buyNo(uint256 dQ) external active {
        require(dQ > 0, "dQ");
        uint256 cost = _cost(qYes, qNo + dQ) - _cost(qYes, qNo);
        require(cost > 0, "dust");
        usdc.safeTransferFrom(msg.sender, address(this), cost);
        qNo += dQ;
        noShares[msg.sender] += dQ;
        emit Buy(msg.sender, false, dQ, cost);
    }
    function sellYes(uint256 dQ) external active {
        require(dQ > 0 && dQ <= yesShares[msg.sender], "shares");
        uint256 refund = _cost(qYes, qNo) - _cost(qYes - dQ, qNo);
        yesShares[msg.sender] -= dQ;
        qYes -= dQ;
        usdc.safeTransfer(msg.sender, refund);
        emit Sell(msg.sender, true, dQ, refund);
    }
    function sellNo(uint256 dQ) external active {
        require(dQ > 0 && dQ <= noShares[msg.sender], "shares");
        uint256 refund = _cost(qYes, qNo) - _cost(qYes, qNo - dQ);
        noShares[msg.sender] -= dQ;
        qNo -= dQ;
        usdc.safeTransfer(msg.sender, refund);
        emit Sell(msg.sender, false, dQ, refund);
    }

    // ---- resolve & $1-per-share claim ----
    function resolve(Outcome o) external {
        require(block.timestamp >= endTime, "not ended");
        require(outcome == Outcome.Unresolved, "resolved");
        require(o == Outcome.Yes || o == Outcome.No, "bad");
        outcome = o;
        emit Resolved(o);
    }
    function claim() external {
        require(outcome != Outcome.Unresolved, "unresolved");

        if (outcome == Outcome.Yes) {
            uint256 u = yesShares[msg.sender];
            require(u > 0, "no win");
            yesShares[msg.sender] = 0;

            // Total payout from all remaining liquidity (proportional to shares)
            uint256 remainingLiquidity = usdc.balanceOf(address(this));
            uint256 totalYesShares = qYes;
            uint256 payout = 0;

            if (remainingLiquidity > 0 && totalYesShares > 0) {
                payout = (u * remainingLiquidity) / totalYesShares;
            }

            usdc.safeTransfer(msg.sender, payout);
            emit Claimed(msg.sender, payout);
        } else {
            uint256 u = noShares[msg.sender];
            require(u > 0, "no win");
            noShares[msg.sender] = 0;

            // Total payout from all remaining liquidity (proportional to shares)
            uint256 remainingLiquidity = usdc.balanceOf(address(this));
            uint256 totalNoShares = qNo;
            uint256 payout = 0;

            if (remainingLiquidity > 0 && totalNoShares > 0) {
                payout = (u * remainingLiquidity) / totalNoShares;
            }

            usdc.safeTransfer(msg.sender, payout);
            emit Claimed(msg.sender, payout);
        }
    }

    // Compact metadata view for frontends
    // Returns (endTime, outcome, marketState, title, question)
    function meta()
        external
        view
        returns (uint256, Outcome, MarketState, string memory, string memory)
    {
        MarketState st;
        if (outcome != Outcome.Unresolved) st = MarketState.Resolved;
        else if (block.timestamp < endTime) st = MarketState.Open;
        else st = MarketState.Expired;
        return (endTime, outcome, st, title, question);
    }

    // ---- Helper function for square root ----
    function _sqrt(uint256 x) internal pure returns (uint256) {
        if (x == 0) return 0;

        uint256 z = (x + 1) / 2;
        uint256 y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
        return y;
    }
}
