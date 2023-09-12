import { ethers } from "ethers";
import { UserOperationMiddlewareFn } from "../../types";

export const EOASignature =
  (signer: ethers.Signer): UserOperationMiddlewareFn =>
  async (ctx) => {
    console.log("Enter EOASignature")
    ctx.op.signature = await signer.signMessage(
      ethers.utils.arrayify(ctx.getUserOpHash())
    );
  };
