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


async function main() {

  let nodeRpcUrl = "http://88.99.94.109:3334"
  let bundlerUrl = "http://88.99.94.109:14337/"

  const entryPoint = "0xba0917DF35Cf6c7aE1CABf5e7bED9a904F725318";
  const paymaster = "0x1a256A0221b030A8A50Cb18966Ebdc4325a92D7F"

  const kernelFactory = "0x696E1024cef8b682d87952A652162Bc87564834b";
  const kernelAddress = "0x687A090a558EF6720Cf58E575542160178BFd500"
  const ECDSAValidatorAddress = "0x31D2477bA6938687fB88E11cBe14b14489d7F964"
  const SessionKeyExecValidator = "0x9c2Fb38467F5d46b0e2ec5A658755313aA1B2A4E"
  const SessionKeyOwnedValidator = "0x4755FE51b67Af2df02E940F927157FB84D5A7Fd6"

  const nftAddress = "0xf578642ff303398103930832B779cD35891eBa35"

  const target = "0x93356ED2567a40870B542820EA97f06C0DfFd50E"
  const value = ethers.utils.parseEther('0')
  const aaWalletSalt = "1"

  const userAddress = "0x9c19BEd96de9cFBb7aF3D16ae39967F4141078cC"
  const userPrivateKey = "4fa0dcbe0e0d89b3e75c0221b517cdc69edbea3c4d88bf01988f3e52a2989b0e"
  // const userAA1Addr = "0xCdaBF9cBB46b13bC8de71f83a1E5a46db23FAfA0"

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
  let userAA1Addr = "0x8a231AB690897D5D0e4739044c135585d71aaa02"

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
    pageUserWallet,
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

  const call = {
    to: userAA1Addr,
    value: 0,
    data: "0x",
  };

  // console.log(signature)
  const builder = kernel.execute(call)
    .setPaymasterAndData(paymaster)
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

