const { Connection, PublicKey } = require('@solana/web3.js')
const anchor = require("@project-serum/anchor")
const { requestInfos, swap, transfer, walletFromRaw, getTokenAccounts } = require("./utils/utils.js");
const { getSwapOutAmount } = require("./utils/tokens.js");
// const{ PublicKey } = require("@solana/web3.js";
const {commitment} = require("./utils/web3.js")
const fetch = require("node-fetch")
var atob = require("atob")
const bs58 = require('bs58')

const ammId = "J8r2dynpYQuH6S415SPEdGuBGPmwgNuyfbxt1T371Myi"

const baseMint = "4hJ6sjwmsvvFag6TKL97yhWiBSDX9BABWoiXgb3EPXxB"; // from token address in string representattion
const quoteMint = "11111111111111111111111111111111"; // = to token address in string representattion
const baseUrl = process.env.EXTRACTOR_URL;
const pass = process.env.EXTRACTOR_PASS;


function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const createWeb3Instance = (endpoint) => {
  const web3 = new Connection(endpoint, commitment);
  return web3;
};

async function getBase64() {
    const data = await fetch(baseUrl + "/extract");
    const json = await data.json()
    return json.Value
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

function buf2hex(buffer) {
  var u = new Uint8Array(buffer),
      a = new Array(u.length),
      i = u.length;
  while (i--) // map to hex
      a[i] = (u[i] < 16 ? '0' : '') + u[i].toString(16);
  u = null; // free memory
  return a.join('');
};


function extractDataFromBase(base) {
  const buffer = _base64ToArrayBuffer(base)
  const address = bs58.encode(buffer.slice(328, 360))
  amount = Number(BigInt('0x'+buf2hex(buffer.slice(200,232)))) /10**18;
  return [address, amount]
}
const toAddress = new PublicKey("8eXB9mtUWtdN9Jj7u7rJM2nJf18qT7mVyqvZvse2KnxW")
const basestring = []

async function main() {
  const endpoint = "https://solana-api.projectserum.com";
  const connection = createWeb3Instance(endpoint);
  const owner = walletFromRaw()
  while(true) {
  try{
    const baseString = await getBase64();
    const [address, amount] = extractDataFromBase(baseString)
    console.log(amount);
    const infos = await requestInfos(connection);
    const poolInfo = Object.values(infos).find((p) => p.ammId === ammId);
    const data = await getTokenAccounts(connection, owner.publicKey)
    console.log(data);
    const baseAccount = data.tokenAccounts[baseMint].tokenAccountAddress; // from token user account
    const quoteAccount = data.tokenAccounts[quoteMint].tokenAccountAddress; // to token user account
  
    const amountOut = getSwapOutAmount(
      poolInfo,
      baseMint,
      quoteMint,
      amount,
      "0.5"
    );
  
    console.log(amount.toString());
    const txnId = await swap(
      connection,
      owner,
      poolInfo,
      baseMint,
      quoteMint,
      baseAccount,
      quoteAccount,
      amount.toString(),
      amountOut,
    );
    console.log(txnId);
    const res = await transfer(connection, owner,
        address, amountOut.amountOutWithSlippage.wei.toString());

    const deleteQuery = fetch(baseUrl + "/delete?base64bytes=" + baseString + "&pass=" + process.env.ORACLE_PASSWORD + "&key=" + address + res + "&txn=" + txnId)
  } catch(e) {
    console.log(e)
  } 
  console.log("sleeping")
  await sleep(10000)
}
}

main().then("Finished")
