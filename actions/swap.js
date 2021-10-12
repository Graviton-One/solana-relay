const { Connection } = require('@solana/web3.js')
const anchor = require("@project-serum/anchor")
const { requestInfos, swap, walletFromRaw, getTokenAccounts } = require("./utils/utils.js");
const { getSwapOutAmount } = require("./utils/tokens.js");
// const{ PublicKey } = require("@solana/web3.js";
const {commitment} = require("./utils/web3.js")

const ammId = "58oQChx4yWmvKdwLLZzBi4ChoCc2fqCUWBkwMihLYQo2"

const baseMint = "11111111111111111111111111111111"; // from token address in string representattion
const quoteMint = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"; // = to token address in string representattion
const fromCoinAmount = "10000"; // string amount with all decimals (6 default)

const createWeb3Instance = (endpoint) => {
  const web3 = new Connection(endpoint, commitment);
  return web3;
};

async function main() {
  const endpoint = "https://solana-api.projectserum.com";
  const connection = createWeb3Instance(endpoint);

  const infos = await requestInfos(connection);
  const owner = walletFromRaw()
  const poolInfo = Object.values(infos).find((p) => p.ammId === ammId);
  const data = await getTokenAccounts(connection, owner.publicKey)

  const baseAccount = data[baseMint]; // from token user account
  const quoteAccount = data[quoteMint]; // to token user account

  const toCoinWithSlippage = getSwapOutAmount(
    poolInfo,
    baseMint,
    quoteMint,
    fromCoinAmount,
    "0.5"
  )

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
