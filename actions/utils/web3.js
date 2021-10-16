const { PublicKey } = require("@solana/web3.js");

const commitment = "confirmed";

async function createAmmAuthority(programId) {
  return await findProgramAddress(
    [
      new Uint8Array(
        Buffer.from("amm authority".replace("\u00A0", " "), "utf-8")
      ),
    ],
    programId
  );
}

async function findProgramAddress(seeds, programId) {
  const [publicKey, nonce] = await PublicKey.findProgramAddress(
    seeds,
    programId
  );
  return { publicKey, nonce };
}

async function getFilteredProgramAccountsAmmOrMarketCache(
  cacheName,
  connection,
  programId,
  filters
) {
  try {
    if (!cacheName) {
      throw new Error("cacheName error");
    }

    const resp = await (
      await fetch("https://api.raydium.io/cache/rpc/" + cacheName)
    ).json();
    if (resp.error) {
      throw new Error(resp.error.message);
    }
    // @ts-ignore
    return resp.result.map(
      ({ pubkey, account: { data, executable, owner, lamports } }) => ({
        publicKey: new PublicKey(pubkey),
        accountInfo: {
          data: Buffer.from(data[0], "base64"),
          executable,
          owner: new PublicKey(owner),
          lamports,
        },
      })
    );
  } catch (e) {
    return getFilteredProgramAccounts(connection, programId, filters);
  }
}

async function getFilteredProgramAccounts(connection, programId, filters) {
  // @ts-ignore
  const resp = await connection._rpcRequest("getProgramAccounts", [
    programId.toBase58(),
    {
      commitment: connection.commitment,
      filters,
      encoding: "base64",
    },
  ]);
  if (resp.error) {
    throw new Error(resp.error.message);
  }
  // @ts-ignore
  return resp.result.map(
    ({ pubkey, account: { data, executable, owner, lamports } }) => ({
      publicKey: new PublicKey(pubkey),
      accountInfo: {
        data: Buffer.from(data[0], "base64"),
        executable,
        owner: new PublicKey(owner),
        lamports,
      },
    })
  );
}

// getMultipleAccounts
async function getMultipleAccounts(connection, publicKeys, commitment = null) {
  const keys = [];
  let tempKeys = [];

  publicKeys.forEach((k) => {
    if (tempKeys.length >= 100) {
      keys.push(tempKeys);
      tempKeys = [];
    }
    tempKeys.push(k);
  });
  if (tempKeys.length > 0) {
    keys.push(tempKeys);
  }

  const accounts = [];

  const resArray = {};
  await Promise.all(
    keys.map(async (key, index) => {
      const res = await connection.getMultipleAccountsInfo(key, commitment);
      resArray[index] = res;
    })
  );

  Object.keys(resArray)
    .sort((a, b) => parseInt(a) - parseInt(b))
    .forEach((itemIndex) => {
      const res = resArray[parseInt(itemIndex)];
      for (const account of res) {
        accounts.push(account);
      }
    });

  return accounts.map((account, idx) => {
    if (account === null) {
      return null;
    }
    return {
      publicKey: publicKeys[idx],
      account,
    };
  });
}

module.exports = {
  getMultipleAccounts,
  getFilteredProgramAccounts,
  getFilteredProgramAccountsAmmOrMarketCache,
  findProgramAddress,
  createAmmAuthority,
  commitment,
};
