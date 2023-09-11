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
import {kernelABI} from "./abi.kernel";
import {nftABI} from "./abi.nft";

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
  // let bundlerUrl = "http://127.0.0.1:14337/1337"

  const entryPoint = "0xba0917DF35Cf6c7aE1CABf5e7bED9a904F725318";
  const paymaster = "0x1a256A0221b030A8A50Cb18966Ebdc4325a92D7F"

  const kernelFactory = "0x739Caf0b938BF97518316d709a279667204d939A";
  const kernelImpl = "0xA4CeE46170B0E957b4f091BAC41A9aeebF5951ee";
  const ECDSAValidator = "0x99497deA860d7d676320Dce539E2806e276F87E0";
  const SessionKeyExecValidator = "0x65Da1781D56874654Ab8fBFb2936377a6A612008";
  const SessionKeyOwnedValidator = "0x5A3b75C298B945f150f2aC793AdebdaC3fE6126D";





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
  let sessionKeySigData = "0x11972eb4b60d4be19d7e2dd817199a51c15a5eb8aa7d90e54caedbdccaf9465a366808418c18ff0b174e28233ac6299a9a444124364289ca4a2344eb76e53d8a1b"

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
          param: pad(sessionKeyExecutor as Hex, { size: 32 }),
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

  const sessionKeySig = concatHex([
    sessionKeyAddr as Hex,
    sessionKeySigData as Hex,
    encodedData,
  ]);

  const validAfter = 1694001526;
  const validUntil = 3694001526;
  let domain = {
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
      sig: getFunctionSelector("mint(address)"),
      validatorData: hexToBigInt(
        concatHex([
          pad(toHex(validUntil), { size: 6 }),
          pad(toHex(validAfter), { size: 6 }),
          SessionKeyOwnedValidator,
        ]),
        { size: 32 }
      ),
      executor: sessionKeyExecutor as Address,
      enableData: await enableData,
    }
  let enableSignature = await userWallet._signTypedData(domain, types, message);  
  console.log("enableSignature", enableSignature)
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

  // console.log(signature)
  const builder = kernel.execute(call)
  .setPaymasterAndData(paymaster)
  .setSignature(signature)
  .setSender(userAA1Addr)
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

