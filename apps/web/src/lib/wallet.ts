import { create } from "zustand";
import type { WalletProvider } from "../types";
import { isConnected, requestAccess, signTransaction as freighterSignTransaction } from "@stellar/freighter-api";

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
      // 1. Try using the npm package first
      const hasFreighter = await isConnected();
      if (hasFreighter) {
        const result = await requestAccess();
        if (result && typeof result === "object") {
          const resObj = result as any;
          if (resObj.error) {
            throw new Error(typeof resObj.error === "string" ? resObj.error : resObj.error.message || "Failed to connect");
          }
          if (resObj.address) {
            set({ provider: "freighter", address: resObj.address, connected: true, connecting: false });
            return;
          }
        } else if (typeof result === "string") {
          set({ provider: "freighter", address: result, connected: true, connecting: false });
          return;
        }
      }

      // 2. Fallback to window.freighterApi or window.freighter
      if (typeof window !== "undefined") {
        const fApi = window.freighterApi || (window as any).freighter;
        if (fApi) {
          const res = await fApi.requestAccess();
          const publicKey = typeof res === "string" ? res : (res && (res.address || res.publicKey)) || (await fApi.getPublicKey());
          if (publicKey) {
            set({ provider: "freighter", address: publicKey, connected: true, connecting: false });
            return;
          }
        }
      }

      throw new Error("Freighter wallet is not installed or detected in your browser.");
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
      set({ provider: "albedo", address: result.pubkey, connected: true, connecting: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Unable to connect Albedo", connecting: false });
      throw error;
    }
  },
  disconnect: () => set({ provider: null, address: null, connected: false, balance: 0 }),
  setBalance: (balance) => set({ balance }),
  setError: (error) => set({ error }),
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
