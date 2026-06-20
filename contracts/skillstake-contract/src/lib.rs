#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, String, Vec};

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    VerificationThreshold,
    RewardPoolBalance,
    Counter,
    Challenge(u64),
    Proof(u64),
    Vote(u64, Address),
}

#[contracttype]
#[derive(Clone)]
pub struct Challenge {
    pub creator: Address,
    pub title: String,
    pub description: String,
    pub stake_amount: i128,
    pub start_time: u64,
    pub end_time: u64,
    pub active: bool,
    pub completed: bool,
    pub failed: bool,
}

#[contracttype]
#[derive(Clone)]
pub struct Proof {
    pub challenge_id: u64,
    pub submitter: Address,
    pub title: String,
    pub description: String,
    pub github_url: String,
    pub external_url: String,
    pub text_evidence: String,
    pub approved: bool,
    pub rejected: bool,
    pub approval_votes: u32,
    pub rejection_votes: u32,
}

#[contract]
pub struct SkillStakeContract;

#[contractimpl]
impl SkillStakeContract {
    pub fn initialize(env: Env, admin: Address, verification_threshold: u32) {
        admin.require_auth();
        env.storage().persistent().set(&DataKey::Admin, &admin);
        env.storage().persistent().set(&DataKey::VerificationThreshold, &verification_threshold);
        env.storage().persistent().set(&DataKey::RewardPoolBalance, &0i128);
        env.storage().persistent().set(&DataKey::Counter, &0u64);
    }

    pub fn create_challenge(
        env: Env,
        creator: Address,
        title: String,
        description: String,
        stake_amount: i128,
        start_time: u64,
        end_time: u64,
    ) -> u64 {
        creator.require_auth();
        let id = Self::next_id(&env);
        let challenge = Challenge {
            creator: creator.clone(),
            title,
            description,
            stake_amount,
            start_time,
            end_time,
            active: true,
            completed: false,
            failed: false,
        };
        env.storage().persistent().set(&DataKey::Challenge(id), &challenge);
        env.events().publish(("challenge_created", id), creator);
        id
    }

    pub fn submit_proof(
        env: Env,
        challenge_id: u64,
        submitter: Address,
        title: String,
        description: String,
        github_url: String,
        external_url: String,
        text_evidence: String,
    ) -> u64 {
        submitter.require_auth();
        let challenge = Self::get_challenge(&env, challenge_id);
        assert!(challenge.active, "challenge inactive");
        let id = Self::next_id(&env);
        let proof = Proof {
            challenge_id,
            submitter: submitter.clone(),
            title,
            description,
            github_url,
            external_url,
            text_evidence,
            approved: false,
            rejected: false,
            approval_votes: 0,
            rejection_votes: 0,
        };
        env.storage().persistent().set(&DataKey::Proof(id), &proof);
        env.events().publish(("proof_submitted", id), submitter);
        id
    }

    pub fn approve_proof(env: Env, proof_id: u64, voter: Address) {
        voter.require_auth();
        let mut proof = Self::get_proof(&env, proof_id);
        let challenge = Self::get_challenge(&env, proof.challenge_id);
        assert!(voter != proof.submitter && voter != challenge.creator, "self-voting is not allowed");
        assert!(!proof.approved && !proof.rejected, "vote closed");
        Self::register_vote(&env, proof_id, &voter, true);
        proof.approval_votes += 1;
        if proof.approval_votes >= Self::verification_threshold(&env) {
            proof.approved = true;
            env.storage().persistent().set(&DataKey::Proof(proof_id), &proof);
            Self::complete_challenge_internal(&env, proof.challenge_id);
        } else {
            env.storage().persistent().set(&DataKey::Proof(proof_id), &proof);
        }
        env.events().publish(("proof_approved", proof_id), voter);
    }

    pub fn reject_proof(env: Env, proof_id: u64, voter: Address) {
        voter.require_auth();
        let mut proof = Self::get_proof(&env, proof_id);
        let challenge = Self::get_challenge(&env, proof.challenge_id);
        assert!(voter != proof.submitter && voter != challenge.creator, "self-voting is not allowed");
        assert!(!proof.approved && !proof.rejected, "vote closed");
        Self::register_vote(&env, proof_id, &voter, false);
        proof.rejection_votes += 1;
        if proof.rejection_votes >= Self::verification_threshold(&env) {
            proof.rejected = true;
            env.storage().persistent().set(&DataKey::Proof(proof_id), &proof);
            Self::fail_challenge_internal(&env, proof.challenge_id);
        } else {
            env.storage().persistent().set(&DataKey::Proof(proof_id), &proof);
        }
        env.events().publish(("proof_rejected", proof_id), voter);
    }

    pub fn complete_challenge(env: Env, challenge_id: u64) {
        Self::complete_challenge_internal(&env, challenge_id);
    }

    pub fn fail_challenge(env: Env, challenge_id: u64) {
        Self::fail_challenge_internal(&env, challenge_id);
    }

    pub fn reward_pool_balance(env: Env) -> i128 {
        env.storage().persistent().get(&DataKey::RewardPoolBalance).unwrap_or(0i128)
    }

    fn verification_threshold(env: &Env) -> u32 {
        env.storage()
            .persistent()
            .get(&DataKey::VerificationThreshold)
            .unwrap_or(3u32)
    }

    fn next_id(env: &Env) -> u64 {
        let current = env.storage().persistent().get(&DataKey::Counter).unwrap_or(0u64);
        env.storage().persistent().set(&DataKey::Counter, &(current + 1));
        current + 1
    }

    fn register_vote(env: &Env, proof_id: u64, voter: &Address, approved: bool) {
        let key = DataKey::Vote(proof_id, voter.clone());
        assert!(env.storage().persistent().get::<_, bool>(&key).is_none(), "duplicate vote");
        env.storage().persistent().set(&key, &approved);
    }

    fn get_challenge(env: &Env, id: u64) -> Challenge {
        env.storage().persistent().get(&DataKey::Challenge(id)).expect("missing challenge")
    }

    fn get_proof(env: &Env, id: u64) -> Proof {
        env.storage().persistent().get(&DataKey::Proof(id)).expect("missing proof")
    }

    fn complete_challenge_internal(env: &Env, challenge_id: u64) {
        let mut challenge = Self::get_challenge(env, challenge_id);
        challenge.active = false;
        challenge.completed = true;
        env.storage().persistent().set(&DataKey::Challenge(challenge_id), &challenge);
        env.events().publish(("challenge_completed", challenge_id), challenge.creator);
    }

    fn fail_challenge_internal(env: &Env, challenge_id: u64) {
        let mut challenge = Self::get_challenge(env, challenge_id);
        challenge.active = false;
        challenge.failed = true;
        env.storage().persistent().set(&DataKey::Challenge(challenge_id), &challenge);
        let balance = Self::reward_pool_balance(env) + challenge.stake_amount;
        env.storage().persistent().set(&DataKey::RewardPoolBalance, &balance);
        env.events().publish(("challenge_failed", challenge_id), challenge.creator);
    }
}

#[cfg(test)]
mod test;
