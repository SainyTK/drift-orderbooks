import { Wallet } from "@coral-xyz/anchor";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";

export const getWallet = (privateKey: string) => {
  let keypair: Keypair;

  if (privateKey.includes(",")) {
    keypair = Keypair.fromSecretKey(
      Uint8Array.from(privateKey.split(",").map((val) => Number(val)))
    );
  } else {
    const secretKey = bs58.decode(privateKey);
    keypair = Keypair.fromSecretKey(secretKey);
  }

  return new Wallet(keypair);
};
