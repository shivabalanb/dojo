// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IERC20} from "openzeppelin/token/ERC20/IERC20.sol";
import {SafeERC20} from "openzeppelin/token/ERC20/utils/SafeERC20.sol";
import {WadMath} from "./WadMath.sol";

contract LMSRMarket {
    using SafeERC20 for IERC20;

    IERC20 public immutable usdc; // 6 decimals
    string public title;
    string public question;
    uint256 public endTime;
    uint256 public b; // liquidity param in USDC units (6d)

    uint256 public qYes; // total YES shares (WAD 1e18)
    uint256 public qNo; // total NO  shares (WAD 1e18)
    mapping(address => uint256) public yesShares; // user shares (WAD)
    mapping(address => uint256) public noShares;

    enum Outcome {
        Unresolved,
        Yes,
        No
    }
    Outcome public outcome = Outcome.Unresolved;

    int256 constant LN2_WAD = 693_147_180_559_945_309; // ln(2) * 1e18

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

    /// @param _initialLiquidity USDC units (6d). b is auto-calculated as initialLiquidity / ln(2).
    constructor(
        address _usdc,
        string memory _title,
        string memory _q,
        uint256 _end,
        uint256 _initialLiquidity
    ) {
        require(_usdc != address(0), "usdc");
        require(_initialLiquidity > 0, "liquidity");
        require(_end > block.timestamp, "end");

        usdc = IERC20(_usdc);
        title = _title;
        question = _q;
        endTime = _end;

        // Auto-calculate b from initial liquidity: b = initialLiquidity / ln(2)
        // This ensures max loss = b * ln(2) = initialLiquidity
        b = (_initialLiquidity * 1e18) / uint256(LN2_WAD);

        // USDC will be transferred by the MarketFactory
        // start neutral: qYes = qNo = 0 → 50/50
    }

    // ---- stable LMSR cost: C(q) = b * ln(exp(qY/b)+exp(qN/b)) ----
    function _cost(uint256 qY, uint256 qN) internal view returns (uint256) {
        if (qY == 0 && qN == 0) return 0;
        // q/b in WAD: ( (q/1e18) / (b/1e6) ) * 1e18 = q*1e6 / b
        int256 ay = int256((qY * 1e6) / b);
        int256 an = int256((qN * 1e6) / b);
        int256 m = ay > an ? ay : an;
        int256 eY = WadMath.expWad(ay - m);
        int256 eN = WadMath.expWad(an - m);
        int256 ln = WadMath.lnWad(eY + eN) + m;
        // b (1e6) * ln (1e18) / 1e18 -> 1e6 (USDC)
        return (b * uint256(ln)) / 1e18;
    }

    // ---- prices (probabilities, WAD) ----
    function priceYes() public view returns (uint256) {
        int256 ay = int256((qYes * 1e6) / b);
        int256 an = int256((qNo * 1e6) / b);
        int256 m = ay > an ? ay : an;
        int256 eY = WadMath.expWad(ay - m);
        int256 eN = WadMath.expWad(an - m);
        return uint256((eY * 1e18) / (eY + eN));
    }
    function priceNo() public view returns (uint256) {
        return 1e18 - priceYes();
    }

    // ---- quotes (inputs: dQ WAD shares; outputs: USDC 6d) ----
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
        uint256 ONE_USDC = 1e6;
        if (outcome == Outcome.Yes) {
            uint256 u = yesShares[msg.sender];
            require(u > 0, "no win");
            yesShares[msg.sender] = 0;
            uint256 payout = (u * ONE_USDC) / 1e18; // 1 USDC per share
            usdc.safeTransfer(msg.sender, payout);
            emit Claimed(msg.sender, payout);
        } else {
            uint256 u = noShares[msg.sender];
            require(u > 0, "no win");
            noShares[msg.sender] = 0;
            uint256 payout = (u * ONE_USDC) / 1e18;
            usdc.safeTransfer(msg.sender, payout);
            emit Claimed(msg.sender, payout);
        }
    }

    function marketState() external view returns (uint8) {
        if (outcome != Outcome.Unresolved) return 2;
        if (block.timestamp < endTime) return 1;
        return 1;
    }
}
