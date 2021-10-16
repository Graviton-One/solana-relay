const anchor = require("@project-serum/anchor");
var debug = require("debug");
var log = debug("myapp");
const TOKEN_PROGRAM_ID = require("@solana/spl-token").TOKEN_PROGRAM_ID;
const PublicKey = anchor.web3.PublicKey;
const BN = anchor.BN;
const assert = require("assert");
const splToken = require("@solana/spl-token");

anchor.setProvider(anchor.Provider.local());

const program = anchor.workspace.RelayPort;
const provider = program.provider;

const me = provider.wallet.payer;
const receiver = anchor.web3.Keypair.generate();
const relayPort = anchor.web3.Keypair.generate();
const authority = anchor.web3.Keypair.generate();
const connection = provider.connection;

describe("relay-port", async () => {
  it("Initializes test state", async () => {
    log(me);
    const mint = await splToken.Token.createMint(
      connection,
      me,
      me.publicKey,
      null,
      9,
      splToken.TOKEN_PROGRAM_ID
    );

    console.log("mint public address: " + mint.publicKey.toBase58());

    //get the token accont of this solana address, if it does not exist, create it
    from = await mint.getOrCreateAssociatedAccountInfo(me.publicKey);

    to = await mint.getOrCreateAssociatedAccountInfo(receiver.publicKey);

    console.log("token public address: " + from.address.toBase58());

    //minting 100 new tokens to the token address we just created
    await mint.mintTo(from.address, me.publicKey, [], 1000000000);
  });

  it("Creat port", async () => {
    await program.rpc.init(new BN(1), {
      accounts: {
        relayPort: relayPort.publicKey,
        authority: authority.publicKey,
      },
      signers: [relayPort, authority],
      instructions: [
        await program.account.relayPort.createInstruction(relayPort),
      ],
    });
  });

  it("Updates port", async () => {
    await program.rpc.updateParameters(
      new BN(0), // transfer_lower_limit
      program.provider.wallet.publicKey,
      {
        accounts: {
          relayPort: relayPort.publicKey,
          authority: authority.publicKey,
        },
        signers: [authority],
      }
    );
  });

  it("relay transfer", async () => {
    let userEventDataAccount = anchor.web3.Keypair.generate();
    let external_to = new Array(64).fill(0);
    let destChain = new Array(3).fill(0);

    await program.rpc.relay(new BN(100), external_to, destChain, {
      accounts: {
        authority: me.publicKey,
        from: from.address,
        to: to.address,
        tokenProgram: TOKEN_PROGRAM_ID,
        relayPort: relayPort.publicKey,
        userEventData: userEventDataAccount.publicKey,
      },
      instructions: [
        await program.account.relayEvent.createInstruction(
          userEventDataAccount
        ),
      ],
      signers: [userEventDataAccount],
    });
    let result = await program.account.relayEvent.fetch(
      userEventDataAccount.publicKey
    );
    log(result);
  });
});

const serumCmn = require("@project-serum/common");
const TokenInstructions = require("@project-serum/serum").TokenInstructions;

async function getTokenAccount(provider, addr) {
  return await serumCmn.getTokenAccount(provider, addr);
}

async function getMintInfo(provider, mintAddr) {
  return await serumCmn.getMintInfo(provider, mintAddr);
}

async function createMint(provider, authority) {
  if (authority === undefined) {
    authority = provider.wallet.publicKey;
  }
  const mint = anchor.web3.Keypair.generate();
  const instructions = await createMintInstructions(
    provider,
    authority,
    mint.publicKey
  );

  const tx = new anchor.web3.Transaction();
  tx.add(...instructions);

  await provider.send(tx, [mint]);

  return mint.publicKey;
}

async function createMintInstructions(provider, authority, mint) {
  let instructions = [
    anchor.web3.SystemProgram.createAccount({
      fromPubkey: provider.wallet.publicKey,
      newAccountPubkey: mint,
      space: 82,
      lamports: await provider.connection.getMinimumBalanceForRentExemption(82),
      programId: TOKEN_PROGRAM_ID,
    }),
    TokenInstructions.initializeMint({
      mint,
      decimals: 10,
      mintAuthority: authority,
    }),
  ];
  return instructions;
}

async function createTokenAccount(provider, mint, owner) {
  const vault = anchor.web3.Keypair.generate();
  const tx = new anchor.web3.Transaction();
  tx.add(
    ...(await createTokenAccountInstrs(provider, vault.publicKey, mint, owner))
  );
  await provider.send(tx, [vault]);
  return vault.publicKey;
}

async function createTokenAccountInstrs(
  provider,
  newAccountPubkey,
  mint,
  owner,
  lamports
) {
  if (lamports === undefined) {
    lamports = await provider.connection.getMinimumBalanceForRentExemption(165);
  }
  return [
    anchor.web3.SystemProgram.createAccount({
      fromPubkey: provider.wallet.publicKey,
      newAccountPubkey,
      space: 165,
      lamports,
      programId: TOKEN_PROGRAM_ID,
    }),
    TokenInstructions.initializeAccount({
      account: newAccountPubkey,
      mint,
      owner,
    }),
  ];
}
