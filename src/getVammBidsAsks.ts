import {
  AMM_RESERVE_PRECISION_EXP,
  BigNum,
  BN,
  calculateMarketOpenBidAsk,
  calculatePrice,
  calculateSpreadReserves,
  calculateUpdatedAMM,
  OraclePriceData,
  PEG_PRECISION,
  PerpMarketAccount,
  PRICE_PRECISION,
  PRICE_PRECISION_EXP,
  squareRootBN,
  standardizeBaseAssetAmount,
  ZERO,
} from "@drift-labs/sdk";
import { OrderBookBidAsk } from "./types/orderbook.type";

type VammBidsAsksParams = {
  marketAccount: PerpMarketAccount;
  groupingSize: number;
  oraclePriceData: OraclePriceData;
  rows: number;
};

export const getVammBidsAsks = async ({
  marketAccount,
  groupingSize,
  oraclePriceData,
  rows,
}: VammBidsAsksParams) => {
  const orderStepSize = marketAccount.amm.orderStepSize;
  const orderTickSize = marketAccount.amm.orderTickSize;
  const groupingSizeBN = new BN(groupingSize);
  const defaultSlippageBN = groupingSizeBN.mul(orderTickSize);

  const bids: Array<OrderBookBidAsk> = [];
  const asks: Array<OrderBookBidAsk> = [];

  let prevCumSizeAsk = 0;
  let prevCumSizeBid = 0;

  const updatedAmm = calculateUpdatedAMM(marketAccount.amm, oraclePriceData);

  const [openBids, openAsks] = calculateMarketOpenBidAsk(
    updatedAmm.baseAssetReserve,
    updatedAmm.minBaseAssetReserve,
    updatedAmm.maxBaseAssetReserve,
    updatedAmm.orderStepSize
  );

  const now = new BN(Date.now() / 1000);

  const invariant = updatedAmm.sqrtK.mul(updatedAmm.sqrtK);
  const pegMultiplier = updatedAmm.pegMultiplier;
  const [bidReserves, askReserves] = calculateSpreadReserves(
    updatedAmm,
    oraclePriceData,
    now
  );

  const bidPrice = calculatePrice(
    bidReserves.baseAssetReserve,
    bidReserves.quoteAssetReserve,
    pegMultiplier
  );
  const askPrice = calculatePrice(
    askReserves.baseAssetReserve,
    askReserves.quoteAssetReserve,
    pegMultiplier
  );

  const openBidsNum = BigNum.from(
    openBids.abs(),
    AMM_RESERVE_PRECISION_EXP
  ).toNum();

  const openAsksNum = BigNum.from(
    openAsks.abs(),
    AMM_RESERVE_PRECISION_EXP
  ).toNum();

  const addLiquidityForBidAskRow = (side: "bid" | "ask", row: number) => {
    const isAskSide = side === "ask";

    const prevCumSize = isAskSide ? prevCumSizeAsk : prevCumSizeBid;

    const baseAssetReserve = isAskSide
      ? askReserves.baseAssetReserve
      : bidReserves.baseAssetReserve;

    // The price to calculate liquidity for
    const targetPriceForLiquidityCalculation = isAskSide
      ? askPrice
          .add(defaultSlippageBN.mul(new BN(row)))
          .sub(askPrice.mod(defaultSlippageBN))
      : bidPrice
          .sub(defaultSlippageBN.mul(new BN(row)))
          .sub(bidPrice.mod(defaultSlippageBN));

    if (targetPriceForLiquidityCalculation.eq(ZERO)) {
      return;
    }

    const liquidityBN = calculateLiquidity(
      invariant,
      baseAssetReserve,
      pegMultiplier,
      targetPriceForLiquidityCalculation
    );

    if (liquidityBN.gt(ZERO)) {
      const standardizedLiquidity = standardizeBaseAssetAmount(
        liquidityBN,
        orderStepSize
      );

      const currentCumSize = Math.min(
        BigNum.from(standardizedLiquidity, AMM_RESERVE_PRECISION_EXP).toNum(),
        isAskSide ? openAsksNum : openBidsNum
      );

      const currentSize = currentCumSize - prevCumSize;

      const entryPrice = BigNum.from(
        targetPriceForLiquidityCalculation,
        PRICE_PRECISION_EXP
      ).toNum();

      if (isAskSide) {
        asks.push({
          size: currentSize,
          price: entryPrice,
          type: "vamm",
        });
        prevCumSizeAsk = currentCumSize;
      } else {
        bids.push({
          size: currentSize,
          price: entryPrice,
          type: "vamm",
        });
        prevCumSizeBid = currentCumSize;
      }
    }
  };

  for (let i = 1; i <= rows; i++) {
    addLiquidityForBidAskRow("ask", i);
  }

  for (let i = 1; i <= rows; i++) {
    addLiquidityForBidAskRow("bid", i);
  }

  return {
    bids,
    asks,
    bestBid: bidPrice
      ? BigNum.from(bidPrice, PRICE_PRECISION_EXP).toNum()
      : undefined,
    bestAsk: askPrice
      ? BigNum.from(askPrice, PRICE_PRECISION_EXP).toNum()
      : undefined,
  };
};

const calculateLiquidity = (
  invariant: BN,
  baseAssetReserve: BN,
  pegMultiplier: BN,
  limit_price: BN
) => {
  const newBaseAssetReserveSquared = invariant
    .mul(PRICE_PRECISION)
    .mul(pegMultiplier)
    .div(limit_price)
    .div(PEG_PRECISION);

  const newBaseAssetReserve = newBaseAssetReserveSquared.isNeg()
    ? ZERO
    : squareRootBN(newBaseAssetReserveSquared);
  return baseAssetReserve.sub(newBaseAssetReserve).abs();
};
