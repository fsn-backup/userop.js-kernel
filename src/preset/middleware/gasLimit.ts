import { BigNumberish, BytesLike, ethers } from "ethers";
import { OpToJSON } from "../../utils";
import { UserOperationMiddlewareFn } from "../../types";
import { Builder } from "..";

interface GasEstimate {
  preVerificationGas: BigNumberish;
  verificationGasLimit: BigNumberish;
  callGasLimit: BigNumberish;

  // TODO: remove this with EntryPoint v0.7
  verificationGas: BigNumberish;
}

const estimateCreationGas = async (
  provider: ethers.providers.JsonRpcProvider,
  initCode: BytesLike
): Promise<ethers.BigNumber> => {
  const initCodeHex = ethers.utils.hexlify(initCode);
  const factory = initCodeHex.substring(0, 42);
  const callData = "0x" + initCodeHex.substring(42);
  return await provider.estimateGas({
    to: factory,
    data: callData,
  });
};

export const DEFAULT_VERIFICATION_GAS_LIMIT = ethers.BigNumber.from(70000);

export const estimateUserOperationGas =
  (provider: ethers.providers.JsonRpcProvider): UserOperationMiddlewareFn =>
  async (ctx) => {
    let c = ctx.op.verificationGasLimit.toString() == DEFAULT_VERIFICATION_GAS_LIMIT.toString() ||  ctx.op.verificationGasLimit.toString() == "232400"
    // if (ethers.BigNumber.from(ctx.op.nonce).isZero() || c) {
    //   ctx.op.verificationGasLimit = ethers.BigNumber.from(
    //     ctx.op.verificationGasLimit
    //   ).add(await estimateCreationGas(provider, ctx.op.initCode));
    //   console.log("===673===",ctx.op.verificationGasLimit)
    // }


    const est = (await provider.send("eth_estimateUserOperationGas", [
      OpToJSON(ctx.op),
      ctx.entryPoint,
    ])) as GasEstimate;

    if (ctx.op.verificationGasLimit.toString() == DEFAULT_VERIFICATION_GAS_LIMIT.toString() ||  ctx.op.verificationGasLimit.toString() == "232400") {
      ctx.op.verificationGasLimit = ethers.BigNumber.from(est.verificationGasLimit).mul(ethers.BigNumber.from("2"))
      console.log("===671===",ctx.op.verificationGasLimit)
    }
    // ctx.op.verificationGasLimit = est.verificationGasLimit ?? est.verificationGas;
  };
