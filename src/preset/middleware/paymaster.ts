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
      console.log("Enter verifyingPaymaster")

      // const validAfter = 1594068745;
      // const validUntil = 1623012745;
      // const SvalidAfter = 1594068745;
      // const SvalidUntil = 1923012745;

      // const paymasterUrl = "http://88.99.94.109:14339/paymaster"
      // const pProvider = new ethers.providers.JsonRpcProvider(paymasterRpc);
      // const pm = (await pProvider.send("pm_sponsorUserOperation", [
      //   OpToJSON(ctx.op),
      //   ctx.entryPoint,
      //   ctx,
      //   SvalidUntil,
      //   validUntil
      // ]));
      // // console.log("pm: ", pm)

      // ctx.op.paymasterAndData = concatHex([
      //   pm['paymaster'] as Hex,
      //   pad(toHex(SvalidUntil), { size: 32 }),
      //   pad(toHex(validUntil), { size: 32 }),
      //   pm['paymasterSignature'] as Hex,
      // ])
    }


