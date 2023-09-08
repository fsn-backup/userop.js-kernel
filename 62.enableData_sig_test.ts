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

  const kernelFactory = "0xB553DEFA143cC90dE61029c3e5CD4A321354BF86";
  const kernelImpl = "0x265eB71b10FE2861eD4Ca56599c8B36615E898c4";
  const ECDSAValidator = "0x40a947692699FE2f1F5e14baB3C19e725E40B499";
  const SessionKeyExecValidator = "0x5a312986d91ebA829073091135b9660b1068ed60";
  const SessionKeyOwnedValidator = "0x563c76956b46DF607c583842da7EBb138D4d3a73";


  const nftAddress = "0xf578642ff303398103930832B779cD35891eBa35"

  const target = "0x93356ED2567a40870B542820EA97f06C0DfFd50E"
  const value = ethers.utils.parseEther('0')
  const aaWalletSalt = "1"

  const userAddress = "0x4d1a37b9614D24fE6Eb2c4CA5d3C8Cbc9da85e16"
  const userPrivateKey = "73b63e0d69dc8770eefdefbcc77d11dfb3ac6a9cb17d409d13af233f72476bdf"
  const userAA1 = "0x4b60e99f6F5D98FFbd186940d6aCB7815a80dd3E"

  const sessionKeyAddr = "0x9F8Df84Ff8096C156bE988B29e358d5f6302ea8E"
  const sessionKeyPrive = "b37db4b8b4a195056c40d92df7a8ae757022925059bdaa065fcf83bf0bb1c639"
  const sessionKeyExecutor = "0xB5B2D6ab4aF3FB1C008d1933F8D0e3049e2d78Be"

  const sessionKeyAddr2 = "0x0459e4fa68BBDFb22CaB8eA0244C717e3cF18106"
  const sessionKeyPrive2 = "c262029d2024df67ff107b1c5ffce38f8883d0f4b2933352ef9fecca759c1321"


  const provider = new BundlerJsonRpcProvider(nodeRpcUrl).setBundlerRpc(bundlerUrl);
  const userWallet = new ethers.Wallet(userPrivateKey, provider);

  console.log("origin address:", userWallet.address);
  const message = "0xea390646b28501008ee9b4c570c89b83d39749b731d196de116f5fc327503be2";
  const messageBytes = ethers.utils.toUtf8Bytes(message);
  const sessionKeySigData = await userWallet.signMessage(messageBytes);
  console.log("sessionKeySigData:", sessionKeySigData);
  const messageHash = ethers.utils.hashMessage(messageBytes);
  console.log("Message Hash:", messageHash);
  const recoveredAddress = ethers.utils.recoverAddress(messageHash, sessionKeySigData);
  console.log("Recovered address:", recoveredAddress);
  console.log("recover success:", recoveredAddress == userWallet.address);
}

main()
  .then(() => {
    console.log('Main function completed.');
  })
  .catch((error) => {
    console.error(`An error occurred: ${error}`);
  });

