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

async function main() {

  let nodeRpcUrl = "http://88.99.94.109:3334"
  let bundlerUrl = "http://88.99.94.109:14337/"

  const entryPoint = "0xba0917DF35Cf6c7aE1CABf5e7bED9a904F725318";
  const paymaster = "0x1a256A0221b030A8A50Cb18966Ebdc4325a92D7F"

  const kernelFactory = "0xdc5cA28bCF1AFA47Be5046C59B33B0C9D82118D0";
  const kernelAddress = "0x687A090a558EF6720Cf58E575542160178BFd500"
  const ECDSAValidatorAddress = "0x31D2477bA6938687fB88E11cBe14b14489d7F964"
  const SessionKeyExecValidator = "0x54aB5016A0ca2Bc8BeD7dbc77dF78eF9E9E2FfC6"
  const SessionKeyOwnedValidator = "0xDbf20Fc5318D2Ea8498800361a04Da8313f87f9a"

  const nftAddress = "0xf578642ff303398103930832B779cD35891eBa35"

  const target = "0x93356ED2567a40870B542820EA97f06C0DfFd50E"
  const value = ethers.utils.parseEther('0')
  const aaWalletSalt = "1"

  const selfAddress = "0x4d1a37b9614D24fE6Eb2c4CA5d3C8Cbc9da85e16"
  const privKey = "73b63e0d69dc8770eefdefbcc77d11dfb3ac6a9cb17d409d13af233f72476bdf"

  const sessionKeyAddr = selfAddress
  const executor = selfAddress


  const provider = new BundlerJsonRpcProvider(nodeRpcUrl).setBundlerRpc(bundlerUrl);
  const wallet = new ethers.Wallet(privKey, provider);

// =----====---

  const msg = 'abc';
  let signature = "0x6214f2d42cb8ca870623a6227f7fccd06e06c46c86680279b32aadd73680e6613654d9b5bcf27993ca279239eaf19d728608b40dd7819b8e2a889a9a4c9691211c"
  let signatureBytes = ethers.utils.arrayify(signature)

  // to hash
  const messageHash = ethers.utils.hashMessage(msg);

  // recover
  const recoveredPublicKey = ethers.utils.recoverPublicKey(messageHash, signatureBytes);
  const recoveredAddress = ethers.utils.computeAddress(recoveredPublicKey);

  console.log("Original Address:", wallet.address);
  console.log("Recovered Address:", recoveredAddress);

}

main()
  .then(() => {
    console.log('Main function completed.');
  })
  .catch((error) => {
    console.error(`An error occurred: ${error}`);
  });

