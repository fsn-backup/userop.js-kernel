import { ethers } from "ethers";
import { ERC4337, Kernel as KernelConst } from "../../constants";
import { UserOperationBuilder } from "../../builder";
import { BundlerJsonRpcProvider } from "../../provider";
import {
  EOASignature,
  estimateUserOperationGas,
  getGasPrice,
} from "../middleware";
import {
  EntryPoint,
  EntryPoint__factory,
  KernelFactory,
  KernelFactory__factory,
  Kernel as KernelImpl,
  Kernel__factory,
  Multisend,
  Multisend__factory,
} from "../../typechain";
import {
  IPresetBuilderOpts,
  ICall,
  UserOperationMiddlewareFn,
} from "../../types";
import { Safe } from "../../constants/safe";

enum Operation {
  Call,
  DelegateCall,
}

export class Kernel extends UserOperationBuilder {
  private signer: ethers.Signer;
  private provider: ethers.providers.JsonRpcProvider;
  private entryPoint: EntryPoint;
  private factory: KernelFactory;
  private kernelImpl: KernelImpl;
  private ECDSAValidator: string;
  private initCode: string;
  private multisend: Multisend;
  proxy: KernelImpl;

  private constructor(
    signer: ethers.Signer,
    rpcUrl: string,
    opts?: IPresetBuilderOpts
  ) {
    super();
    this.signer = signer;
    this.provider = new BundlerJsonRpcProvider(rpcUrl).setBundlerRpc(
      opts?.overrideBundlerRpc
    );
    this.entryPoint = EntryPoint__factory.connect(
      opts?.entryPoint || ERC4337.EntryPoint,
      this.provider
    );
    this.factory = KernelFactory__factory.connect(
      opts?.factory || "0x",
      this.provider
    );
    this.kernelImpl = Kernel__factory.connect(
      opts?.kernelImpl || "0x",
      this.provider
    );
    this.ECDSAValidator = opts?.ECDSAValidator || "0x";
    this.initCode = "0x";
    this.multisend = Multisend__factory.connect(
      ethers.constants.AddressZero,
      this.provider
    );
    this.proxy = Kernel__factory.connect(
      ethers.constants.AddressZero,
      this.provider
    );
  }

  private resolveAccount: UserOperationMiddlewareFn = async (ctx) => {
    ctx.op.nonce = await this.entryPoint.getNonce(ctx.op.sender, 0);
    ctx.op.initCode = ctx.op.nonce.eq(0) ? this.initCode : "0x";
  };

  private sudoMode: UserOperationMiddlewareFn = async (ctx) => {
    ctx.op.signature = ethers.utils.hexConcat([
      KernelConst.Modes.Sudo,
      ctx.op.signature,
    ]);
  };

  private enableMode: UserOperationMiddlewareFn = async (ctx) => {
    ctx.op.signature = ethers.utils.hexConcat([
      KernelConst.Modes.Enable,
      ctx.op.signature,
    ]);
  };

  public static async init(
    signer: ethers.Signer,
    rpcUrl: string,
    opts?: IPresetBuilderOpts
  ): Promise<Kernel> {
    const instance = new Kernel(signer, rpcUrl, opts);
    try {
      instance.initCode = ethers.utils.hexConcat([
        instance.factory.address,
        instance.factory.interface.encodeFunctionData("createAccount", [
          // KernelConst.KernelImpl,
          instance.kernelImpl.address,
          instance.proxy.interface.encodeFunctionData(
            "initialize",
            [
              // KernelConst.ECDSAValidator,
              instance.ECDSAValidator,
              await instance.signer.getAddress(),
            ]
          ),
          ethers.BigNumber.from(opts?.salt ?? 0),
        ]),
      ]);
      await instance.entryPoint.callStatic.getSenderAddress(instance.initCode);

      throw new Error("getSenderAddress: unexpected result");
    } catch (error: any) {
      const addr = error?.errorArgs?.sender;
      if (!addr) throw error;

      const chain = await instance.provider.getNetwork().then((n) => n.chainId);
      const ms = Safe.MultiSend[chain.toString()];
      // if (!ms)
      //   throw new Error(
      //     `Multisend contract not deployed on network: ${chain.toString()}`
      //   );
      // instance.multisend = Multisend__factory.connect(ms, instance.provider);
      instance.proxy = Kernel__factory.connect(addr, instance.provider);
    }
    // const modeGas = async (ctx:any) => {
    //   ctx.op.maxFeePerGas = ctx.op.maxFeePerGas*100;
    //   ctx.op.callGasLimit = ctx.op.callGasLimit*100;
    //   ctx.op.verificationGasLimit = ctx.op.verificationGasLimit*100;
    //   ctx.op.preVerificationGas = ctx.op.preVerificationGas*100;
    //   ctx.op.maxPriorityFeePerGas = ctx.op.maxPriorityFeePerGas*100;
    // };
    const base = instance
      .useDefaults({
        sender: instance.proxy.address,
        signature: ethers.utils.hexConcat([
          KernelConst.Modes.Sudo,
          await instance.signer.signMessage(
            ethers.utils.arrayify(ethers.utils.keccak256("0xdead"))
          ),
        ]),
      })
      .useMiddleware(instance.resolveAccount)
      .useMiddleware(getGasPrice(instance.provider));

    const withPM = opts?.paymasterMiddleware
      ? base.useMiddleware(opts.paymasterMiddleware)
      : base.useMiddleware(estimateUserOperationGas(instance.provider));

    return withPM
      // .useMiddleware(EOASignature(instance.signer))
      // .useMiddleware(instance.sudoMode)
      // .useMiddleware(modeGas)
  }

  execute(call: ICall) {
    return this.setCallData(
      this.proxy.interface.encodeFunctionData("execute", [
        call.to,
        call.value,
        call.data,
        Operation.Call,
      ])
    );
  }

  executeBatch(calls: Array<ICall>) {
    const data = this.multisend.interface.encodeFunctionData("multiSend", [
      ethers.utils.hexConcat(
        calls.map((c) =>
          ethers.utils.solidityPack(
            ["uint8", "address", "uint256", "uint256", "bytes"],
            [
              Operation.Call,
              c.to,
              c.value,
              ethers.utils.hexDataLength(c.data),
              c.data,
            ]
          )
        )
      ),
    ]);

    return this.setCallData(
      this.proxy.interface.encodeFunctionData("execute", [
        this.multisend.address,
        ethers.constants.Zero,
        data,
        Operation.DelegateCall,
      ])
    );
  }
}
