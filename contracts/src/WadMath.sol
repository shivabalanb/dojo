// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @notice Minimal WAD math (1e18) with exp/ln for LMSR.
/// @dev Enough for priceYes/priceNo and cost() in the LMSR contract.
library WadMath {
    int256 internal constant WAD  = 1e18;
    uint256 internal constant UWAD = 1e18;

    function wmul(uint256 x, uint256 y) internal pure returns (uint256) {
        return (x * y) / UWAD;
    }

    function wdiv(uint256 x, uint256 y) internal pure returns (uint256) {
        return (x * UWAD) / y;
    }

    /// @notice e^(x/WAD) in WAD; adapted from PRB/Solmate style with range checks.
    function expWad(int256 x) internal pure returns (int256 r) {
        unchecked {
            // clamp domain (about [-42e18, +135e18])
            if (x <= -42139678854452767551) return 0;
            if (x >= 135305999368893231589) revert("exp overflow");

            // Scale by 2^k via ln(2) in 2^96 fixed-point (magic constant).
            int256 k = ((x * 0x1000000000000000000000000) / WAD) / int256(0xB17217F7D1CF79AB);
            x -= k * 0xB17217F7D1CF79AB / 0x1000000000000000000000000 * WAD;

            // 5th-order taylor around 0 (good enough for |x|<=~1)
            int256 y = x;
            int256 z = (y * y) / WAD;
            r = int256(WAD) + y + (z * int256(WAD) / (2 * int256(WAD)));
            int256 num = (y * z) / WAD;     // y^3
            r += num / 6;
            num = (num * z) / WAD;          // y^5
            r += num / 120;
            num = (num * z) / WAD;          // y^7
            r += num / 5040;

            if (k > 0)   r = int256(uint256(int256(r)) << uint256(k));
            else if (k < 0) r = int256(uint256(int256(r)) >> uint256(-k));
        }
    }

    /// @notice ln(x/WAD) in WAD; x>0.
    function lnWad(int256 x) internal pure returns (int256 r) {
        require(x > 0, "ln x<=0");
        unchecked {
            // normalize x to y in [1,2) * 2^k
            uint256 ux = uint256(x);
            int256 k = 0;
            while (ux >= 2e18) { ux >>= 1; k++; }
            while (ux <  1e18) { ux <<= 1; k--; }

            // y = ux/1e18 in [1,2); ln(y) via ln(1+z), z=y-1 in [-1,1)
            int256 z = int256(ux) - WAD;

            // 5-term alternating series
            int256 term = z;
            r = term;
            term = (term * (-z)) / WAD; r += term / 2;
            term = (term * (-z)) / WAD; r += term / 3;
            term = (term * (-z)) / WAD; r += term / 4;
            term = (term * (-z)) / WAD; r += term / 5;

            // add k*ln(2)
            r += k * 693_147_180_559_945_309; // ln(2)*1e18
        }
    }
}
