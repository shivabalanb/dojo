import { parseUnits } from "viem";
import { MOCK_USDC_ADDRESS, MockUSDCABI } from "./abis";

// Maximum uint256 value for infinite approval
export const MAX_UINT256 = BigInt(
  "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
);

// Check if user has sufficient allowance for a specific amount
export const checkAllowance = async (
  userAddress: `0x${string}`,
  spenderAddress: `0x${string}`,
  amount: bigint,
  readContract: any
) => {
  try {
    const allowance = await readContract({
      address: MOCK_USDC_ADDRESS,
      abi: MockUSDCABI,
      functionName: "allowance",
      args: [userAddress, spenderAddress],
    });

    return allowance >= amount;
  } catch (error) {
    console.error("Error checking allowance:", error);
    return false;
  }
};

// Check if user has infinite allowance
export const checkInfiniteAllowance = async (
  userAddress: `0x${string}`,
  spenderAddress: `0x${string}`,
  readContract: any
) => {
  return await checkAllowance(
    userAddress,
    spenderAddress,
    MAX_UINT256,
    readContract
  );
};

// Approve infinite USDC spending
export const approveInfiniteUSDC = async (
  spenderAddress: `0x${string}`,
  writeContract: any
) => {
  try {
    await writeContract({
      address: MOCK_USDC_ADDRESS,
      abi: MockUSDCABI,
      functionName: "approve",
      args: [spenderAddress, MAX_UINT256],
    });
    return true;
  } catch (error) {
    console.error("Error approving infinite USDC:", error);
    return false;
  }
};
