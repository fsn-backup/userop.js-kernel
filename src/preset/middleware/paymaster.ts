import { ethers } from "ethers";
import { UserOperationMiddlewareFn } from "../../types";
import { OpToJSON } from "../../utils";

interface VerifyingPaymasterResult {
  paymasterAndData: string;
  preVerificationGas: string;
  verificationGasLimit: string;
  callGasLimit: string;
}

const DEFAULT_PRE_VERIFICATION_GAS = ethers.BigNumber.from(21000);
const DEFAULT_VERIFICATION_GAS_LIMIT = ethers.BigNumber.from(70000);

function multiplyHexString(hexString: string, factor: number): string {
  if (!hexString.startsWith("0x")) {
    throw new Error("Hex string must start with '0x'");
  }
  
  const decimalValue: number = parseInt(hexString.substring(2), 16);
  const multipliedDecimalValue: number = decimalValue * factor;
  
  return "0x" + multipliedDecimalValue.toString(16);
}
// Assumes the paymaster interface in https://hackmd.io/@stackup/H1oIvV-qi
export const verifyingPaymaster =
  (paymasterRpc: string, context: any): UserOperationMiddlewareFn =>
  async (ctx) => {
    ctx.op.verificationGasLimit = ethers.BigNumber.from(
      ctx.op.verificationGasLimit
    ).mul(3);
    console.log("===672===",ctx.op.verificationGasLimit)

    const provider = new ethers.providers.JsonRpcProvider(paymasterRpc);
    const pm = (await provider.send("pm_sponsorUserOperation", [
      OpToJSON(ctx.op),
      ctx.entryPoint,
      context,
    ])) as VerifyingPaymasterResult;

    ctx.op.paymasterAndData = pm.paymasterAndData;
    if (ctx.op.preVerificationGas.toString() == DEFAULT_PRE_VERIFICATION_GAS.toString()) {
      ctx.op.preVerificationGas = multiplyHexString(pm.preVerificationGas,1);
    }
    // ctx.op.preVerificationGas = pm.preVerificationGas;
    if (ctx.op.verificationGasLimit.toString() == DEFAULT_VERIFICATION_GAS_LIMIT.toString()) {
      ctx.op.verificationGasLimit = multiplyHexString(pm.verificationGasLimit,1);
      console.log("===670===",ctx.op.verificationGasLimit.toString())
    }
    // ctx.op.verificationGasLimit = pm.verificationGasLimit;
    ctx.op.callGasLimit = pm.callGasLimit;
  };
