use super::{Challenge, DataKey, SkillStakeContract, SkillStakeContractClient};
use soroban_sdk::{testutils::Address as _, Address, Env, String};

fn setup() -> (Env, Address, Address, Address) {
    let env = Env::default();
    let admin = Address::generate(&env);
    let creator = Address::generate(&env);
    let voter = Address::generate(&env);
    let client = SkillStakeContractClient::new(&env, &env.register_contract(None, SkillStakeContract));
    client.initialize(&admin, &3);
    (env, admin, creator, voter)
}

#[test]
fn create_and_complete_challenge() {
    let (env, _admin, creator, voter) = setup();
    let client = SkillStakeContractClient::new(&env, &env.register_contract(None, SkillStakeContract));
    let challenge_id = client.create_challenge(&creator, &String::from_str(&env, "30 Days of DSA"), &String::from_str(&env, "Finish thirty days of practice."), &100, &0, &1000);
    assert_eq!(challenge_id, 1);

    let proof_id = client.submit_proof(&challenge_id, &creator, &String::from_str(&env, "Proof"), &String::from_str(&env, "Evidence"), &String::from_str(&env, ""), &String::from_str(&env, ""), &String::from_str(&env, "Evidence text"));
    assert_eq!(proof_id, 2);

    let voter2 = Address::generate(&env);
    let voter3 = Address::generate(&env);
    client.approve_proof(&proof_id, &voter);
    client.approve_proof(&proof_id, &voter2);
    client.approve_proof(&proof_id, &voter3);

    let challenge: Challenge = env.storage().persistent().get(&DataKey::Challenge(challenge_id)).unwrap();
    assert!(challenge.completed);
}

#[test]
fn fail_moves_stake_to_reward_pool() {
    let (env, _admin, creator, voter) = setup();
    let client = SkillStakeContractClient::new(&env, &env.register_contract(None, SkillStakeContract));
    let challenge_id = client.create_challenge(&creator, &String::from_str(&env, "Study 100 Hours"), &String::from_str(&env, "Study intensely."), &250, &0, &1000);
    let proof_id = client.submit_proof(&challenge_id, &creator, &String::from_str(&env, "Proof"), &String::from_str(&env, "Evidence"), &String::from_str(&env, ""), &String::from_str(&env, ""), &String::from_str(&env, "Evidence text"));

    let voter2 = Address::generate(&env);
    let voter3 = Address::generate(&env);
    client.reject_proof(&proof_id, &voter);
    client.reject_proof(&proof_id, &voter2);
    client.reject_proof(&proof_id, &voter3);

    let challenge: Challenge = env.storage().persistent().get(&DataKey::Challenge(challenge_id)).unwrap();
    assert!(challenge.failed);
    assert_eq!(client.reward_pool_balance(), 250);
}
