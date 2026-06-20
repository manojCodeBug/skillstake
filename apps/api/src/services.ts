import { env } from "./config";

let sdkPromise: Promise<any> | null = null;

async function stellarSdk() {
  sdkPromise ??= import("@stellar/stellar-sdk");
  return sdkPromise;
}

export function explorerUrl(txHash: string) {
  return `${env.VITE_STELLAR_EXPLORER_BASE}/${txHash}`;
}

export async function horizonServer() {
  const sdk: any = await stellarSdk();
  return new sdk.Server(env.VITE_HORIZON_URL);
}

export async function sorobanServer() {
  const sdk: any = await stellarSdk();
  return new sdk.SorobanRpc.Server(env.VITE_SOROBAN_RPC_URL);
}

export async function fetchXlmBalance(address: string) {
  try {
    const server: any = await horizonServer();
    const account = await server.accounts().accountId(address).call();
    const balanceEntry = account.balances.find((entry: { asset_type: string; balance: string }) => entry.asset_type === "native");
    return Number(balanceEntry?.balance ?? "0");
  } catch (error) {
    // If the account does not exist on Horizon yet, it will throw a 404 error.
    // Return 0 instead of propagating the error.
    return 0;
  }
}

export async function loadAccount(address: string) {
  const server: any = await horizonServer();
  return server.loadAccount(address);
}

export async function prepareSendXlmTx(args: { source: string; destination: string; amount: string; memo?: string }) {
  const sdk: any = await stellarSdk();
  const sourceAccount = await loadAccount(args.source);
  const builder = new sdk.TransactionBuilder(sourceAccount, {
    fee: sdk.BASE_FEE,
    networkPassphrase: env.VITE_STELLAR_NETWORK_PASSPHRASE,
  });

  builder.addOperation(
    sdk.Operation.payment({
      destination: args.destination,
      asset: sdk.Asset.native(),
      amount: args.amount,
    }),
  );

  if (args.memo) {
    builder.addMemo(sdk.Memo.text(args.memo));
  } else {
    builder.addMemo(sdk.Memo.none());
  }

  return builder.setTimeout(180).build().toXDR();
}

export async function buildContractTxXdr(method: string, args: unknown[], sourceAddress: string) {
  const sdk: any = await stellarSdk();
  const account = await loadAccount(sourceAddress);
  const builder = new sdk.TransactionBuilder(account, {
    fee: sdk.BASE_FEE,
    networkPassphrase: env.VITE_STELLAR_NETWORK_PASSPHRASE,
  });

  builder.addOperation(
    sdk.Operation.invokeContractFunction({
      contract: env.VITE_CONTRACT_ID,
      functionName: method,
      args: args.map((value) => sdk.nativeToScVal(value)),
    }),
  );

  return builder.setTimeout(180).build().toXDR();
}

export async function submitTransactionXdr(xdr: string) {
  const server: any = await sorobanServer();
  return server.sendTransaction(xdr);
}

export async function fetchContractEvents(cursor?: string) {
  const server: any = await sorobanServer();
  const response = await server.getEvents({
    startLedger: undefined,
    filters: [{ type: "contract", contractIds: [env.VITE_CONTRACT_ID] }],
    cursor,
    limit: 25,
    order: "desc",
  });
  return response.events;
}
