import { ethers } from "ethers";
import { IPaymasterOpts, UserOperationMiddlewareFn } from "../../types";
import { OpToJSON } from "../../utils";
import {
  pad,
  toHex,
  concatHex
} from "viem";
import {
  type Hex,
} from "@alchemy/aa-core";

// Assumes the paymaster interface in https://hackmd.io/@stackup/H1oIvV-qi
export const verifyingPaymaster =
  (ops: IPaymasterOpts): UserOperationMiddlewareFn =>
    async (ctx) => {
      console.log("Enter verifyingPaymaster")

      const paymasterRpc = ops.rpcUrl;
      const validAfter = ops.validAfter;
      const validUntil = ops.validUntil;

      const pProvider = new ethers.providers.JsonRpcProvider(paymasterRpc);
      const pm = (await pProvider.send("pm_sponsorUserOperation", [
        OpToJSON(ctx.op),
        ctx.entryPoint,
        ctx,
        validUntil,
        validAfter
      ]));

      ctx.op.paymasterAndData = concatHex([
        pm['paymaster'] as Hex,
        pad(toHex(validUntil), { size: 32 }),
        pad(toHex(validAfter), { size: 32 }),
        pm['paymasterSignature'] as Hex,
      ])
      return
    }


