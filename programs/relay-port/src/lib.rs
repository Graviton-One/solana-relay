#![feature(trivial_bounds)]
use anchor_lang::prelude::*;
use anchor_spl::token::{
    self,
    Transfer
};

#[derive(Accounts)]
pub struct Init<'info> {
    #[account(signer)]
    pub authority: AccountInfo<'info>,
    #[account(init)]
    pub relay_port: ProgramAccount<'info, RelayPort>,
}

#[derive(Accounts)]
pub struct UpdateParameters<'info> {
    #[account(signer)]
    pub authority: AccountInfo<'info>,
    #[account(mut)]
    pub relay_port: ProgramAccount<'info, RelayPort>,
}

fn auth(ctx: &Context<UpdateParameters>) -> ProgramResult {
    let relay_port = &ctx.accounts.relay_port;
    if &relay_port.authority != ctx.accounts.authority.key {
        return Err(ProgramError::Custom(1)); // Arbitrary error.
    }
    Ok(())
}

#[derive(Accounts)]
pub struct Relay<'info> {
    #[account(signer)]
    pub authority: AccountInfo<'info>,
    #[account(mut)]
    pub from: AccountInfo<'info>,
    #[account(mut)]
    pub to: AccountInfo<'info>,
    pub token_program: AccountInfo<'info>,
    pub relay_port: ProgramAccount<'info, RelayPort>,
    #[account(init)]
    pub user_event_data: Loader<'info, RelayEvent>,
}

// solana program state 
#[account]
pub struct RelayPort {
    pub fee: u64,
    pub authority: Pubkey,
}

// user deployed data account to provide info for extractor
#[account(zero_copy)]
pub struct RelayEvent {
    pub to: [u8;64],
    pub dest_chain: [u8;3],
    pub amount: u64,
    pub from: Pubkey,
    pub token_program: Pubkey,
    pub transfer_destination: Pubkey,
}

impl<'a, 'b, 'c, 'info> From<&mut Relay<'info>>
    for CpiContext<'a, 'b, 'c, 'info, Transfer<'info>>
{
    fn from(
        accounts: &mut Relay<'info>
    ) -> CpiContext<'a, 'b, 'c, 'info, Transfer<'info>> {
        let cpi_accounts = Transfer {
            from: accounts.from.clone(),
            to: accounts.to.clone(),
            authority: accounts.authority.clone(),
        };
        let cpi_program = accounts.token_program.clone();
        CpiContext::new(cpi_program, cpi_accounts)
    }
}

#[program]
pub mod relay_port {
    use super::*;

    pub fn init(
        ctx: Context<Init>, 
        fee: u64
    ) -> ProgramResult {
        let relay_port  = &mut ctx.accounts.relay_port;
        relay_port.authority = *ctx.accounts.authority.key;
        relay_port.fee = fee;
        Ok(())
    }

    #[access_control(auth(&ctx))]
    pub fn update_parameters(
        ctx: Context<UpdateParameters>,
        fee: u64,
        owner: Pubkey,
    ) -> ProgramResult {
        let relay_port = &mut ctx.accounts.relay_port;
        relay_port.fee = fee;
        relay_port.authority = owner;
        Ok(())
    }
    
    pub fn relay<'info>(
        ctx: Context<'_,'_,'_,'info,Relay<'info>>,
        amount: u64,
        to: [u8;64],
        dest_chain: [u8;3],
    ) -> ProgramResult {
        let relay_port = &mut ctx.accounts.relay_port;

        if amount < relay_port.fee { return Err(ProgramError::Custom(2)); }
        token::transfer(ctx.accounts.into(), amount)?;

        let event = &mut ctx.accounts.user_event_data.load_init()?;
        event.to = to;
        event.dest_chain = dest_chain;
        event.amount = amount - ctx.accounts.relay_port.fee;
        event.from = ctx.accounts.authority.key.clone();
        event.token_program = ctx.accounts.token_program.key.clone();
        event.transfer_destination = ctx.accounts.to.key.clone();

        Ok(())
    }
}

