import { ethers } from "ethers";
import {
  Client,
  Presets,
  BundlerJsonRpcProvider
} from "./src";
import {
  verifyingPaymaster,
} from "./src/preset/middleware";
import {
  concat,
  pad,
  toHex,
  concatHex,
  hexToBigInt,
  getFunctionSelector
} from "viem";
import {
  type Address,
  type Hex,
} from "@alchemy/aa-core";
import { nftABI } from "./abi.nft";
import { UserOperationMiddlewareCtx } from "./src/context"
import {
  ParamCondition, Operation, Permission,
  getMerkleTree, SessionKeyData, getEncodedData
} from "./src/kernel_util"


async function main() {

  console.time("===>total")

  const chainId = 6480001000;

  const nodeRpcUrl = "http://88.99.94.109:3334"
  // const bundlerUrl = "http://88.99.94.109:14337/"
  const paymasterUrl = "http://88.99.94.109:14339/paymaster"

  const bundlerUrl = "http://127.0.0.1:14337"


  const entryPoint = "0xba0917DF35Cf6c7aE1CABf5e7bED9a904F725318";
  const paymaster = "0x396634BcFc59ad0096BE03c04f179a3B5aC00568"


  const kernelFactory = "0xA171f41588bA43666F4ee9F1f87C1D84f573d848";
  const kernelImpl = "0x3FEf6c193e5632d6fd65Da1bC82d34EDc33Cd251";
  const ECDSAValidator = "0xBdD707ac36bC0176464292D03f4fAA1bf5fBCeba";
  const SessionKeyExecValidator = "0x75Fb570b6e16D6cA61C733E629c297E863F24076";
  const SessionKeyOwnedValidator = "0x99D08AA79ea8BD6d127f51CF87ce0aD64643b854";


  const nftAddress = "0xf578642ff303398103930832B779cD35891eBa35"

  const target = "0x93356ED2567a40870B542820EA97f06C0DfFd50E"
  const value = ethers.utils.parseEther('0')
  const aaWalletSalt = "1"

  const userAddress = "0x9c19BEd96de9cFBb7aF3D16ae39967F4141078cC"
  const userPrivateKey = "4fa0dcbe0e0d89b3e75c0221b517cdc69edbea3c4d88bf01988f3e52a2989b0e"
  const userAA1Addr = "0x1991bC1C252134AcD08BFA05b0A6Df47394D6D85"


  const serverAddr = "0xB5B2D6ab4aF3FB1C008d1933F8D0e3049e2d78Be"
  const serverPriv = "a01153107130534a21e9a4257e5670aed40a2c299f79b881c97e6d1a5a9f38a4"


  let sessionKeyAddr = "0xa10F17c5dB9C2eD693bCa462D9A1590f95DF0e22"
  let sessionKeyPriv = "0x67cd30131c9c79930cbd14a4e1c687358a4a0d1f0d49096192498a394ea46972"
  const sessionKeyExecutor = "0xB5B2D6ab4aF3FB1C008d1933F8D0e3049e2d78Be"


  console.time("===>phase-0-2")

  console.log("Starting client...")
  const client = await Client.init(nodeRpcUrl, {
    "entryPoint": entryPoint,
    "overrideBundlerRpc": bundlerUrl,
  });
  console.log("Client initialized");

  console.timeLog("===>phase-0-2")

  console.time("===>phase-0-0")

  const provider = new BundlerJsonRpcProvider(nodeRpcUrl).setBundlerRpc(bundlerUrl);
  const userWallet = new ethers.Wallet(userPrivateKey, provider);
  const sessionKeyWallet = new ethers.Wallet(sessionKeyPriv, provider);

  // act: validUntil - SvalidUntil
  const validAfter = 1594068745;
  const validUntil = 1623012745;

  const SvalidAfter = 1594068745;
  const SvalidUntil = 1923012745;

  console.timeLog("===>phase-0-0")

  console.time("===>phase-0-1")

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
      "paymasterMiddleware": verifyingPaymaster(
        {
          rpcUrl: paymasterUrl,
          validAfter: validUntil,
          validUntil: SvalidUntil,
        }
      )
    }
  );
  console.log("Kernel initialized");

  console.timeLog("===>phase-0-1")

  console.time("===>phase-1-0")

  const address = kernel.getSender();
  console.log(`Kernel address: ${address}`);

  console.timeLog("===>phase-1-0")

  console.time("===>phase-1-1")

  const NFTContract = new ethers.Contract(
    nftAddress,
    nftABI,
    provider
  );

  console.timeLog("===>phase-1-1")
  console.time("===>phase-1-5")


  const call = {
    to: nftAddress,
    value: 0,
    data: NFTContract.interface.encodeFunctionData("safeMint", [address])
  }

  console.timeLog("===>phase-1-5")

  console.time("===>phase-1-2")

  const sig = getFunctionSelector("safeMint(address)")
  const permissions: Permission[] = [
    {
      target: nftAddress as Hex,
      valueLimit: 0,
      sig: sig,
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

  const sessionKeyData: SessionKeyData = {
    validAfter: SvalidAfter,
    validUntil: SvalidUntil,
    permissions,
    paymaster: paymaster
  }

  const validatorMode = "0x00000002"

  const merkleTree = getMerkleTree(sessionKeyData)
  const enableData = concat([
    sessionKeyAddr as Hex,
    pad(merkleTree.getHexRoot() as Hex, { size: 32 }),
    pad(toHex(sessionKeyData.validAfter), { size: 6 }),
    pad(toHex(sessionKeyData.validUntil), { size: 6 }),
    paymaster,
  ])
  const enableDataLength = enableData.length / 2 - 1;

  const encodedData = getEncodedData(sessionKeyData);

  console.timeLog("===>phase-1-2")

  console.time("===>phase-1-3")

  const builder = kernel.execute(call)

  console.timeLog("===>phase-1-3")

  console.time("===>phase-1-4")

  const userOp = await client.buildUserOperation(builder);

  console.timeLog("===>phase-1-4")

  console.time("===>phase-2")

  const hash = new UserOperationMiddlewareCtx(
    userOp,
    entryPoint,
    chainId
  ).getUserOpHash()

  console.timeLog("===>phase-2")

  console.time("===>phase-3")

  const messageBytes = ethers.utils.arrayify(hash);
  const sessionKeySigData = await sessionKeyWallet.signMessage(messageBytes);

  console.timeLog("===>phase-3")

  console.time("===>phase-4-1")

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
        SessionKeyExecValidator,
      ]),
      { size: 32 }
    ),
    executor: sessionKeyExecutor as Address,
    enableData: enableData,
  }

  console.timeLog("===>phase-4-1")

  console.time("===>phase-4-2")

  const enableSignature = await userWallet._signTypedData(domain, types, message);
  console.log("enableSignature:", enableSignature)
  console.timeLog("===>phase-4-2")

  console.time("===>phase-4-3")

  const enableSigLength = enableSignature.length / 2 - 1;

  const signature = concatHex([
    validatorMode,
    pad(toHex(validUntil), { size: 6 }), // 6 bytes 4 - 10
    pad(toHex(validAfter), { size: 6 }), // 6 bytes 10 - 16
    pad(SessionKeyExecValidator, { size: 20 }), // 20 bytes 16 - 36
    pad(sessionKeyExecutor as Hex, { size: 20 }), // 20 bytes 36 - 56
    pad(toHex(enableDataLength), { size: 32 }),
    enableData,
    pad(toHex(enableSigLength), { size: 32 }),
    enableSignature as Hex,
    sessionKeySig as Hex,
  ]);

  console.timeLog("===>phase-4-3")

  console.time("===>phase-5")

  userOp.signature = signature;
  const res = await client.sendUserOperationOnly(
    builder,
    userOp,
    hash,
    {
      onBuild: (op) => console.log("Signed UserOperation:", op),
      dryRun: false
    }
  );
  console.log(`UserOpHash: ${res.userOpHash}`);
  console.timeLog("===>phase-5")

  console.time("===>phase-6")

  const receipt = await res.wait();
  console.log(`receipt: ${receipt?.transactionHash}`);

  console.timeLog("===>phase-6")

  console.timeEnd("===>total")

}

main()
  .then(() => {
    console.log('Main function completed.');
  })
  .catch((error) => {
    console.error(`An error occurred: ${error}`);
  });

