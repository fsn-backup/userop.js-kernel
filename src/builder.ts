import { BigNumberish, BytesLike, ethers } from "ethers";
import { OpToJSON } from "./utils";
import { UserOperationMiddlewareCtx } from "./context";
import {
  IUserOperation,
  IUserOperationBuilder,
  UserOperationMiddlewareFn,
} from "./types";
import {
  BundlerJsonRpcProvider
} from "../src";
import {
  encodeFunctionData,
  toBytes,
  concat,
  pad,
  toHex,
  keccak256,
  encodeAbiParameters,
  concatHex,
  zeroAddress,
  decodeFunctionData,
  isHex,
  hexToBigInt,
  getFunctionSelector,
  getContract
} from "viem";
import {
  getUserOperationHash,
  type Address,
  type Hex,
  type SmartAccountSigner,
  type UserOperationRequest,
  getChain,
  type SignTypedDataParams,
} from "@alchemy/aa-core";

export const DEFAULT_VERIFICATION_GAS_LIMIT = ethers.BigNumber.from(70000);
export const DEFAULT_CALL_GAS_LIMIT = ethers.BigNumber.from(35000);
export const DEFAULT_PRE_VERIFICATION_GAS = ethers.BigNumber.from(21000);

export const DEFAULT_USER_OP: IUserOperation = {
  sender: ethers.constants.AddressZero,
  nonce: ethers.constants.Zero,
  initCode: ethers.utils.hexlify("0x"),
  callData: ethers.utils.hexlify("0x"),
  callGasLimit: DEFAULT_CALL_GAS_LIMIT,
  verificationGasLimit: DEFAULT_VERIFICATION_GAS_LIMIT,
  preVerificationGas: DEFAULT_PRE_VERIFICATION_GAS,
  maxFeePerGas: ethers.constants.Zero,
  maxPriorityFeePerGas: ethers.constants.Zero,
  paymasterAndData: ethers.utils.hexlify("0x"),
  signature: ethers.utils.hexlify("0x"),
};

export class UserOperationBuilder implements IUserOperationBuilder {
  private defaultOp: IUserOperation;
  private currOp: IUserOperation;
  private middlewareStack: Array<UserOperationMiddlewareFn>;

  constructor() {
    this.defaultOp = { ...DEFAULT_USER_OP };
    this.currOp = { ...this.defaultOp };
    this.middlewareStack = [];
  }

  private resolveFields(op: Partial<IUserOperation>): Partial<IUserOperation> {
    const obj = {
      sender:
        op.sender !== undefined
          ? ethers.utils.getAddress(op.sender)
          : undefined,
      nonce:
        op.nonce !== undefined ? ethers.BigNumber.from(op.nonce) : undefined,
      initCode:
        op.initCode !== undefined
          ? ethers.utils.hexlify(op.initCode)
          : undefined,
      callData:
        op.callData !== undefined
          ? ethers.utils.hexlify(op.callData)
          : undefined,
      callGasLimit:
        op.callGasLimit !== undefined
          ? ethers.BigNumber.from(op.callGasLimit)
          : undefined,
      verificationGasLimit:
        op.verificationGasLimit !== undefined
          ? ethers.BigNumber.from(op.verificationGasLimit)
          : undefined,
      preVerificationGas:
        op.preVerificationGas !== undefined
          ? ethers.BigNumber.from(op.preVerificationGas)
          : undefined,
      maxFeePerGas:
        op.maxFeePerGas !== undefined
          ? ethers.BigNumber.from(op.maxFeePerGas)
          : undefined,
      maxPriorityFeePerGas:
        op.maxPriorityFeePerGas !== undefined
          ? ethers.BigNumber.from(op.maxPriorityFeePerGas)
          : undefined,
      paymasterAndData:
        op.paymasterAndData !== undefined
          ? ethers.utils.hexlify(op.paymasterAndData)
          : undefined,
      signature:
        op.signature !== undefined
          ? ethers.utils.hexlify(op.signature)
          : undefined,
    };
    return Object.keys(obj).reduce(
      (prev, curr) =>
        (obj as any)[curr] !== undefined
          ? { ...prev, [curr]: (obj as any)[curr] }
          : prev,
      {}
    );
  }

  getSender() {
    return this.currOp.sender;
  }
  getNonce() {
    return this.currOp.nonce;
  }
  getInitCode() {
    return this.currOp.initCode;
  }
  getCallData() {
    return this.currOp.callData;
  }
  getCallGasLimit() {
    return this.currOp.callGasLimit;
  }
  getVerificationGasLimit() {
    return this.currOp.verificationGasLimit;
  }
  getPreVerificationGas() {
    return this.currOp.preVerificationGas;
  }
  getMaxFeePerGas() {
    return this.currOp.maxFeePerGas;
  }
  getMaxPriorityFeePerGas() {
    return this.currOp.maxPriorityFeePerGas;
  }
  getPaymasterAndData() {
    return this.currOp.paymasterAndData;
  }
  getSignature() {
    return this.currOp.signature;
  }
  getOp() {
    return this.currOp;
  }

  setSender(val: string) {
    this.currOp.sender = ethers.utils.getAddress(val);
    return this;
  }
  setNonce(val: BigNumberish) {
    this.currOp.nonce = ethers.BigNumber.from(val);
    return this;
  }
  setInitCode(val: BytesLike) {
    this.currOp.initCode = ethers.utils.hexlify(val);
    return this;
  }
  setCallData(val: BytesLike) {
    this.currOp.callData = ethers.utils.hexlify(val);
    return this;
  }
  setCallGasLimit(val: BigNumberish) {
    this.currOp.callGasLimit = ethers.BigNumber.from(val);
    return this;
  }
  setVerificationGasLimit(val: BigNumberish) {
    this.currOp.verificationGasLimit = ethers.BigNumber.from(val);
    console.log("===667===", this.currOp.verificationGasLimit.toString())
    return this;
  }
  setPreVerificationGas(val: BigNumberish) {
    this.currOp.preVerificationGas = ethers.BigNumber.from(val);
    return this;
  }
  setMaxFeePerGas(val: BigNumberish) {
    this.currOp.maxFeePerGas = ethers.BigNumber.from(val);
    return this;
  }
  setMaxPriorityFeePerGas(val: BigNumberish) {
    this.currOp.maxPriorityFeePerGas = ethers.BigNumber.from(val);
    return this;
  }
  setPaymasterAndData(val: BytesLike) {
    this.currOp.paymasterAndData = ethers.utils.hexlify(val);
    return this;
  }
  setSignature(val: BytesLike) {
    this.currOp.signature = ethers.utils.hexlify(val);
    return this;
  }
  setPartial(partialOp: Partial<IUserOperation>) {
    this.currOp = { ...this.currOp, ...this.resolveFields(partialOp) };
    return this;
  }

  useDefaults(partialOp: Partial<IUserOperation>) {
    const resolvedOp = this.resolveFields(partialOp);
    this.defaultOp = { ...this.defaultOp, ...resolvedOp };
    this.currOp = { ...this.currOp, ...resolvedOp };

    return this;
  }
  resetDefaults() {
    this.defaultOp = { ...DEFAULT_USER_OP };
    return this;
  }

  useMiddleware(fn: UserOperationMiddlewareFn) {
    this.middlewareStack = [...this.middlewareStack, fn];
    return this;
  }
  resetMiddleware() {
    this.middlewareStack = [];
    return this;
  }

  async buildOp(entryPoint: string, chainId: BigNumberish) {
    const ctx = new UserOperationMiddlewareCtx(
      this.currOp,
      entryPoint,
      chainId
    );

    let i = 0
    for (const fn of this.middlewareStack) {
      if (i == 1 && ctx.op.paymasterAndData == "0x") {
        // paymaster
        const paymaster = "0x1fb73194C7Bf3C97b73683e1232804F092BA043E"   // need sign
        let paymasterSigner = "0x27E07d818f60B6dFDcf6F0E5b4AF7735467B13C5"
        const paymasterSignerPriv = "83ee04ec28cf6941d0a4161a6080074e5c9c056d48609c778f7a34df0decc247"

        const nodeRpcUrl = "http://88.99.94.109:3334"
        const bundlerUrl = "http://88.99.94.109:14337/"
        const provider = new BundlerJsonRpcProvider(nodeRpcUrl).setBundlerRpc(bundlerUrl);
        const paymasterSignerWallet = new ethers.Wallet(paymasterSignerPriv, provider);

        const validAfter = 1594068745;
        const validUntil = 1623012745;
        const SvalidAfter = 1594068745;
        const SvalidUntil = 1923012745;

        const paymasterABI = [
          {
            "inputs": [
              {
                "internalType": "contract IEntryPoint",
                "name": "_entryPoint",
                "type": "address"
              },
              {
                "internalType": "address",
                "name": "_verifyingSigner",
                "type": "address"
              }
            ],
            "stateMutability": "nonpayable",
            "type": "constructor"
          },
          {
            "anonymous": false,
            "inputs": [
              {
                "indexed": true,
                "internalType": "address",
                "name": "previousOwner",
                "type": "address"
              },
              {
                "indexed": true,
                "internalType": "address",
                "name": "newOwner",
                "type": "address"
              }
            ],
            "name": "OwnershipTransferred",
            "type": "event"
          },
          {
            "inputs": [
              {
                "internalType": "uint32",
                "name": "unstakeDelaySec",
                "type": "uint32"
              }
            ],
            "name": "addStake",
            "outputs": [],
            "stateMutability": "payable",
            "type": "function"
          },
          {
            "inputs": [],
            "name": "deposit",
            "outputs": [],
            "stateMutability": "payable",
            "type": "function"
          },
          {
            "inputs": [],
            "name": "entryPoint",
            "outputs": [
              {
                "internalType": "contract IEntryPoint",
                "name": "",
                "type": "address"
              }
            ],
            "stateMutability": "view",
            "type": "function"
          },
          {
            "inputs": [],
            "name": "getDeposit",
            "outputs": [
              {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
              }
            ],
            "stateMutability": "view",
            "type": "function"
          },
          {
            "inputs": [
              {
                "components": [
                  {
                    "internalType": "address",
                    "name": "sender",
                    "type": "address"
                  },
                  {
                    "internalType": "uint256",
                    "name": "nonce",
                    "type": "uint256"
                  },
                  {
                    "internalType": "bytes",
                    "name": "initCode",
                    "type": "bytes"
                  },
                  {
                    "internalType": "bytes",
                    "name": "callData",
                    "type": "bytes"
                  },
                  {
                    "internalType": "uint256",
                    "name": "callGasLimit",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "verificationGasLimit",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "preVerificationGas",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "maxFeePerGas",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "maxPriorityFeePerGas",
                    "type": "uint256"
                  },
                  {
                    "internalType": "bytes",
                    "name": "paymasterAndData",
                    "type": "bytes"
                  },
                  {
                    "internalType": "bytes",
                    "name": "signature",
                    "type": "bytes"
                  }
                ],
                "internalType": "struct UserOperation",
                "name": "userOp",
                "type": "tuple"
              },
              {
                "internalType": "uint48",
                "name": "validUntil",
                "type": "uint48"
              },
              {
                "internalType": "uint48",
                "name": "validAfter",
                "type": "uint48"
              }
            ],
            "name": "getHash",
            "outputs": [
              {
                "internalType": "bytes32",
                "name": "",
                "type": "bytes32"
              }
            ],
            "stateMutability": "view",
            "type": "function"
          },
          {
            "inputs": [],
            "name": "owner",
            "outputs": [
              {
                "internalType": "address",
                "name": "",
                "type": "address"
              }
            ],
            "stateMutability": "view",
            "type": "function"
          },
          {
            "inputs": [
              {
                "internalType": "bytes",
                "name": "paymasterAndData",
                "type": "bytes"
              }
            ],
            "name": "parsePaymasterAndData",
            "outputs": [
              {
                "internalType": "uint48",
                "name": "validUntil",
                "type": "uint48"
              },
              {
                "internalType": "uint48",
                "name": "validAfter",
                "type": "uint48"
              },
              {
                "internalType": "bytes",
                "name": "signature",
                "type": "bytes"
              }
            ],
            "stateMutability": "pure",
            "type": "function"
          },
          {
            "inputs": [
              {
                "internalType": "enum IPaymaster.PostOpMode",
                "name": "mode",
                "type": "uint8"
              },
              {
                "internalType": "bytes",
                "name": "context",
                "type": "bytes"
              },
              {
                "internalType": "uint256",
                "name": "actualGasCost",
                "type": "uint256"
              }
            ],
            "name": "postOp",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
          },
          {
            "inputs": [],
            "name": "renounceOwnership",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
          },
          {
            "inputs": [
              {
                "internalType": "address",
                "name": "newOwner",
                "type": "address"
              }
            ],
            "name": "transferOwnership",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
          },
          {
            "inputs": [],
            "name": "unlockStake",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
          },
          {
            "inputs": [
              {
                "components": [
                  {
                    "internalType": "address",
                    "name": "sender",
                    "type": "address"
                  },
                  {
                    "internalType": "uint256",
                    "name": "nonce",
                    "type": "uint256"
                  },
                  {
                    "internalType": "bytes",
                    "name": "initCode",
                    "type": "bytes"
                  },
                  {
                    "internalType": "bytes",
                    "name": "callData",
                    "type": "bytes"
                  },
                  {
                    "internalType": "uint256",
                    "name": "callGasLimit",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "verificationGasLimit",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "preVerificationGas",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "maxFeePerGas",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "maxPriorityFeePerGas",
                    "type": "uint256"
                  },
                  {
                    "internalType": "bytes",
                    "name": "paymasterAndData",
                    "type": "bytes"
                  },
                  {
                    "internalType": "bytes",
                    "name": "signature",
                    "type": "bytes"
                  }
                ],
                "internalType": "struct UserOperation",
                "name": "userOp",
                "type": "tuple"
              },
              {
                "internalType": "bytes32",
                "name": "userOpHash",
                "type": "bytes32"
              },
              {
                "internalType": "uint256",
                "name": "maxCost",
                "type": "uint256"
              }
            ],
            "name": "validatePaymasterUserOp",
            "outputs": [
              {
                "internalType": "bytes",
                "name": "context",
                "type": "bytes"
              },
              {
                "internalType": "uint256",
                "name": "validationData",
                "type": "uint256"
              }
            ],
            "stateMutability": "nonpayable",
            "type": "function"
          },
          {
            "inputs": [],
            "name": "verifyingSigner",
            "outputs": [
              {
                "internalType": "address",
                "name": "",
                "type": "address"
              }
            ],
            "stateMutability": "view",
            "type": "function"
          },
          {
            "inputs": [
              {
                "internalType": "address payable",
                "name": "withdrawAddress",
                "type": "address"
              }
            ],
            "name": "withdrawStake",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
          },
          {
            "inputs": [
              {
                "internalType": "address payable",
                "name": "withdrawAddress",
                "type": "address"
              },
              {
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256"
              }
            ],
            "name": "withdrawTo",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
          }
        ]

        const paymasterContract = new ethers.Contract(paymaster, paymasterABI, paymasterSignerWallet);
        let paymasterHash = await paymasterContract.getHash(ctx.op, SvalidUntil, validUntil)
        console.log("paymaster Op:", ctx.op)
        console.log("paymaster Op Hash:", paymasterHash)
        paymasterHash = ethers.utils.arrayify(paymasterHash);
        const paymasterSignature = await paymasterSignerWallet.signMessage(paymasterHash);
        console.log("paymasterSignature:", paymasterSignature)

        ctx.op.paymasterAndData = concatHex([
          paymaster as Hex,
          pad(toHex(SvalidUntil), { size: 32 }),
          pad(toHex(validUntil), { size: 32 }),
          paymasterSignature as Hex,
        ])
        console.log("paymaster and data: ", ctx.op.paymasterAndData)

        // test recover
        const msgHash = ethers.utils.hashMessage(paymasterHash);
        const recovered = ethers.utils.recoverAddress(msgHash, paymasterSignature);
        console.log("recovered: ", recovered, recovered == paymasterSigner)
      }

      // console.log("Enter fn: ", fn.toString())
      await fn(ctx);
      i++
    }

    this.setPartial(ctx.op);
    return OpToJSON(this.currOp);
  }

  resetOp() {
    this.currOp = { ...this.defaultOp };
    return this;
  }
}
