import { OrderBookBidAsk } from "../types/orderbook.type";

export const displayOrderbook = ({
  bids,
  asks,
  bestBid,
  bestAsk,
}: {
  bids: OrderBookBidAsk[];
  asks: OrderBookBidAsk[];
  bestBid: number;
  bestAsk: number;
}) => {
  const tableData: {
    bidSize: number;
    bidPrice: number;
    askPrice: number;
    askSize: number;
  }[] = [];

  for (let i = 0; i < Math.min(bids.length, asks.length, 20); i++) {
    const bid = bids[i];
    const ask = asks[i];

    tableData.push({
      bidSize: bid?.size,
      bidPrice: bid?.price,
      askPrice: ask?.price,
      askSize: ask?.size,
    });
  }

  console.log({ bestBid, bestAsk });
  console.table(tableData);
};
