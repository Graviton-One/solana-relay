const anchor = require('@project-serum/anchor');
const BN = anchor.BN;

// Configure the local cluster.
anchor.setProvider(anchor.Provider.env());

async function main() {
  const programId = new anchor.web3.PublicKey('GZh7Rbi4x66yjyW6P5mnLAB1vu4J3vkRJ72fvjnwAiJB');
  const idl = JSON.parse(require('fs').readFileSync('../target/idl/relay_port.json', 'utf8'));
  const program = new anchor.Program(idl, programId);

  const relayPort = anchor.web3.Keypair.generate();
  const authority = anchor.getProvider().wallet.payer;

  console.log(relayPort);

  let r = await program.rpc.init(
        new BN(0),
    {
      accounts: { 
        relayPort: relayPort.publicKey,
        authority: authority.publicKey,
      },
      signers: [
        relayPort,
        authority,
      ],
      instructions: [
          await program.account.relayPort.createInstruction(relayPort),
      ],
    });

}

console.log('Running client.');
main().then(() => console.log('Success'));
