import { ethers } from "ethers";
import {
  UserOperationBuilder,
  DEFAULT_CALL_GAS_LIMIT,
  DEFAULT_VERIFICATION_GAS_LIMIT,
  DEFAULT_PRE_VERIFICATION_GAS,
  DEFAULT_USER_OP,
  UserOperationMiddlewareFn,
  Client,
  Presets,
  BundlerJsonRpcProvider
} from "./src";
import {
  EOASignature,
  estimateUserOperationGas,
  getGasPrice,
} from "./src/preset/middleware";
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
import { MerkleTree } from "merkletreejs";
import {
  getUserOperationHash,
  type Address,
  type Hex,
  type SmartAccountSigner,
  type UserOperationRequest,
  getChain,
  type SignTypedDataParams,
} from "@alchemy/aa-core";
import { kernelABI } from "./abi.kernel";
import { nftABI } from "./abi.nft";
import { UserOperationMiddlewareCtx } from "./src/context"

enum ParamCondition {
  EQUAL = 0,
  GREATER_THAN = 1,
  LESS_THAN = 2,
  GREATER_THAN_OR_EQUAL = 3,
  LESS_THAN_OR_EQUAL = 4,
  NOT_EQUAL = 5,
}
interface ParamRules {
  offset: number;
  condition: ParamCondition;
  param: Hex;
}
enum Operation {
  Call = 0,
  DelegateCall = 1,
}
interface Permission {
  target: Address;
  valueLimit: number;
  sig: Hex;
  rules: ParamRules[];
  operation: Operation;
}

function encodePermissionData(permission: Permission, merkleProof?: string[]): Hex {
  const permissionParam = {
    components: [
      {
        name: "target",
        type: "address",
      },
      {
        name: "valueLimit",
        type: "uint256",
      },
      {
        name: "sig",
        type: "bytes4",
      },
      {
        components: [
          {
            name: "offset",
            type: "uint256",
          },
          {
            internalType: "enum ParamCondition",
            name: "condition",
            type: "uint8",
          },
          {
            name: "param",
            type: "bytes32",
          },
        ],
        name: "rules",
        type: "tuple[]",
      },
      {
        internalType: "enum Operation",
        name: "operation",
        type: "uint8",
      },
    ],
    name: "permission",
    type: "tuple",
  };
  let params;
  let values;
  if (merkleProof) {
    params = [
      permissionParam,
      {
        name: "merkleProof",
        type: "bytes32[]",
      },
    ];
    values = [permission, merkleProof];
  } else {
    params = [permissionParam];
    values = [permission];
  }
  return encodeAbiParameters(params, values);
}

async function main() {

  let nodeRpcUrl = "http://88.99.94.109:3334"
  // let bundlerUrl = "http://88.99.94.109:14337/"

  // let nodeRpcUrl = "http://127.0.0.1:8545"
  let bundlerUrl = "http://127.0.0.1:14337"

  const entryPoint = "0xba0917DF35Cf6c7aE1CABf5e7bED9a904F725318";
  const paymaster = "0x1a256A0221b030A8A50Cb18966Ebdc4325a92D7F"

  const kernelFactory = "0x7EC94Ac7cb88967D5b56A90fcB88999BaD62A717";
  const kernelImpl = "0x8079A0A8b9aB9aAE7C99C47892f596aB25ddF632";
  const ECDSAValidator = "0xF10688BC56BD63C1c9A457c87b756C6AB2237975";
  const SessionKeyExecValidator = "0xd03ADB34D8388da06886F18626C5bB12a94aF06C";
  const SessionKeyOwnedValidator = "0xBb04C8477A4Bb093Ba49E7307487E66b7fC92856";


  const nftAddress = "0xf578642ff303398103930832B779cD35891eBa35"

  const target = "0x93356ED2567a40870B542820EA97f06C0DfFd50E"
  const value = ethers.utils.parseEther('0')
  const aaWalletSalt = "1"

  const userAddress = "0x9c19BEd96de9cFBb7aF3D16ae39967F4141078cC"
  const userPrivateKey = "4fa0dcbe0e0d89b3e75c0221b517cdc69edbea3c4d88bf01988f3e52a2989b0e"
  const userAA1Addr = "0x1991bC1C252134AcD08BFA05b0A6Df47394D6D85"

  // const sessionKeyAddr = "0x9F8Df84Ff8096C156bE988B29e358d5f6302ea8E"
  const sessionKeyPrive = "b37db4b8b4a195056c40d92df7a8ae757022925059bdaa065fcf83bf0bb1c639"
  const sessionKeyExecutor = "0xB5B2D6ab4aF3FB1C008d1933F8D0e3049e2d78Be"

  const serverAddr = "0xB5B2D6ab4aF3FB1C008d1933F8D0e3049e2d78Be"
  const serverPriv = "a01153107130534a21e9a4257e5670aed40a2c299f79b881c97e6d1a5a9f38a4"

  const sessionKeyAddr2 = "0x0459e4fa68BBDFb22CaB8eA0244C717e3cF18106"
  const sessionKeyPrive2 = "c262029d2024df67ff107b1c5ffce38f8883d0f4b2933352ef9fecca759c1321"

  const deployAddr = ""
  const deployPriv = "73b63e0d69dc8770eefdefbcc77d11dfb3ac6a9cb17d409d13af233f72476bdf"

  const receiveAddr = "0x33275cECEA5165f99e3128FF1899CBACe07C7d6C"

  let sessionKeyPriv = "0x67cd30131c9c79930cbd14a4e1c687358a4a0d1f0d49096192498a394ea46972"
  let sessionKeyAddr = "0xa10F17c5dB9C2eD693bCa462D9A1590f95DF0e22"
  // let sessionKeySigData = "0x11972eb4b60d4be19d7e2dd817199a51c15a5eb8aa7d90e54caedbdccaf9465a366808418c18ff0b174e28233ac6299a9a444124364289ca4a2344eb76e53d8a1b"

  let pageUserAddr = ""
  let pageUserPriv = "0x59c098d76886a06eaca4ccf5109021134bf94d24a458d1948431aa34be1b01e2"


  console.log("Starting client...")
  const client = await Client.init(nodeRpcUrl, {
    "entryPoint": entryPoint,
    "overrideBundlerRpc": bundlerUrl,
  });
  console.log("Client initialized");

  const provider = new BundlerJsonRpcProvider(nodeRpcUrl).setBundlerRpc(bundlerUrl);
  const serverWallet = new ethers.Wallet(serverPriv, provider);
  const userWallet = new ethers.Wallet(userPrivateKey, provider);
  const deployWallet = new ethers.Wallet(userPrivateKey, provider);
  const pageUserWallet = new ethers.Wallet(pageUserPriv, provider);
  const sessionKeyWallet = new ethers.Wallet(sessionKeyPriv, provider);

  console.log("Kernel initializing...");
  const kernel = await Presets.Builder.Kernel.init(
    userWallet,
    nodeRpcUrl,
    {
      "entryPoint": entryPoint,
      "factory": kernelFactory,
      "salt": aaWalletSalt,
      "overrideBundlerRpc": bundlerUrl,
      "kernelImpl": kernelImpl,
      "ECDSAValidator": ECDSAValidator,
    }
  );
  console.log("Kernel initialized");

  const address = kernel.getSender();
  console.log(`Kernel address: ${address}`);

  // const KernelContract = new ethers.Contract(
  //   userAA1Addr,
  //   kernelABI,
  //   provider
  // );

  // const NFTContract = new ethers.Contract(
  //   nftAddress,
  //   nftABI,
  //   provider
  // );

  // const call = {
  //   to: userAA1Addr,
  //   value: 0,
  //   data: KernelContract.interface.encodeFunctionData("execute", [
  //     nftAddress,
  //     0,
  //     NFTContract.interface.encodeFunctionData("safeMint", [userAA1Addr]),
  //     0
  //   ]),
  // };

  const call = {
    to: userAA1Addr,
    value: 0,
    data: "0x",
  };

  const sig = getFunctionSelector("mint(address)")
  const permissions: Permission[] = [
    {
      target: userAA1Addr as Hex,
      valueLimit: 0,
      sig: sig,
      operation: Operation.Call,
      rules: [
        {
          condition: ParamCondition.EQUAL,
          offset: 0,
          param: pad(sessionKeyExecutor as Hex, { size: 32 }),
        },
      ],
    },
  ];
  
  const validAfter = 1694068745;
  const validUntil = 1723012745;

  const sessionKeyData = {
    validAfter: validAfter,
    validUntil: validUntil,
    permissions,
    paymaster: paymaster
  }

  const validatorMode = "0x00000002"

  function getMerkleTree(): MerkleTree {
    const permissionPacked = sessionKeyData.permissions?.map(
      (permission) => encodePermissionData(permission)
    );
    if (permissionPacked?.length === 1)
      permissionPacked.push(permissionPacked[0]);

    return permissionPacked && permissionPacked.length !== 0
      ? new MerkleTree(permissionPacked, keccak256, {
        sortPairs: true,
        hashLeaves: true,
      })
      : new MerkleTree([pad("0x00", { size: 32 })], keccak256, {
        hashLeaves: false,
      });
  }

  const merkleTree = getMerkleTree()
  const enableData = concat([
    sessionKeyAddr as Hex,
    pad(merkleTree.getHexRoot() as Hex, { size: 32 }),
    pad(toHex(sessionKeyData.validAfter), { size: 6 }),
    pad(toHex(sessionKeyData.validUntil), { size: 6 }),
    paymaster,
  ])
  const enableDataLength = enableData.length / 2 - 1;

  const encodedPermissionData =
    sessionKeyData.permissions &&
      sessionKeyData.permissions.length !== 0 &&
      permissions
      ? encodePermissionData(permissions[0])
      : "0x";

  const merkleProof = merkleTree.getHexProof(
    keccak256(encodedPermissionData)
  );

  const encodedData =
    sessionKeyData.permissions &&
      sessionKeyData.permissions.length !== 0 &&
      permissions
      ? encodePermissionData(permissions[0], merkleProof)
      : "0x";

  let builder = kernel.execute(call)
    .setPaymasterAndData(paymaster)
  const userOp = await client.buildUserOperation(builder);


  console.log("======")

  let EntryPointAbi = [
    {
      inputs: [
        {
          internalType: "uint256",
          name: "preOpGas",
          type: "uint256"
        },
        {
          internalType: "uint256",
          name: "paid",
          type: "uint256"
        },
        {
          internalType: "uint48",
          name: "validAfter",
          type: "uint48"
        },
        {
          internalType: "uint48",
          name: "validUntil",
          type: "uint48"
        },
        {
          internalType: "bool",
          name: "targetSuccess",
          type: "bool"
        },
        {
          internalType: "bytes",
          name: "targetResult",
          type: "bytes"
        }
      ],
      name: "ExecutionResult",
      type: "error"
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "opIndex",
          type: "uint256"
        },
        {
          internalType: "string",
          name: "reason",
          type: "string"
        }
      ],
      name: "FailedOp",
      type: "error"
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "sender",
          type: "address"
        }
      ],
      name: "SenderAddressResult",
      type: "error"
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "aggregator",
          type: "address"
        }
      ],
      name: "SignatureValidationFailed",
      type: "error"
    },
    {
      inputs: [
        {
          components: [
            {
              internalType: "uint256",
              name: "preOpGas",
              type: "uint256"
            },
            {
              internalType: "uint256",
              name: "prefund",
              type: "uint256"
            },
            {
              internalType: "bool",
              name: "sigFailed",
              type: "bool"
            },
            {
              internalType: "uint48",
              name: "validAfter",
              type: "uint48"
            },
            {
              internalType: "uint48",
              name: "validUntil",
              type: "uint48"
            },
            {
              internalType: "bytes",
              name: "paymasterContext",
              type: "bytes"
            }
          ],
          internalType: "struct IEntryPoint.ReturnInfo",
          name: "returnInfo",
          type: "tuple"
        },
        {
          components: [
            {
              internalType: "uint256",
              name: "stake",
              type: "uint256"
            },
            {
              internalType: "uint256",
              name: "unstakeDelaySec",
              type: "uint256"
            }
          ],
          internalType: "struct IStakeManager.StakeInfo",
          name: "senderInfo",
          type: "tuple"
        },
        {
          components: [
            {
              internalType: "uint256",
              name: "stake",
              type: "uint256"
            },
            {
              internalType: "uint256",
              name: "unstakeDelaySec",
              type: "uint256"
            }
          ],
          internalType: "struct IStakeManager.StakeInfo",
          name: "factoryInfo",
          type: "tuple"
        },
        {
          components: [
            {
              internalType: "uint256",
              name: "stake",
              type: "uint256"
            },
            {
              internalType: "uint256",
              name: "unstakeDelaySec",
              type: "uint256"
            }
          ],
          internalType: "struct IStakeManager.StakeInfo",
          name: "paymasterInfo",
          type: "tuple"
        }
      ],
      name: "ValidationResult",
      type: "error"
    },
    {
      inputs: [
        {
          components: [
            {
              internalType: "uint256",
              name: "preOpGas",
              type: "uint256"
            },
            {
              internalType: "uint256",
              name: "prefund",
              type: "uint256"
            },
            {
              internalType: "bool",
              name: "sigFailed",
              type: "bool"
            },
            {
              internalType: "uint48",
              name: "validAfter",
              type: "uint48"
            },
            {
              internalType: "uint48",
              name: "validUntil",
              type: "uint48"
            },
            {
              internalType: "bytes",
              name: "paymasterContext",
              type: "bytes"
            }
          ],
          internalType: "struct IEntryPoint.ReturnInfo",
          name: "returnInfo",
          type: "tuple"
        },
        {
          components: [
            {
              internalType: "uint256",
              name: "stake",
              type: "uint256"
            },
            {
              internalType: "uint256",
              name: "unstakeDelaySec",
              type: "uint256"
            }
          ],
          internalType: "struct IStakeManager.StakeInfo",
          name: "senderInfo",
          type: "tuple"
        },
        {
          components: [
            {
              internalType: "uint256",
              name: "stake",
              type: "uint256"
            },
            {
              internalType: "uint256",
              name: "unstakeDelaySec",
              type: "uint256"
            }
          ],
          internalType: "struct IStakeManager.StakeInfo",
          name: "factoryInfo",
          type: "tuple"
        },
        {
          components: [
            {
              internalType: "uint256",
              name: "stake",
              type: "uint256"
            },
            {
              internalType: "uint256",
              name: "unstakeDelaySec",
              type: "uint256"
            }
          ],
          internalType: "struct IStakeManager.StakeInfo",
          name: "paymasterInfo",
          type: "tuple"
        },
        {
          components: [
            {
              internalType: "address",
              name: "aggregator",
              type: "address"
            },
            {
              components: [
                {
                  internalType: "uint256",
                  name: "stake",
                  type: "uint256"
                },
                {
                  internalType: "uint256",
                  name: "unstakeDelaySec",
                  type: "uint256"
                }
              ],
              internalType: "struct IStakeManager.StakeInfo",
              name: "stakeInfo",
              type: "tuple"
            }
          ],
          internalType: "struct IEntryPoint.AggregatorStakeInfo",
          name: "aggregatorInfo",
          type: "tuple"
        }
      ],
      name: "ValidationResultWithAggregation",
      type: "error"
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "bytes32",
          name: "userOpHash",
          type: "bytes32"
        },
        {
          indexed: true,
          internalType: "address",
          name: "sender",
          type: "address"
        },
        {
          indexed: false,
          internalType: "address",
          name: "factory",
          type: "address"
        },
        {
          indexed: false,
          internalType: "address",
          name: "paymaster",
          type: "address"
        }
      ],
      name: "AccountDeployed",
      type: "event"
    },
    {
      anonymous: false,
      inputs: [],
      name: "BeforeExecution",
      type: "event"
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "address",
          name: "account",
          type: "address"
        },
        {
          indexed: false,
          internalType: "uint256",
          name: "totalDeposit",
          type: "uint256"
        }
      ],
      name: "Deposited",
      type: "event"
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "address",
          name: "aggregator",
          type: "address"
        }
      ],
      name: "SignatureAggregatorChanged",
      type: "event"
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "address",
          name: "account",
          type: "address"
        },
        {
          indexed: false,
          internalType: "uint256",
          name: "totalStaked",
          type: "uint256"
        },
        {
          indexed: false,
          internalType: "uint256",
          name: "unstakeDelaySec",
          type: "uint256"
        }
      ],
      name: "StakeLocked",
      type: "event"
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "address",
          name: "account",
          type: "address"
        },
        {
          indexed: false,
          internalType: "uint256",
          name: "withdrawTime",
          type: "uint256"
        }
      ],
      name: "StakeUnlocked",
      type: "event"
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "address",
          name: "account",
          type: "address"
        },
        {
          indexed: false,
          internalType: "address",
          name: "withdrawAddress",
          type: "address"
        },
        {
          indexed: false,
          internalType: "uint256",
          name: "amount",
          type: "uint256"
        }
      ],
      name: "StakeWithdrawn",
      type: "event"
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "bytes32",
          name: "userOpHash",
          type: "bytes32"
        },
        {
          indexed: true,
          internalType: "address",
          name: "sender",
          type: "address"
        },
        {
          indexed: true,
          internalType: "address",
          name: "paymaster",
          type: "address"
        },
        {
          indexed: false,
          internalType: "uint256",
          name: "nonce",
          type: "uint256"
        },
        {
          indexed: false,
          internalType: "bool",
          name: "success",
          type: "bool"
        },
        {
          indexed: false,
          internalType: "uint256",
          name: "actualGasCost",
          type: "uint256"
        },
        {
          indexed: false,
          internalType: "uint256",
          name: "actualGasUsed",
          type: "uint256"
        }
      ],
      name: "UserOperationEvent",
      type: "event"
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "bytes32",
          name: "userOpHash",
          type: "bytes32"
        },
        {
          indexed: true,
          internalType: "address",
          name: "sender",
          type: "address"
        },
        {
          indexed: false,
          internalType: "uint256",
          name: "nonce",
          type: "uint256"
        },
        {
          indexed: false,
          internalType: "bytes",
          name: "revertReason",
          type: "bytes"
        }
      ],
      name: "UserOperationRevertReason",
      type: "event"
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "address",
          name: "account",
          type: "address"
        },
        {
          indexed: false,
          internalType: "address",
          name: "withdrawAddress",
          type: "address"
        },
        {
          indexed: false,
          internalType: "uint256",
          name: "amount",
          type: "uint256"
        }
      ],
      name: "Withdrawn",
      type: "event"
    },
    {
      inputs: [],
      name: "SIG_VALIDATION_FAILED",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256"
        }
      ],
      stateMutability: "view",
      type: "function"
    },
    {
      inputs: [
        {
          internalType: "bytes",
          name: "initCode",
          type: "bytes"
        },
        {
          internalType: "address",
          name: "sender",
          type: "address"
        },
        {
          internalType: "bytes",
          name: "paymasterAndData",
          type: "bytes"
        }
      ],
      name: "_validateSenderAndPaymaster",
      outputs: [],
      stateMutability: "view",
      type: "function"
    },
    {
      inputs: [
        {
          internalType: "uint32",
          name: "unstakeDelaySec",
          type: "uint32"
        }
      ],
      name: "addStake",
      outputs: [],
      stateMutability: "payable",
      type: "function"
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "account",
          type: "address"
        }
      ],
      name: "balanceOf",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256"
        }
      ],
      stateMutability: "view",
      type: "function"
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "account",
          type: "address"
        }
      ],
      name: "depositTo",
      outputs: [],
      stateMutability: "payable",
      type: "function"
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "",
          type: "address"
        }
      ],
      name: "deposits",
      outputs: [
        {
          internalType: "uint112",
          name: "deposit",
          type: "uint112"
        },
        {
          internalType: "bool",
          name: "staked",
          type: "bool"
        },
        {
          internalType: "uint112",
          name: "stake",
          type: "uint112"
        },
        {
          internalType: "uint32",
          name: "unstakeDelaySec",
          type: "uint32"
        },
        {
          internalType: "uint48",
          name: "withdrawTime",
          type: "uint48"
        }
      ],
      stateMutability: "view",
      type: "function"
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "account",
          type: "address"
        }
      ],
      name: "getDepositInfo",
      outputs: [
        {
          components: [
            {
              internalType: "uint112",
              name: "deposit",
              type: "uint112"
            },
            {
              internalType: "bool",
              name: "staked",
              type: "bool"
            },
            {
              internalType: "uint112",
              name: "stake",
              type: "uint112"
            },
            {
              internalType: "uint32",
              name: "unstakeDelaySec",
              type: "uint32"
            },
            {
              internalType: "uint48",
              name: "withdrawTime",
              type: "uint48"
            }
          ],
          internalType: "struct IStakeManager.DepositInfo",
          name: "info",
          type: "tuple"
        }
      ],
      stateMutability: "view",
      type: "function"
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "sender",
          type: "address"
        },
        {
          internalType: "uint192",
          name: "key",
          type: "uint192"
        }
      ],
      name: "getNonce",
      outputs: [
        {
          internalType: "uint256",
          name: "nonce",
          type: "uint256"
        }
      ],
      stateMutability: "view",
      type: "function"
    },
    {
      inputs: [
        {
          internalType: "bytes",
          name: "initCode",
          type: "bytes"
        }
      ],
      name: "getSenderAddress",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function"
    },
    {
      inputs: [
        {
          components: [
            {
              internalType: "address",
              name: "sender",
              type: "address"
            },
            {
              internalType: "uint256",
              name: "nonce",
              type: "uint256"
            },
            {
              internalType: "bytes",
              name: "initCode",
              type: "bytes"
            },
            {
              internalType: "bytes",
              name: "callData",
              type: "bytes"
            },
            {
              internalType: "uint256",
              name: "callGasLimit",
              type: "uint256"
            },
            {
              internalType: "uint256",
              name: "verificationGasLimit",
              type: "uint256"
            },
            {
              internalType: "uint256",
              name: "preVerificationGas",
              type: "uint256"
            },
            {
              internalType: "uint256",
              name: "maxFeePerGas",
              type: "uint256"
            },
            {
              internalType: "uint256",
              name: "maxPriorityFeePerGas",
              type: "uint256"
            },
            {
              internalType: "bytes",
              name: "paymasterAndData",
              type: "bytes"
            },
            {
              internalType: "bytes",
              name: "signature",
              type: "bytes"
            }
          ],
          internalType: "struct UserOperation",
          name: "userOp",
          type: "tuple"
        }
      ],
      name: "getUserOpHash",
      outputs: [
        {
          internalType: "bytes32",
          name: "",
          type: "bytes32"
        }
      ],
      stateMutability: "view",
      type: "function"
    },
    {
      inputs: [
        {
          components: [
            {
              components: [
                {
                  internalType: "address",
                  name: "sender",
                  type: "address"
                },
                {
                  internalType: "uint256",
                  name: "nonce",
                  type: "uint256"
                },
                {
                  internalType: "bytes",
                  name: "initCode",
                  type: "bytes"
                },
                {
                  internalType: "bytes",
                  name: "callData",
                  type: "bytes"
                },
                {
                  internalType: "uint256",
                  name: "callGasLimit",
                  type: "uint256"
                },
                {
                  internalType: "uint256",
                  name: "verificationGasLimit",
                  type: "uint256"
                },
                {
                  internalType: "uint256",
                  name: "preVerificationGas",
                  type: "uint256"
                },
                {
                  internalType: "uint256",
                  name: "maxFeePerGas",
                  type: "uint256"
                },
                {
                  internalType: "uint256",
                  name: "maxPriorityFeePerGas",
                  type: "uint256"
                },
                {
                  internalType: "bytes",
                  name: "paymasterAndData",
                  type: "bytes"
                },
                {
                  internalType: "bytes",
                  name: "signature",
                  type: "bytes"
                }
              ],
              internalType: "struct UserOperation[]",
              name: "userOps",
              type: "tuple[]"
            },
            {
              internalType: "contract IAggregator",
              name: "aggregator",
              type: "address"
            },
            {
              internalType: "bytes",
              name: "signature",
              type: "bytes"
            }
          ],
          internalType: "struct IEntryPoint.UserOpsPerAggregator[]",
          name: "opsPerAggregator",
          type: "tuple[]"
        },
        {
          internalType: "address payable",
          name: "beneficiary",
          type: "address"
        }
      ],
      name: "handleAggregatedOps",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function"
    },
    {
      inputs: [
        {
          components: [
            {
              internalType: "address",
              name: "sender",
              type: "address"
            },
            {
              internalType: "uint256",
              name: "nonce",
              type: "uint256"
            },
            {
              internalType: "bytes",
              name: "initCode",
              type: "bytes"
            },
            {
              internalType: "bytes",
              name: "callData",
              type: "bytes"
            },
            {
              internalType: "uint256",
              name: "callGasLimit",
              type: "uint256"
            },
            {
              internalType: "uint256",
              name: "verificationGasLimit",
              type: "uint256"
            },
            {
              internalType: "uint256",
              name: "preVerificationGas",
              type: "uint256"
            },
            {
              internalType: "uint256",
              name: "maxFeePerGas",
              type: "uint256"
            },
            {
              internalType: "uint256",
              name: "maxPriorityFeePerGas",
              type: "uint256"
            },
            {
              internalType: "bytes",
              name: "paymasterAndData",
              type: "bytes"
            },
            {
              internalType: "bytes",
              name: "signature",
              type: "bytes"
            }
          ],
          internalType: "struct UserOperation[]",
          name: "ops",
          type: "tuple[]"
        },
        {
          internalType: "address payable",
          name: "beneficiary",
          type: "address"
        }
      ],
      name: "handleOps",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function"
    },
    {
      inputs: [
        {
          internalType: "uint192",
          name: "key",
          type: "uint192"
        }
      ],
      name: "incrementNonce",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function"
    },
    {
      inputs: [
        {
          internalType: "bytes",
          name: "callData",
          type: "bytes"
        },
        {
          components: [
            {
              components: [
                {
                  internalType: "address",
                  name: "sender",
                  type: "address"
                },
                {
                  internalType: "uint256",
                  name: "nonce",
                  type: "uint256"
                },
                {
                  internalType: "uint256",
                  name: "callGasLimit",
                  type: "uint256"
                },
                {
                  internalType: "uint256",
                  name: "verificationGasLimit",
                  type: "uint256"
                },
                {
                  internalType: "uint256",
                  name: "preVerificationGas",
                  type: "uint256"
                },
                {
                  internalType: "address",
                  name: "paymaster",
                  type: "address"
                },
                {
                  internalType: "uint256",
                  name: "maxFeePerGas",
                  type: "uint256"
                },
                {
                  internalType: "uint256",
                  name: "maxPriorityFeePerGas",
                  type: "uint256"
                }
              ],
              internalType: "struct EntryPoint.MemoryUserOp",
              name: "mUserOp",
              type: "tuple"
            },
            {
              internalType: "bytes32",
              name: "userOpHash",
              type: "bytes32"
            },
            {
              internalType: "uint256",
              name: "prefund",
              type: "uint256"
            },
            {
              internalType: "uint256",
              name: "contextOffset",
              type: "uint256"
            },
            {
              internalType: "uint256",
              name: "preOpGas",
              type: "uint256"
            }
          ],
          internalType: "struct EntryPoint.UserOpInfo",
          name: "opInfo",
          type: "tuple"
        },
        {
          internalType: "bytes",
          name: "context",
          type: "bytes"
        }
      ],
      name: "innerHandleOp",
      outputs: [
        {
          internalType: "uint256",
          name: "actualGasCost",
          type: "uint256"
        }
      ],
      stateMutability: "nonpayable",
      type: "function"
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "",
          type: "address"
        },
        {
          internalType: "uint192",
          name: "",
          type: "uint192"
        }
      ],
      name: "nonceSequenceNumber",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256"
        }
      ],
      stateMutability: "view",
      type: "function"
    },
    {
      inputs: [
        {
          components: [
            {
              internalType: "address",
              name: "sender",
              type: "address"
            },
            {
              internalType: "uint256",
              name: "nonce",
              type: "uint256"
            },
            {
              internalType: "bytes",
              name: "initCode",
              type: "bytes"
            },
            {
              internalType: "bytes",
              name: "callData",
              type: "bytes"
            },
            {
              internalType: "uint256",
              name: "callGasLimit",
              type: "uint256"
            },
            {
              internalType: "uint256",
              name: "verificationGasLimit",
              type: "uint256"
            },
            {
              internalType: "uint256",
              name: "preVerificationGas",
              type: "uint256"
            },
            {
              internalType: "uint256",
              name: "maxFeePerGas",
              type: "uint256"
            },
            {
              internalType: "uint256",
              name: "maxPriorityFeePerGas",
              type: "uint256"
            },
            {
              internalType: "bytes",
              name: "paymasterAndData",
              type: "bytes"
            },
            {
              internalType: "bytes",
              name: "signature",
              type: "bytes"
            }
          ],
          internalType: "struct UserOperation",
          name: "op",
          type: "tuple"
        },
        {
          internalType: "address",
          name: "target",
          type: "address"
        },
        {
          internalType: "bytes",
          name: "targetCallData",
          type: "bytes"
        }
      ],
      name: "simulateHandleOp",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function"
    },
    {
      inputs: [
        {
          components: [
            {
              internalType: "address",
              name: "sender",
              type: "address"
            },
            {
              internalType: "uint256",
              name: "nonce",
              type: "uint256"
            },
            {
              internalType: "bytes",
              name: "initCode",
              type: "bytes"
            },
            {
              internalType: "bytes",
              name: "callData",
              type: "bytes"
            },
            {
              internalType: "uint256",
              name: "callGasLimit",
              type: "uint256"
            },
            {
              internalType: "uint256",
              name: "verificationGasLimit",
              type: "uint256"
            },
            {
              internalType: "uint256",
              name: "preVerificationGas",
              type: "uint256"
            },
            {
              internalType: "uint256",
              name: "maxFeePerGas",
              type: "uint256"
            },
            {
              internalType: "uint256",
              name: "maxPriorityFeePerGas",
              type: "uint256"
            },
            {
              internalType: "bytes",
              name: "paymasterAndData",
              type: "bytes"
            },
            {
              internalType: "bytes",
              name: "signature",
              type: "bytes"
            }
          ],
          internalType: "struct UserOperation",
          name: "userOp",
          type: "tuple"
        }
      ],
      name: "simulateValidation",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function"
    },
    {
      inputs: [],
      name: "unlockStake",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function"
    },
    {
      inputs: [
        {
          internalType: "address payable",
          name: "withdrawAddress",
          type: "address"
        }
      ],
      name: "withdrawStake",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function"
    },
    {
      inputs: [
        {
          internalType: "address payable",
          name: "withdrawAddress",
          type: "address"
        },
        {
          internalType: "uint256",
          name: "withdrawAmount",
          type: "uint256"
        }
      ],
      name: "withdrawTo",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function"
    }
    // {
    //     stateMutability: "payable",
    //     type: "receive"
    // }
  ]
//   const entryPointContract = getContract({
//     address: entryPoint,
//     abi: EntryPointAbi,
//     publicClient: userWallet
//   })
//   const entryPointContract = new ethers.Contract(entryPoint, EntryPointAbi, userWallet);
//   const tenderlyResult = await await entryPointContract.simulate.simulateValidation(userWallet, [
//     {
//         to: entryPoint,
//         data: encodeFunctionData({
//             abi: entryPointContract.abi,
//             functionName: "simulateValidation",
//             args: [userOperation]
//         })
//     },
//     "latest"
// ])

  const contract = new ethers.Contract(entryPoint, EntryPointAbi, userWallet);
  const userOpHash = await contract.getUserOpHash(userOp);
  // const r = await contract.simulateHandleOp(userOp, "0x0000000000000000000000000000000000000000", "0x");

  console.log("======", userOpHash)


  const hash = getUserOperationHash(
    {
      sender: userOp.sender as Address,
      nonce: userOp.nonce as Hex,
      initCode: userOp.initCode as Hex,
      callData: userOp.callData as Hex,
      callGasLimit: userOp.callGasLimit as Hex,
      verificationGasLimit: userOp.verificationGasLimit as Hex,
      preVerificationGas: userOp.preVerificationGas as Hex,
      maxFeePerGas: userOp.maxFeePerGas as Hex,
      maxPriorityFeePerGas: userOp.maxPriorityFeePerGas as Hex,
      paymasterAndData: userOp.paymasterAndData as Hex,
      signature: userOp.signature as Hex,
    },
    entryPoint,
    BigInt(6480001000)
  );
  console.log("userop:", userOp)
  console.log("user op hash", hash)

  let hash2 = new UserOperationMiddlewareCtx(
    userOp,
    entryPoint,
    6480001000
  ).getUserOpHash()
  console.log("hash2==hash:", hash2 == hash)

  const messageBytes = ethers.utils.arrayify(hash);
  let sessionKeySigData = await sessionKeyWallet.signMessage(messageBytes);
  console.log("sessionKeySigData", sessionKeySigData)

  const messageHash = ethers.utils.hashMessage(messageBytes);
  const recoveredAddress2 = ethers.utils.recoverAddress(messageHash, sessionKeySigData);
  console.log("recover addr=", recoveredAddress2, recoveredAddress2 == sessionKeyAddr)

  const sessionKeySig = concatHex([
    sessionKeyAddr as Hex,
    sessionKeySigData as Hex,
    encodedData,
  ]);
  console.log("sessionKeySig", sessionKeySig)


  let callData = kernel.proxy.interface.encodeFunctionData("execute", [
    call.to,
    call.value,
    call.data,
    Operation.Call,
  ])
  const enableSigHex = callData.slice(2, 2 + 8);
  const enableSig = Buffer.from(enableSigHex, 'hex');


  let domain = {
    name: "Kernel",
    version: "0.2.1",
    chainId: 6480001000,
    verifyingContract: address,
  }
  let types = {
    ValidatorApproved: [
      { name: "sig", type: "bytes4" },
      { name: "validatorData", type: "uint256" },
      { name: "executor", type: "address" },
      { name: "enableData", type: "bytes" },
    ]
  }
  let message = {
    sig: enableSig,
    validatorData: hexToBigInt(
      concatHex([
        pad(toHex(validUntil), { size: 6 }),
        pad(toHex(validAfter), { size: 6 }),
        SessionKeyOwnedValidator,
      ]),
      { size: 32 }
    ),
    executor: sessionKeyExecutor as Address,
    enableData: enableData,
  }
  let enableSignature = await userWallet._signTypedData(domain, types, message);
  console.log("enableSignature", enableSignature)

  // const messageHash = "0xea390646b28501008ee9b4c570c89b83d39749b731d196de116f5fc327503be2"
  // const recoveredAddress = ethers.utils.recoverAddress(messageHash, enableSignature);
  // console.log(recoveredAddress, recoveredAddress == userAddress)


  // const VALIDATOR_APPROVED_STRUCT_HASH = "0x3ce406685c1b3551d706d85a68afdaa49ac4e07b451ad9b8ff8b58c3ee964176";
  // const enableSigHex = callData.slice(2, 2+8); 
  // const enableSig = Buffer.from(enableSigHex, 'hex');
  // let signatureSlice1 = hexToBigInt(
  //   concatHex([
  //     pad(toHex(validUntil), { size: 6 }),
  //     pad(toHex(validAfter), { size: 6 }),
  //     SessionKeyOwnedValidator as Address,
  //   ]),
  //   { size: 32 }
  // )
  // console.log( concatHex([
  //   pad(toHex(validUntil), { size: 6 }),
  //   pad(toHex(validAfter), { size: 6 }),
  //   SessionKeyOwnedValidator,
  // ]),
  // { size: 32 })
  // const signatureSlice2 = sessionKeyExecutor as Address;
  // // const enableData = enableData;  

  // const keccakOfEnableData = ethers.utils.keccak256(enableData);

  // const abiCoder = new ethers.utils.AbiCoder();
  // const encoded = abiCoder.encode(
  //   ["bytes32", "bytes4", "uint256", "address", "bytes32"],
  //   [VALIDATOR_APPROVED_STRUCT_HASH, enableSig, ethers.BigNumber.from(signatureSlice1), ethers.utils.getAddress(signatureSlice2), keccakOfEnableData]
  // );
  // const enableDigest = ethers.utils.keccak256(encoded);
  // console.log("enableDigest", enableDigest)
  // console.log("sig", enableSig)
  // console.log("sig2,",signatureSlice1)
  // console.log("sig3,",signatureSlice2)
  // console.log("sig4,",keccakOfEnableData)

  // const enableDigest = "0xea390646b28501008ee9b4c570c89b83d39749b731d196de116f5fc327503be2"
  // const messageBytes = ethers.utils.toUtf8Bytes(enableDigest);
  // let enableSignature = await userWallet.signMessage(messageBytes);
  // console.log("enableSignature", enableSignature)
  // const recoveredAddress2 = ethers.utils.recoverAddress(messageHash, enableSignature);

  const enableSigLength = enableSignature.length / 2 - 1;

  let signature = concatHex([
    validatorMode,
    // pad(toHex(2), { size: 4 }),
    pad(toHex(validUntil), { size: 6 }), // 6 bytes 4 - 10
    pad(toHex(validAfter), { size: 6 }), // 6 bytes 10 - 16
    pad(SessionKeyOwnedValidator, { size: 20 }), // 20 bytes 16 - 36
    pad(sessionKeyExecutor as Hex, { size: 20 }), // 20 bytes 36 - 56
    pad(toHex(enableDataLength), { size: 32 }),
    enableData,
    pad(toHex(enableSigLength), { size: 32 }),
    enableSignature as Hex,
    sessionKeySig as Hex,
  ]);
  console.log("signature", signature)
  console.log("enable sig length", enableSigLength, "offset", 4 + 6 + 6 + 20 + 20 + 32 + enableDataLength + 32)
  console.log("signature length", signature.length/2-1)
  console.log("sessionKeySig length", sessionKeySig.length/2-1)


  builder = builder
    // .setPreVerificationGas(userOp.preVerificationGas)
    // .setVerificationGasLimit(userOp.verificationGasLimit)
    .setPaymasterAndData(paymaster)
    .setSignature(signature)
  console.log("Builder initialized")

  userOp.signature = signature;
  const res = await client.sendUserOperation(
    builder,
    {
      onBuild: (op) => console.log("Signed UserOperation:", op),
      dryRun: false
    }
  );
  console.log(`UserOpHash: ${res.userOpHash}`);
  console.log(res.userOpHash == hash)

  const receipt = await res.wait();
  console.log(`receipt: ${receipt?.transactionHash}`);
}

main()
  .then(() => {
    console.log('Main function completed.');
  })
  .catch((error) => {
    console.error(`An error occurred: ${error}`);
  });

