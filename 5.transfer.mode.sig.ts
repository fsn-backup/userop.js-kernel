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

function bytesToBase64(bytes: Uint8Array) {
  const binString = Array.from(bytes, (x) => String.fromCodePoint(x)).join("");
  return btoa(binString);
}

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
  let bundlerUrl = "http://88.99.94.109:14337/"

  const entryPoint = "0xba0917DF35Cf6c7aE1CABf5e7bED9a904F725318";
  const paymaster = "0x1a256A0221b030A8A50Cb18966Ebdc4325a92D7F"

  const kernelFactory = "0xdc5cA28bCF1AFA47Be5046C59B33B0C9D82118D0";
  const kernelAddress = "0x687A090a558EF6720Cf58E575542160178BFd500"
  const ECDSAValidatorAddress = "0x31D2477bA6938687fB88E11cBe14b14489d7F964"
  const SessionKeyExecValidator = "0x54aB5016A0ca2Bc8BeD7dbc77dF78eF9E9E2FfC6"
  const SessionKeyOwnedValidator = "0x289017d277d1dE238Bc14989824DDc95a793a017"

  const nftAddress = "0xf578642ff303398103930832B779cD35891eBa35"

  const target = "0x93356ED2567a40870B542820EA97f06C0DfFd50E"
  const value = ethers.utils.parseEther('0')
  const aaWalletSalt = "1"

  const selfAddress = "0x4d1a37b9614D24fE6Eb2c4CA5d3C8Cbc9da85e16"
  const privKey = "73b63e0d69dc8770eefdefbcc77d11dfb3ac6a9cb17d409d13af233f72476bdf"

  const sessionKeyAddr = selfAddress
  const executor = selfAddress


  console.log("Starting client...")
  const client = await Client.init(nodeRpcUrl, {
    "entryPoint": entryPoint,
    "overrideBundlerRpc": bundlerUrl,
  });
  console.log("Client initialized");

  const provider = new BundlerJsonRpcProvider(nodeRpcUrl).setBundlerRpc(bundlerUrl);
  const wallet = new ethers.Wallet(privKey, provider);

  console.log("Kernel initializing...");
  const kernel = await Presets.Builder.Kernel.init(
    wallet,
    nodeRpcUrl,
    {
      "entryPoint": entryPoint,
      "factory": kernelFactory,
      "salt": aaWalletSalt,
      "overrideBundlerRpc": bundlerUrl,
    }
  );
  console.log("Kernel initialized");

  const address = kernel.getSender();
  console.log(`Kernel address: ${address}`);

  let abi = [
    {
      "inputs": [
        {
          "internalType": "contract IEntryPoint",
          "name": "_entryPoint",
          "type": "address"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "constructor"
    },
    {
      "inputs": [],
      "name": "AlreadyInitialized",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "DisabledMode",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "NotAuthorizedCaller",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "NotEntryPoint",
      "type": "error"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "oldValidator",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "newValidator",
          "type": "address"
        }
      ],
      "name": "DefaultValidatorChanged",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "bytes4",
          "name": "selector",
          "type": "bytes4"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "executor",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "validator",
          "type": "address"
        }
      ],
      "name": "ExecutionChanged",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "newImplementation",
          "type": "address"
        }
      ],
      "name": "Upgraded",
      "type": "event"
    },
    {
      "stateMutability": "payable",
      "type": "fallback"
    },
    {
      "inputs": [
        {
          "internalType": "bytes4",
          "name": "_disableFlag",
          "type": "bytes4"
        }
      ],
      "name": "disableMode",
      "outputs": [],
      "stateMutability": "payable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "eip712Domain",
      "outputs": [
        {
          "internalType": "bytes1",
          "name": "fields",
          "type": "bytes1"
        },
        {
          "internalType": "string",
          "name": "name",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "version",
          "type": "string"
        },
        {
          "internalType": "uint256",
          "name": "chainId",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "verifyingContract",
          "type": "address"
        },
        {
          "internalType": "bytes32",
          "name": "salt",
          "type": "bytes32"
        },
        {
          "internalType": "uint256[]",
          "name": "extensions",
          "type": "uint256[]"
        }
      ],
      "stateMutability": "view",
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
      "inputs": [
        {
          "internalType": "address",
          "name": "to",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "value",
          "type": "uint256"
        },
        {
          "internalType": "bytes",
          "name": "data",
          "type": "bytes"
        },
        {
          "internalType": "enum Operation",
          "name": "operation",
          "type": "uint8"
        }
      ],
      "name": "execute",
      "outputs": [],
      "stateMutability": "payable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getDefaultValidator",
      "outputs": [
        {
          "internalType": "contract IKernelValidator",
          "name": "validator",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getDisabledMode",
      "outputs": [
        {
          "internalType": "bytes4",
          "name": "disabled",
          "type": "bytes4"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes4",
          "name": "_selector",
          "type": "bytes4"
        }
      ],
      "name": "getExecution",
      "outputs": [
        {
          "components": [
            {
              "internalType": "ValidAfter",
              "name": "validAfter",
              "type": "uint48"
            },
            {
              "internalType": "ValidUntil",
              "name": "validUntil",
              "type": "uint48"
            },
            {
              "internalType": "address",
              "name": "executor",
              "type": "address"
            },
            {
              "internalType": "contract IKernelValidator",
              "name": "validator",
              "type": "address"
            }
          ],
          "internalType": "struct ExecutionDetail",
          "name": "",
          "type": "tuple"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getLastDisabledTime",
      "outputs": [
        {
          "internalType": "uint48",
          "name": "",
          "type": "uint48"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint192",
          "name": "key",
          "type": "uint192"
        }
      ],
      "name": "getNonce",
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
      "inputs": [],
      "name": "getNonce",
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
          "internalType": "contract IKernelValidator",
          "name": "_defaultValidator",
          "type": "address"
        },
        {
          "internalType": "bytes",
          "name": "_data",
          "type": "bytes"
        }
      ],
      "name": "initialize",
      "outputs": [],
      "stateMutability": "payable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "hash",
          "type": "bytes32"
        },
        {
          "internalType": "bytes",
          "name": "signature",
          "type": "bytes"
        }
      ],
      "name": "isValidSignature",
      "outputs": [
        {
          "internalType": "bytes4",
          "name": "",
          "type": "bytes4"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "name",
      "outputs": [
        {
          "internalType": "string",
          "name": "",
          "type": "string"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        },
        {
          "internalType": "uint256[]",
          "name": "",
          "type": "uint256[]"
        },
        {
          "internalType": "uint256[]",
          "name": "",
          "type": "uint256[]"
        },
        {
          "internalType": "bytes",
          "name": "",
          "type": "bytes"
        }
      ],
      "name": "onERC1155BatchReceived",
      "outputs": [
        {
          "internalType": "bytes4",
          "name": "",
          "type": "bytes4"
        }
      ],
      "stateMutability": "pure",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        },
        {
          "internalType": "bytes",
          "name": "",
          "type": "bytes"
        }
      ],
      "name": "onERC1155Received",
      "outputs": [
        {
          "internalType": "bytes4",
          "name": "",
          "type": "bytes4"
        }
      ],
      "stateMutability": "pure",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        },
        {
          "internalType": "bytes",
          "name": "",
          "type": "bytes"
        }
      ],
      "name": "onERC721Received",
      "outputs": [
        {
          "internalType": "bytes4",
          "name": "",
          "type": "bytes4"
        }
      ],
      "stateMutability": "pure",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "contract IKernelValidator",
          "name": "_defaultValidator",
          "type": "address"
        },
        {
          "internalType": "bytes",
          "name": "_data",
          "type": "bytes"
        }
      ],
      "name": "setDefaultValidator",
      "outputs": [],
      "stateMutability": "payable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes4",
          "name": "_selector",
          "type": "bytes4"
        },
        {
          "internalType": "address",
          "name": "_executor",
          "type": "address"
        },
        {
          "internalType": "contract IKernelValidator",
          "name": "_validator",
          "type": "address"
        },
        {
          "internalType": "uint48",
          "name": "_validUntil",
          "type": "uint48"
        },
        {
          "internalType": "uint48",
          "name": "_validAfter",
          "type": "uint48"
        },
        {
          "internalType": "bytes",
          "name": "_enableData",
          "type": "bytes"
        }
      ],
      "name": "setExecution",
      "outputs": [],
      "stateMutability": "payable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "_newImplementation",
          "type": "address"
        }
      ],
      "name": "upgradeTo",
      "outputs": [],
      "stateMutability": "payable",
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
          "name": "missingAccountFunds",
          "type": "uint256"
        }
      ],
      "name": "validateUserOp",
      "outputs": [
        {
          "internalType": "ValidationData",
          "name": "validationData",
          "type": "uint256"
        }
      ],
      "stateMutability": "payable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "version",
      "outputs": [
        {
          "internalType": "string",
          "name": "",
          "type": "string"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "stateMutability": "payable",
      "type": "receive"
    }
  ]

  const KernelContract = new ethers.Contract(
    address,
    abi,
    provider
  );

  const call = {
    to: target,
    value: 0,
    data: '0x',
  };

  const permissions: Permission[] = [
    {
      target: target as Hex,
      valueLimit: 0,
      sig: getFunctionSelector("mint(address)"),
      operation: Operation.Call,
      rules: [
        {
          condition: ParamCondition.EQUAL,
          offset: 0,
          param: pad(address as Hex, { size: 32 }),
        },
      ],
    },
  ];

  const sessionKeyData = {
    validAfter: 0,
    validUntil: 0,
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
    sessionKeyAddr,
    pad(merkleTree.getHexRoot() as Hex, { size: 32 }),
    pad(toHex(sessionKeyData.validAfter), { size: 6 }),
    pad(toHex(sessionKeyData.validUntil), { size: 6 }),
    paymaster,
  ])
  const enableDataLength = enableData.length / 2 - 1;
  const enableSigLength = 65;

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

  // session key sig should = sig opHash
  const sessionKeySigData = await wallet.signMessage("abc");
  console.log(sessionKeySigData)
  const sessionKeySig = concatHex([
    selfAddress,
    sessionKeySigData as Hex,
    encodedData,
  ]);
  const validAfter = 10000000000;
  const validUntil = 10000000000;
  const selector = '0x'
  const enableSigMsg = {
    sig: selector as Hex,
    validatorData: hexToBigInt(
      concatHex([
        pad(toHex(validUntil), { size: 6 }),
        pad(toHex(validAfter), { size: 6 }),
        SessionKeyOwnedValidator,
      ]),
      { size: 32 }
    ),
    executor: executor as Address,
    enableData: enableData,
  }
  const serialized = JSON.stringify(enableSigMsg, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  );
  let enableSignature = await wallet.signMessage(serialized)
  const dummyECDSASig = "0xfffffffffffffffffffffffffffffff0000000000000000000000000000000007aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1c";

  const signature = concatHex([
    validatorMode,
    pad(toHex(validUntil), { size: 6 }), // 6 bytes 4 - 10
    pad(toHex(validAfter), { size: 6 }), // 6 bytes 10 - 16
    pad(SessionKeyOwnedValidator, { size: 20 }), // 20 bytes 16 - 36
    pad(executor as Hex, { size: 20 }), // 20 bytes 36 - 56
    pad(toHex(enableDataLength), { size: 32 }),
    enableData,
    pad(toHex(enableSigLength), { size: 32 }),
    dummyECDSASig,
    // enableSignature,
    sessionKeySig as Hex,
  ]);

  const builder = kernel.execute(call)
    .setPaymasterAndData(paymaster)
    .setSignature(signature)
  console.log("Builder initialized")

  const res = await client.sendUserOperation(
    builder,
    { onBuild: (op) => console.log("Signed UserOperation:", op) }
  );
  console.log(`UserOpHash: ${res.userOpHash}`);

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

