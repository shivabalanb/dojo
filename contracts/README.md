## Foundry

**Foundry is a blazing fast, portable and modular toolkit for Ethereum application development written in Rust.**

Foundry consists of:

- **Forge**: Ethereum testing framework (like Truffle, Hardhat and DappTools).
- **Cast**: Swiss army knife for interacting with EVM smart contracts, sending transactions and getting chain data.
- **Anvil**: Local Ethereum node, akin to Ganache, Hardhat Network.
- **Chisel**: Fast, utilitarian, and verbose solidity REPL.

## Documentation

https://book.getfoundry.sh/

## Usage

### Build

```shell
$ forge build
```

### Test

```shell
$ forge test
```

### Format

```shell
$ forge fmt
```

### Gas Snapshots

```shell
$ forge snapshot
```

### Anvil

```shell
$ anvil
```

### Deploy

```shell
$ forge script script/Counter.s.sol:CounterScript --rpc-url <your_rpc_url> --private-key <your_private_key>
```

### Cast

```shell
$ cast <subcommand>
```

### Help

```shell
$ forge --help
$ anvil --help
$ cast --help
```

✅ Stable Log-Sum-Exp Trick:
Uses max(aY, aN) shift to prevent overflow/underflow
exp(ay-m) and exp(an-m) are in [0, 1] range
At least one exponential is always 1, ensuring sum > 0
✅ Robust Price Calculation:
Same max-shift technique for stable pricing
Denominator guaranteed ≥ 1, preventing division issues
Prices always sum to 1e18 (100%)
✅ Enhanced Quote Functions:
Proper bounds checking for sell operations
Monotonic cost functions (c1 ≤ c0 for sells)
Clear error messages for invalid inputs
✅ Trading Safety Guards:
Dust protection: require(costWei > 0, "dust")
Overflow protection via Solidity 0.8+ checks
Compact, gas-efficient code
✅ Claim Function Protection:
Divide-by-zero guards: require(qYes > 0, "no winners")
Handles edge case where no one has winning shares
Safe payout calculations
✅ Robust Math Library:
Full-range expWad/lnWad with proper range checks
Handles edge cases and overflow conditions
Production-ready mathematical precision
🧪 Test Results:
verified
�� Key Benefits:
Mathematical Stability: No more overflow/underflow issues
Gas Efficiency: Optimized for small markets and frequent trading
User Safety: Dust protection and proper error handling
Production Ready: Handles edge cases and extreme scenarios
True LMSR: Constant liquidity with proper exponential pricing
�� Example Output:
)
The contract now provides:
Stable pricing even with extreme share imbalances
Safe trading with dust protection and overflow guards
Robust claims with divide-by-zero protection
True LMSR behavior with constant liquidity
Your LMSR implementation is now production-ready and much more robust than the initial version! 🎯
