import { Connection } from '@solana/web3.js'
import anchor from "@project-serum/anchor"
import { requestInfos, swap } from "./utils/utils";
// import { PublicKey } from "@solana/web3.js";

const baseMint = ""; // from token address in string representattion
const quoteMint = ""; // from token address in string representattion
const baseAccount = ""; // from token address in string representattion
const quoteAccount = ""; // from token address in string representattion
const fromCoinAmount = "10000"; // string amount with all decimals (6 default)
const toCoinWithSlippage = "";

const createWeb3Instance = (endpoint) => {
  const web3 = new Connection(endpoint, commitment);
  return web3;
};

async function main() {
  const endpoint = "https://solana-api.projectserum.com";
  const connection = createWeb3Instance(endpoint);
  const infos = await requestInfos(connection);
  const owner = anchor.provider.wallet
  const poolInfo = Object.values(infos).find((p) => p.ammId === this.ammId);
  const txnId = await swap(
    connection,
    owner,
    poolInfo,
    baseMint,
    quoteMint,
    baseAccount,
    quoteAccount,
    fromCoinAmount,
    toCoinWithSlippage
  );
  console.log(txnId);
}

main().then("Finished swap");
