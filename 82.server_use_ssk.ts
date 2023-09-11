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

  const chainId = 6480001000;

  let nodeRpcUrl = "http://88.99.94.109:3334"
  let bundlerUrl = "http://88.99.94.109:14337/"

  // let nodeRpcUrl = "http://127.0.0.1:8545"
  // let bundlerUrl = "http://127.0.0.1:14337"

  const entryPoint = "0xba0917DF35Cf6c7aE1CABf5e7bED9a904F725318";
  const paymaster = "0x1a256A0221b030A8A50Cb18966Ebdc4325a92D7F"

  const kernelFactory = "0xA171f41588bA43666F4ee9F1f87C1D84f573d848";
  const kernelImpl = "0x3FEf6c193e5632d6fd65Da1bC82d34EDc33Cd251";
  const ECDSAValidator = "0xBdD707ac36bC0176464292D03f4fAA1bf5fBCeba";
  const SessionKeyExecValidator = "0xFc3D30e186f622512b7d124C1B69D9f100215016";
  const SessionKeyOwnedValidator = "0x99D08AA79ea8BD6d127f51CF87ce0aD64643b854";


  const nftAddress = "0xf578642ff303398103930832B779cD35891eBa35"

  const target = "0x93356ED2567a40870B542820EA97f06C0DfFd50E"
  const value = ethers.utils.parseEther('0')
  const aaWalletSalt = "1"

  const userAddress = "0x9c19BEd96de9cFBb7aF3D16ae39967F4141078cC"
  const userPrivateKey = "4fa0dcbe0e0d89b3e75c0221b517cdc69edbea3c4d88bf01988f3e52a2989b0e"
  const userAA1Addr = "0xfAF73f4FeCDE6C5CB38537B54da9FE5942A01682"


  const serverAddr = "0xB5B2D6ab4aF3FB1C008d1933F8D0e3049e2d78Be"
  const serverPriv = "a01153107130534a21e9a4257e5670aed40a2c299f79b881c97e6d1a5a9f38a4"

  const sessionKeyAddr2 = "0x0459e4fa68BBDFb22CaB8eA0244C717e3cF18106"
  const sessionKeyPrive2 = "c262029d2024df67ff107b1c5ffce38f8883d0f4b2933352ef9fecca759c1321"

  const deployAddr = ""
  const deployPriv = "73b63e0d69dc8770eefdefbcc77d11dfb3ac6a9cb17d409d13af233f72476bdf"

  const receiveAddr = "0x33275cECEA5165f99e3128FF1899CBACe07C7d6C"

  let sessionKeyAddr = "0xa10F17c5dB9C2eD693bCa462D9A1590f95DF0e22"
  let sessionKeyPriv = "0x67cd30131c9c79930cbd14a4e1c687358a4a0d1f0d49096192498a394ea46972"
  const sessionKeyExecutor = "0xB5B2D6ab4aF3FB1C008d1933F8D0e3049e2d78Be"


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
    serverWallet,
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

  const call = {
    to: userAA1Addr,
    value: 0,
    data: "0x",
  };

  // const sig = getFunctionSelector("mint(address)")
  const sig = "0x00000000";
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

  // act: validUntil - SvalidUntil
  const validAfter = 1594068745;
  const validUntil = 1623012745;

  const SvalidAfter = 1594068745;
  const SvalidUntil = 1923012745;


  const sessionKeyData = {
    validAfter: SvalidAfter,
    validUntil: SvalidUntil,
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
  console.log("enableData:", enableData)
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
    .setSender(userAA1Addr)
  const userOp = await client.buildUserOperation(builder);

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
    BigInt(chainId)
  );

  const messageBytes = ethers.utils.arrayify(hash);
  const sessionKeySigData = await sessionKeyWallet.signMessage(messageBytes);

  const sessionKeySig = concatHex([
    sessionKeyAddr as Hex,
    sessionKeySigData as Hex,
    encodedData,
  ]);

  const callData = kernel.proxy.interface.encodeFunctionData("execute", [
    call.to,
    call.value,
    call.data,
    Operation.Call,
  ])
  const enableSigHex = callData.slice(2, 2 + 8);
  const enableSig = Buffer.from(enableSigHex, 'hex');


  const domain = {
    name: "Kernel",
    version: "0.2.1",
    chainId: 6480001000,
    verifyingContract: address,
  }
  const types = {
    ValidatorApproved: [
      { name: "sig", type: "bytes4" },
      { name: "validatorData", type: "uint256" },
      { name: "executor", type: "address" },
      { name: "enableData", type: "bytes" },
    ]
  }
  const message = {
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
  // const enableSignature = await userWallet._signTypedData(domain, types, message);
  const enableSignature = "0xf27bc23e55bea6f412c070766bb5e2c802ae6e475c68dbfbc8677fc4ceebb56d5564a761fd8b7736f3b5f41934e72c09806d8ed1ba60c43941672aff15e913171c"
  console.log("enableSignature:", enableSignature)
  const enableSigLength = enableSignature.length / 2 - 1;

  const signature = concatHex([
    validatorMode,
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


  builder = builder
    .setPaymasterAndData(paymaster)
    .setSignature(signature)
    .setSender(userAA1Addr)
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

