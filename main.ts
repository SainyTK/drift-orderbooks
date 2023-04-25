import { getDriftClient } from "./src/utils/driftClient";
import { getOrderbooks } from "./src/getOrderbooks";
import { displayOrderbook } from "./src/utils/display";
import dotenv from "dotenv";

dotenv.config();

const main = async () => {
  const env = "mainnet-beta";
  const privateKey = process.env.BOT_PRIVATE_KEY as string; // stored as an array string
  const rpcAddress = process.env.RPC_ADDRESS as string; // can use: https://api.devnet.solana.com for devnet; https://api.mainnet-beta.solana.com for mainnet;
  const { bulkAccountLoader, driftClient, userMap } = await getDriftClient(
    privateKey,
    rpcAddress,
    env
  );

  const marketIndex = 0; // Change market index here, 0 = "SOL"

  const oraclePriceData = driftClient.getOracleDataForPerpMarket(marketIndex);
  const marketAccount = driftClient.getPerpMarketAccount(marketIndex);

  setInterval(async () => {
    const orderbookData = await getOrderbooks({
      groupingSize: 10,
      rows: 10,
      userMap,
      marketIndex,
      slot: bulkAccountLoader.mostRecentSlot,
      marketAccount: marketAccount!,
      oraclePriceData,
    });

    displayOrderbook(orderbookData);
  }, 1000);
};

main();
