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
} from "./userop";
import {
  EOASignature,
  estimateUserOperationGas,
  getGasPrice,
} from "./userop/preset/middleware";
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
  hexToBigInt,
  isHex,
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
  const SessionKeyOwnedValidator = "0x7124091F4CCa6890a2Ee917bFCbcE392909b5716"

  const nftAddress = "0xf578642ff303398103930832B779cD35891eBa35"

  let target = "0x93356ED2567a40870B542820EA97f06C0DfFd50E"
  target = nftAddress

  const value = ethers.utils.parseEther('0')
  const aaWalletSalt = "1"

  const selfAddress = "0x4d1a37b9614D24fE6Eb2c4CA5d3C8Cbc9da85e16"
  const privKey = "73b63e0d69dc8770eefdefbcc77d11dfb3ac6a9cb17d409d13af233f72476bdf"

  let sessionKeyAddr = "0xd638e4a9a2efb0e41b5e20c4d36601fd1a4e42f5"
  const sessionKeyPriv = "9eb0e1012c4c910cd3fc4524b3747687b710e2cdaa4f3d3a08a3fac6bd7701b1"
  sessionKeyAddr = selfAddress;
  const executor = selfAddress

  console.log("Starting client...")
  const client = await Client.init(nodeRpcUrl, {
    "entryPoint": entryPoint,
    "overrideBundlerRpc": bundlerUrl,
  });
  console.log("Client initialized");

  const provider = new BundlerJsonRpcProvider(nodeRpcUrl).setBundlerRpc(bundlerUrl);
  const wallet = new ethers.Wallet(privKey, provider);

  console.log("KernelWallet initializing...");
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
  console.log(`KernelWallet address: ${address}`);

  let abi = [
    {
      "inputs": [],
      "stateMutability": "nonpayable",
      "type": "constructor"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "owner",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "approved",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "tokenId",
          "type": "uint256"
        }
      ],
      "name": "Approval",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "owner",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "operator",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "bool",
          "name": "approved",
          "type": "bool"
        }
      ],
      "name": "ApprovalForAll",
      "type": "event"
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
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "from",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "to",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "tokenId",
          "type": "uint256"
        }
      ],
      "name": "Transfer",
      "type": "event"
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
          "name": "tokenId",
          "type": "uint256"
        }
      ],
      "name": "approve",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "owner",
          "type": "address"
        }
      ],
      "name": "balanceOf",
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
          "internalType": "uint256",
          "name": "tokenId",
          "type": "uint256"
        }
      ],
      "name": "getApproved",
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
          "internalType": "address",
          "name": "owner",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "operator",
          "type": "address"
        }
      ],
      "name": "isApprovedForAll",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
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
          "internalType": "uint256",
          "name": "tokenId",
          "type": "uint256"
        }
      ],
      "name": "ownerOf",
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
          "name": "to",
          "type": "address"
        }
      ],
      "name": "safeMint",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "from",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "to",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "tokenId",
          "type": "uint256"
        }
      ],
      "name": "safeTransferFrom",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "from",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "to",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "tokenId",
          "type": "uint256"
        },
        {
          "internalType": "bytes",
          "name": "data",
          "type": "bytes"
        }
      ],
      "name": "safeTransferFrom",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "operator",
          "type": "address"
        },
        {
          "internalType": "bool",
          "name": "approved",
          "type": "bool"
        }
      ],
      "name": "setApprovalForAll",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes4",
          "name": "interfaceId",
          "type": "bytes4"
        }
      ],
      "name": "supportsInterface",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "symbol",
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
          "internalType": "uint256",
          "name": "tokenId",
          "type": "uint256"
        }
      ],
      "name": "tokenURI",
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
          "name": "from",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "to",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "tokenId",
          "type": "uint256"
        }
      ],
      "name": "transferFrom",
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
    }
  ]

  const NFTContract = new ethers.Contract(
    nftAddress,
    abi,
    provider
  );

  const call = {
    to: nftAddress,
    value: ethers.constants.Zero,
    data: NFTContract.interface.encodeFunctionData("safeMint", [selfAddress]),
  };

  let selector = getFunctionSelector("safeMint(address)")
  const permissions: Permission[] = [
    {
      target: target as Hex,
      valueLimit: 0,
      sig: selector,
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

  const validAfter = 0;
  const validUntil = 0;

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

  let testSig = await wallet.signMessage("0x0")
  const DUMMY_ECDSA_SIG = "0xfffffffffffffffffffffffffffffff0000000000000000000000000000000007aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1c";
  testSig = DUMMY_ECDSA_SIG
  const sessionKeySig = concatHex([
    sessionKeyAddr as Hex,
    testSig as Hex, // session key sig
    encodedData,
  ]);

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
  enableSignature = dummyECDSASig

  const signature = concatHex([
    validatorMode,
    pad(toHex(validUntil), { size: 6 }), // 6 bytes 4 - 10
    pad(toHex(validAfter), { size: 6 }), // 6 bytes 10 - 16
    pad(SessionKeyOwnedValidator, { size: 20 }), // 20 bytes 16 - 36
    pad(executor as Hex, { size: 20 }), // 20 bytes 36 - 56
    pad(toHex(enableDataLength), { size: 32 }),
    enableData,
    pad(toHex(enableSignature.length / 2 - 1), { size: 32 }),
    toHex(enableSignature), // enable sig
    sessionKeySig as Hex,
  ]);

  const builder = kernel.execute(call)
    .setPaymasterAndData(paymaster)
    .setSignature(signature)
    .useMiddleware(EOASignature(wallet))
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

