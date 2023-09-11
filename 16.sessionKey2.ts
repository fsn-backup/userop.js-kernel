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

  const kernelFactory = "0xdc5cA28bCF1AFA47Be5046C59B33B0C9D82118D0";
  const kernelAddress = "0x687A090a558EF6720Cf58E575542160178BFd500"
  const ECDSAValidatorAddress = "0x31D2477bA6938687fB88E11cBe14b14489d7F964"
  const SessionKeyExecValidator = "0x5c5f9812A89538C3D38dbEC6a1217cDD4b81e520"
  const SessionKeyOwnedValidator = "0xFC8027d2FB24FeBEb0eBE0ed96979E114A2C2Aba"

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
  const sessionKeyWallet = new ethers.Wallet(sessionKeyPrive2, provider);

  console.log("origin address:", sessionKeyWallet.address);
  // session key sig should = sig opHash
  const message = "Hello, world!";
  const messageBytes = ethers.utils.toUtf8Bytes(message);
  const sessionKeySigData = await sessionKeyWallet.signMessage(messageBytes);
  console.log("sessionKeySigData:", sessionKeySigData);
  const messageHash = ethers.utils.hashMessage(messageBytes);
  console.log("Message Hash:", messageHash);
  const recoveredAddress = ethers.utils.recoverAddress(messageHash, sessionKeySigData);
  console.log("Recovered address:", recoveredAddress);

}

main()
  .then(() => {
    console.log('Main function completed.');
  })
  .catch((error) => {
    console.error(`An error occurred: ${error}`);
  });

