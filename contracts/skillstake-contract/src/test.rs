use super::{Challenge, DataKey, SkillStakeContract, SkillStakeContractClient};
use soroban_sdk::{testutils::Address as _, Address, Env, String, token};

fn setup() -> (Env, Address, Address, Address, token::Client<'static>, SkillStakeContractClient<'static>) {
    let env = Env::default();
    env.mock_all_auths();
    
    let admin = Address::generate(&env);
    let creator = Address::generate(&env);
    let voter = Address::generate(&env);
    
    let token_admin = Address::generate(&env);
    let token_address = env.register_stellar_asset_contract(token_admin);
    let token_client = token::Client::new(&env, &token_address);
    let token_admin_client = token::StellarAssetClient::new(&env, &token_address);
    
    // Mint initial balance to creator to allow staking
    token_admin_client.mint(&creator, &1000);
    
    let contract_id = env.register(SkillStakeContract, ());
    let client = SkillStakeContractClient::new(&env, &contract_id);
    client.initialize(&admin, &3, &token_address);
    
    (env, admin, creator, voter, token_client, client)
}

#[test]
fn create_and_complete_challenge() {
    let (env, _admin, creator, voter, token_client, client) = setup();
    
    // Creator balance before staking: 1000
    assert_eq!(token_client.balance(&creator), 1000);
    
    let challenge_id = client.create_challenge(
        &creator, 
        &String::from_str(&env, "30 Days of DSA"), 
        &String::from_str(&env, "Finish thirty days of practice."), 
        &100, 
        &0, 
        &1000
    );
    assert_eq!(challenge_id, 1);
    
    // Creator balance after locking 100 XLM stake: 900
    assert_eq!(token_client.balance(&creator), 900);

    let proof_id = client.submit_proof(
        &challenge_id, 
        &creator, 
        &String::from_str(&env, "Proof"), 
        &String::from_str(&env, "Evidence"), 
        &String::from_str(&env, ""), 
        &String::from_str(&env, ""), 
        &String::from_str(&env, "Evidence text")
    );
    assert_eq!(proof_id, 2);

    let voter2 = Address::generate(&env);
    let voter3 = Address::generate(&env);
    client.approve_proof(&proof_id, &voter);
    client.approve_proof(&proof_id, &voter2);
    client.approve_proof(&proof_id, &voter3);

    let challenge = client.challenge(&challenge_id);
    assert!(challenge.completed);
    
    // Creator balance after approval (stake released): 1000
    assert_eq!(token_client.balance(&creator), 1000);
}

#[test]
fn fail_moves_stake_to_reward_pool() {
    let (env, admin, creator, voter, token_client, client) = setup();
    
    let challenge_id = client.create_challenge(
        &creator, 
        &String::from_str(&env, "Study 100 Hours"), 
        &String::from_str(&env, "Study intensely."), 
        &250, 
        &0, 
        &1000
    );
    let proof_id = client.submit_proof(
        &challenge_id, 
        &creator, 
        &String::from_str(&env, "Proof"), 
        &String::from_str(&env, "Evidence"), 
        &String::from_str(&env, ""), 
        &String::from_str(&env, ""), 
        &String::from_str(&env, "Evidence text")
    );

    let voter2 = Address::generate(&env);
    let voter3 = Address::generate(&env);
    client.reject_proof(&proof_id, &voter);
    client.reject_proof(&proof_id, &voter2);
    client.reject_proof(&proof_id, &voter3);

    let challenge = client.challenge(&challenge_id);
    assert!(challenge.failed);
    
    // Creator balance remains 750 (250 lost)
    assert_eq!(token_client.balance(&creator), 750);
    // Stake moved to Reward Pool Treasury (Admin address): 250
    assert_eq!(token_client.balance(&admin), 250);
    assert_eq!(client.reward_pool_balance(), 250);
}
