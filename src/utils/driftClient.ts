import { AnchorProvider } from "@coral-xyz/anchor";
import {
  BulkAccountLoader,
  DriftClient,
  DriftEnv,
  getMarketsAndOraclesForSubscription,
  initialize,
  UserMap,
} from "@drift-labs/sdk";
import { Connection, PublicKey } from "@solana/web3.js";
import { getWallet } from "./wallet";

export const getDriftClient = async (
  privateKey: string,
  rpcAddress: string,
  env: DriftEnv
) => {
  const sdkConfig = initialize({ env });

  const wallet = getWallet(privateKey);
  const connection = new Connection(rpcAddress);
  const provider = new AnchorProvider(
    connection,
    wallet as any,
    AnchorProvider.defaultOptions()
  );

  const driftPublicKey = new PublicKey(sdkConfig.DRIFT_PROGRAM_ID);
  const bulkAccountLoader = new BulkAccountLoader(
    connection,
    "confirmed",
    1000
  );
  const driftClient = new DriftClient({
    connection,
    wallet: provider.wallet,
    programID: driftPublicKey,
    ...getMarketsAndOraclesForSubscription(env),
    accountSubscription: {
      type: "polling",
      accountLoader: bulkAccountLoader,
    },
  });

  await driftClient.subscribe();

  const userMap = new UserMap(driftClient, {
    type: "polling",
    accountLoader: bulkAccountLoader,
  });

  await userMap.fetchAllUsers();

  return {
    wallet,
    connection,
    provider,
    driftPublicKey,
    bulkAccountLoader,
    driftClient,
    userMap,
  };
};
