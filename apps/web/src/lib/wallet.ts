import { create } from "zustand";
import type { WalletProvider } from "../types";
import { isConnected, requestAccess, signTransaction as freighterSignTransaction } from "@stellar/freighter-api";
import { api } from "./api";

declare global {
  interface Window {
    freighterApi?: {
      isConnected: () => Promise<boolean>;
      requestAccess: () => Promise<{ publicKey: string } | string>;
      getPublicKey: () => Promise<string>;
      signTransaction: (xdr: string, opts?: { networkPassphrase?: string }) => Promise<string>;
    };
    albedo?: {
      publicKey: (opts?: { network?: string }) => Promise<{ pubkey: string }>;
      tx: (xdr: string, opts?: { network?: string }) => Promise<{ signed_tx_xdr: string }>;
    };
  }
}

interface WalletState {
  provider: WalletProvider | null;
  address: string | null;
  network: "mainnet" | "testnet";
  connected: boolean;
  balance: number;
  connecting: boolean;
  error: string | null;
  connectFreighter: () => Promise<void>;
  connectAlbedo: () => Promise<void>;
  disconnect: () => void;
  setBalance: (balance: number) => void;
  setError: (error: string | null) => void;
  initializeSession: () => Promise<void>;
}

export const useWalletStore = create<WalletState>((set) => ({
  provider: null,
  address: null,
  network: "mainnet",
  connected: false,
  balance: 0,
  connecting: false,
  error: null,
  connectFreighter: async () => {
    set({ connecting: true, error: null });
    try {
      let publicKey = "";
      const hasFreighter = await isConnected();
      if (hasFreighter) {
        const result = await requestAccess();
        if (result && typeof result === "object") {
          const resObj = result as any;
          if (resObj.error) {
            throw new Error(typeof resObj.error === "string" ? resObj.error : resObj.error.message || "Failed to connect");
          }
          if (resObj.address) {
            publicKey = resObj.address;
          }
        } else if (typeof result === "string") {
          publicKey = result;
        }
      }

      if (!publicKey && typeof window !== "undefined") {
        const fApi = window.freighterApi || (window as any).freighter;
        if (fApi) {
          const res = await fApi.requestAccess();
          publicKey = typeof res === "string" ? res : (res && (res.address || res.publicKey)) || (await fApi.getPublicKey());
        }
      }

      if (!publicKey) {
        throw new Error("Freighter wallet is not installed or detected in your browser.");
      }

      // Step 2: Request auth challenge from backend
      const authChallenge = await api.getNonce(publicKey);

      // Step 3: Sign auth challenge transaction
      const signedXdr = await signTransaction(authChallenge.xdr, "freighter");

      // Step 4: Verify with backend
      const authSession = await api.verifyAuth({ walletAddress: publicKey, signedXdr });

      // Step 5: Save session & update state
      localStorage.setItem("skillstake_jwt", authSession.token);
      localStorage.setItem("skillstake_preferred_wallet", "freighter");
      set({ provider: "freighter", address: publicKey, connected: true, connecting: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Unable to connect Freighter", connecting: false });
      throw error;
    }
  },
  connectAlbedo: async () => {
    set({ connecting: true, error: null });
    try {
      if (!window.albedo) {
        throw new Error("Albedo is not available");
      }
      const result = await window.albedo.publicKey({ network: "public" });
      const publicKey = result.pubkey;

      // Step 2: Request auth challenge from backend
      const authChallenge = await api.getNonce(publicKey);

      // Step 3: Sign auth challenge transaction
      const signedXdr = await signTransaction(authChallenge.xdr, "albedo");

      // Step 4: Verify with backend
      const authSession = await api.verifyAuth({ walletAddress: publicKey, signedXdr });

      // Step 5: Save session & update state
      localStorage.setItem("skillstake_jwt", authSession.token);
      localStorage.setItem("skillstake_preferred_wallet", "albedo");
      set({ provider: "albedo", address: publicKey, connected: true, connecting: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Unable to connect Albedo", connecting: false });
      throw error;
    }
  },
  disconnect: () => {
    localStorage.removeItem("skillstake_jwt");
    localStorage.removeItem("skillstake_preferred_wallet");
    set({ provider: null, address: null, connected: false, balance: 0 });
  },
  setBalance: (balance) => set({ balance }),
  setError: (error) => set({ error }),
  initializeSession: async () => {
    const token = localStorage.getItem("skillstake_jwt");
    if (!token) return;
    try {
      const payloadBase64 = token.split(".")[1];
      if (!payloadBase64) return;
      // Decode JWT payload
      const decodedPayload = JSON.parse(atob(payloadBase64));
      const address = decodedPayload.walletAddress;
      const preferredWallet = localStorage.getItem("skillstake_preferred_wallet") as WalletProvider || "freighter";
      if (address) {
        set({ provider: preferredWallet, address, connected: true });
        try {
          const balRes = await api.balance(address);
          set({ balance: balRes.balance });
        } catch (e) {
          console.warn("Failed to fetch balance on session restore:", e);
        }
      }
    } catch (e) {
      console.warn("Failed to restore wallet session:", e);
      localStorage.removeItem("skillstake_jwt");
    }
  },
}));

export function useWallet() {
  return useWalletStore();
}

export async function signTransaction(xdr: string, provider: WalletProvider | null) {
  if (provider === "freighter") {
    const passphrase = import.meta.env.VITE_STELLAR_NETWORK_PASSPHRASE || "Test SDF Network ; September 2015";
    try {
      const signed = await freighterSignTransaction(xdr, {
        networkPassphrase: passphrase
      });
      if (typeof signed === "string") {
        return signed;
      }
      if (signed && typeof signed === "object") {
        const signedObj = signed as any;
        if (signedObj.signedTxXdr) {
          return signedObj.signedTxXdr;
        }
        if (signedObj.error) {
          throw new Error(typeof signedObj.error === "string" ? signedObj.error : signedObj.error.message || "Signing failed");
        }
      }
    } catch (err) {
      console.warn("NPM signTransaction failed, trying fallback:", err);
    }

    // Fallback to window.freighterApi or window.freighter
    if (typeof window !== "undefined") {
      const fApi = window.freighterApi || (window as any).freighter;
      if (fApi) {
        const signed = await fApi.signTransaction(xdr, { networkPassphrase: passphrase });
        if (typeof signed === "string") {
          return signed;
        }
        const signedObj = signed as any;
        if (signedObj && signedObj.signedTxXdr) {
          return signedObj.signedTxXdr;
        }
      }
    }
    throw new Error("Freighter is not available to sign the transaction");
  }
  if (provider === "albedo") {
    if (!window.albedo) throw new Error("Albedo is not available");
    const signed = await window.albedo.tx(xdr, { network: "public" });
    return signed.signed_tx_xdr;
  }
  throw new Error("Wallet not connected");
}
