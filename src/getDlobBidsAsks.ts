import {
  BASE_PRECISION,
  BigNum,
  convertToNumber,
  DLOB,
  DLOBNode,
  getLimitPrice,
  MarketType,
  OraclePriceData,
  PRICE_PRECISION,
  PRICE_PRECISION_EXP,
  UserMap,
} from "@drift-labs/sdk";
import { OrderBookBidAsk } from "./types/orderbook.type";

type DLOBBidsAsksParams = {
  userMap: UserMap;
  slot: number;
  marketIndex: number;
  marketType: MarketType;
  oraclePriceData: OraclePriceData;
  fallbackBids?: number;
  fallbackAsks?: number;
};

export const getDlobBidsAsks = async (params: DLOBBidsAsksParams) => {
  const { bids: bidNodes, bestBid } = await fetchBids(params);
  const { asks: askNodes, bestAsk } = await fetchAsks(params);

  const nodesToBidAsks = (node: DLOBNode) =>
    dlobNodeToBidAsk(node, params.oraclePriceData, params.slot);

  const bids = bidNodes.map(nodesToBidAsks);
  const asks = askNodes.map(nodesToBidAsks);

  return {
    bids,
    bestBid,
    asks,
    bestAsk,
  };
};

const dlobNodeToBidAsk = (
  node: DLOBNode,
  oraclePriceData: OraclePriceData,
  slot: number
): OrderBookBidAsk => ({
  price: convertToNumber(
    getLimitPrice(node.order!, oraclePriceData, slot),
    PRICE_PRECISION
  ),
  size: convertToNumber(
    node.order!.baseAssetAmount.sub(node.order!.baseAssetAmountFilled),
    BASE_PRECISION
  ),
  type: "dlob",
});

const nodeHasOrder = (node: DLOBNode) => !!node.order;

export const fetchBids = async ({
  userMap,
  slot,
  marketIndex,
  marketType,
  oraclePriceData,
  fallbackBids,
}: DLOBBidsAsksParams) => {
  const dlob = new DLOB();
  await dlob.initFromUserMap(userMap, slot);

  const bidsGenerator = dlob.getMakerLimitBids(
    marketIndex,
    slot,
    marketType,
    oraclePriceData,
    fallbackBids
  );

  const newBids: DLOBNode[] = [];

  for (const bid of bidsGenerator) {
    newBids.push(bid);
  }

  const dlobBestBid = newBids[0]
    ? BigNum.from(
        newBids[0].getPrice(oraclePriceData, slot),
        PRICE_PRECISION_EXP
      ).toNum()
    : undefined;

  return {
    bids: newBids.filter(nodeHasOrder),
    bestBid: dlobBestBid,
  };
};

export const fetchAsks = async ({
  userMap,
  slot,
  marketIndex,
  marketType,
  oraclePriceData,
  fallbackAsks,
}: DLOBBidsAsksParams) => {
  const dlob = new DLOB();
  await dlob.initFromUserMap(userMap, slot);

  const asksGenerator = dlob.getMakerLimitAsks(
    marketIndex,
    slot,
    marketType,
    oraclePriceData,
    fallbackAsks
  );

  const newAsks: DLOBNode[] = [];

  for (const ask of asksGenerator) {
    newAsks.push(ask);
  }

  const dlobBestAsk = newAsks[0]
    ? BigNum.from(
        newAsks[0].getPrice(oraclePriceData, slot),
        PRICE_PRECISION_EXP
      ).toNum()
    : undefined;

  return {
    asks: newAsks.filter(nodeHasOrder),
    bestAsk: dlobBestAsk,
  };
};
