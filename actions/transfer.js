const anchor = require('@project-serum/anchor');
const BN = anchor.BN;
const { PublicKey } = require('@solana/web3.js')
const { TOKEN_PROGRAM_ID } = require('@solana/spl-token');
const SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID = new PublicKey(
  'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
);

async function findAssociatedTokenAddress(
    walletAddress,
    tokenMintAddress,
) {
    return (await PublicKey.findProgramAddress(
        [
            walletAddress.toBuffer(),
            TOKEN_PROGRAM_ID.toBuffer(),
            tokenMintAddress.toBuffer(),
        ],
        SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID
    ))[0];
}

// Configure the local cluster.
anchor.setProvider(anchor.Provider.env());

async function main() {
  const programId = new anchor.web3.PublicKey('GZh7Rbi4x66yjyW6P5mnLAB1vu4J3vkRJ72fvjnwAiJB');
  const idl = JSON.parse(require('fs').readFileSync('../target/idl/relay_port.json', 'utf8'));
  const program = new anchor.Program(idl, programId);

  const me = anchor.getProvider().wallet.payer;

    const GtonTokenMint = new PublicKey("4hJ6sjwmsvvFag6TKL97yhWiBSDX9BABWoiXgb3EPXxB")
    const tokenProgram = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")
    const relayPort = new PublicKey("FjjBrAVteZzeZXnubmKPuCk4FE11Xv9cpc8w7dk5Dp9v")

    let userEventDataAccount = anchor.web3.Keypair.generate();
    // let external_to = new Array(64).fill(0);
    const external_to = new PublicKey("9AEnGKa5KDy1L8mRTWCb7Dcx8NddPacpvPFkUetX3YQP");

    // let destChain = new Array(3).fill(0);
    let destChain = [83, 79, 76];

    const acoc = await findAssociatedTokenAddress(me.publicKey, GtonTokenMint);
    const acocTo = await findAssociatedTokenAddress(external_to, GtonTokenMint);
    console.log(userEventDataAccount.publicKey.toString());

  console.log(relayPort);
    await program.rpc.relay(
        new BN(200),
        external_to.toBytes(),
        destChain,
        {
            accounts: {
                authority: me.publicKey,
                from: acoc,
                to: acocTo,
                tokenProgram: tokenProgram,
                relayPort: relayPort,
                userEventData: userEventDataAccount.publicKey,
            },
            instructions: [
                await program.account.relayEvent.createInstruction(userEventDataAccount),
            ],
            signers: [
                userEventDataAccount,
            ],
        }
    );
    let result = await program.account.relayEvent.fetch(userEventDataAccount.publicKey);
    console.log(result);

}

console.log('Running client.');
main().then(() => console.log('Success'));
