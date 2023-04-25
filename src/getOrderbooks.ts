import {
  MarketType,
  OraclePriceData,
  PerpMarketAccount,
  UserMap,
} from "@drift-labs/sdk";
import { getDlobBidsAsks } from "./getDlobBidsAsks";
import { getVammBidsAsks } from "./getVAMMBidsAsks";
import { OrderBookBidAsk } from "./types/orderbook.type";

type DLOBLiquidityParams = {
  groupingSize: number;
  rows: number;

  userMap: UserMap;
  marketIndex: number;
  slot: number;
  marketAccount: PerpMarketAccount;
  oraclePriceData: OraclePriceData;
};

export const getOrderbooks = async ({
  groupingSize,
  rows,
  userMap,
  marketIndex,
  slot,
  marketAccount,
  oraclePriceData,
}: DLOBLiquidityParams) => {
  const {
    bids: dlobBids,
    asks: dlobAsks,
    bestBid: bestDlobBid,
    bestAsk: bestDlobAsk,
  } = await getDlobBidsAsks({
    userMap,
    slot,
    marketIndex,
    marketType: MarketType.PERP,
    oraclePriceData,
  });

  const {
    bids: vammBids,
    asks: vammAsks,
    bestBid: bestVammBid,
    bestAsk: bestVammAsk,
  } = await getVammBidsAsks({
    marketAccount,
    groupingSize,
    oraclePriceData,
    rows,
  });

  //   const {
  //     bids: serumBids,
  //     asks: serumAsks,
  //     bestBid: bestSerumBid,
  //     bestAsk: bestSerumAsk,
  //   } = await useSerumBidsAndAsks();

  const mergedBidsAsks = mergeBidsAndAsks(
    [dlobBids, vammBids],
    [dlobAsks, vammAsks],
    [bestDlobBid!, bestVammBid!],
    [bestDlobAsk!, bestVammAsk!]
  );

  const bids = mergedBidsAsks.bids.filter((bid) => bid.price > 0);
  const asks = mergedBidsAsks.asks.filter((ask) => ask.price > 0);
  const { bestBid, bestAsk } = mergedBidsAsks;

  return {
    bids,
    asks,
    bestBid,
    bestAsk,
  };
};

export const mergeBidsAndAsks = (
  bids: OrderBookBidAsk[][],
  asks: OrderBookBidAsk[][],
  bestBids: number[],
  bestAsks: number[]
) => {
  const bestBid = bestBids.reduce((prev, curr) => (prev > curr ? prev : curr));
  const bestAsk = bestAsks.reduce((prev, curr) => (prev < curr ? prev : curr));

  return {
    bids: bids.flatMap((bid) => bid).sort((a, b) => b.price - a.price),
    asks: asks.flatMap((ask) => ask).sort((a, b) => a.price - b.price),
    bestBid,
    bestAsk,
  };
};
