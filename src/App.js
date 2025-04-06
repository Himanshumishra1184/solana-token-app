import React, { useState, useEffect } from "react";
import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";
import * as splToken from "@solana/spl-token";

function App() {
  const [walletAddress, setWalletAddress] = useState(null);
  const [solBalance, setSolBalance] = useState(0);
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 🔧 Added missing states
  const [mintAddress, setMintAddress] = useState("");
  const [mintAmount, setMintAmount] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [transferAmount, setTransferAmount] = useState("");

  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

  const connectWallet = async () => {
    setLoading(true);
    setError(null);

    try {
      if (!window.solana) throw new Error("Solana wallet not found!");
      const provider = window.solana;
      if (!provider.isPhantom) throw new Error("Phantom Wallet not installed!");

      const response = await provider.connect();
      const publicKey = new PublicKey(response.publicKey.toString());
      setWalletAddress(publicKey.toString());

      await getSolBalance(publicKey);
      await getTokenBalances(publicKey);
    } catch (err) {
      setError(err.message || "Failed to connect wallet.");
    } finally {
      setLoading(false);
    }
  };

  const getSolBalance = async (publicKey) => {
    try {
      const balance = await connection.getBalance(publicKey);
      setSolBalance(balance / 1_000_000_000);
    } catch (err) {
      setError("Failed to fetch SOL balance.");
    }
  };

  const getTokenBalances = async (publicKey) => {
    try {
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
        publicKey,
        {
          programId: splToken.TOKEN_PROGRAM_ID,
        }
      );

      const tokens = tokenAccounts.value.map((account) => ({
        mint: account.account.data.parsed.info.mint,
        balance: account.account.data.parsed.info.tokenAmount.uiAmount,
      }));

      setTokens(tokens);
    } catch (err) {
      setError("Failed to fetch token balances.");
    }
  };

  const mintTokens = async (mintAddress, amount) => {
    try {
      if (!walletAddress) throw new Error("Connect wallet first!");

      const mintPublicKey = new PublicKey(mintAddress);
      const fromWallet = new PublicKey(walletAddress);

      const toTokenAccount = await splToken.getOrCreateAssociatedTokenAccount(
        connection,
        fromWallet,
        mintPublicKey,
        fromWallet
      );

      await splToken.mintTo(
        connection,
        fromWallet,
        mintPublicKey,
        toTokenAccount.address,
        fromWallet,
        amount * Math.pow(10, 9)
      );

      alert(`Minted ${amount} tokens to ${toTokenAccount.address}`);
      await getTokenBalances(fromWallet);
    } catch (err) {
      setError(err.message || "Minting failed!");
    }
  };

  const transferTokens = async (mintAddress, recipientAddress, amount) => {
    try {
      if (!walletAddress) throw new Error("Connect wallet first!");

      const mintPublicKey = new PublicKey(mintAddress);
      const senderWallet = new PublicKey(walletAddress);
      const recipientPublicKey = new PublicKey(recipientAddress);

      const senderTokenAccount = await splToken.getAssociatedTokenAddress(
        mintPublicKey,
        senderWallet
      );

      const recipientTokenAccount =
        await splToken.getOrCreateAssociatedTokenAccount(
          connection,
          senderWallet,
          mintPublicKey,
          recipientPublicKey
        );

      await splToken.transfer(
        connection,
        senderWallet,
        senderTokenAccount,
        recipientTokenAccount.address,
        senderWallet,
        amount * Math.pow(10, 9)
      );

      alert(`Transferred ${amount} tokens to ${recipientAddress}`);
      await getTokenBalances(senderWallet);
    } catch (err) {
      setError(err.message || "Transfer failed!");
    }
  };

  const disconnectWallet = () => {
    if (window.solana) {
      window.solana.disconnect();
    }
    setWalletAddress(null);
    setSolBalance(0);
    setTokens([]);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <header className="w-full max-w-2xl text-center mb-6">
        <h1 className="text-4xl font-bold">Solana Wallet & SPL Tokens</h1>
        <p className="text-gray-600">Manage your SOL & SPL Tokens</p>
      </header>

      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md text-center">
        {walletAddress ? (
          <>
            <p>Wallet Address:</p>
            <p className="font-mono break-all">{walletAddress}</p>

            <p className="mt-3">
              SOL Balance: <strong>{solBalance.toFixed(4)} SOL</strong>
            </p>

            <h2 className="mt-4 text-xl font-semibold">SPL Tokens</h2>
            {tokens.length > 0 ? (
              <ul className="mt-2">
                {tokens.map((token, index) => (
                  <li key={index} className="text-gray-700">
                    Mint: {token.mint} — <strong>{token.balance}</strong>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No SPL tokens found.</p>
            )}

            <div className="mt-6 flex flex-col items-center">
              <input
                type="text"
                placeholder="Token Mint Address"
                value={mintAddress}
                onChange={(e) => setMintAddress(e.target.value)}
                className="border p-2 rounded w-full mb-2"
              />
              <input
                type="number"
                placeholder="Amount to Mint"
                value={mintAmount}
                onChange={(e) => setMintAmount(e.target.value)}
                className="border p-2 rounded w-full mb-2"
              />
              <button
                onClick={() => mintTokens(mintAddress, mintAmount)}
                className="bg-green-500 text-white py-2 px-4 rounded w-full"
              >
                Mint Tokens
              </button>
            </div>

            <div className="mt-6 flex flex-col items-center">
              <input
                type="text"
                placeholder="Recipient Wallet Address"
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
                className="border p-2 rounded w-full mb-2"
              />
              <input
                type="number"
                placeholder="Amount to Transfer"
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
                className="border p-2 rounded w-full mb-2"
              />
              <button
                onClick={() =>
                  transferTokens(mintAddress, recipientAddress, transferAmount)
                }
                className="bg-yellow-500 text-white py-2 px-4 rounded w-full"
              >
                Transfer Tokens
              </button>
            </div>

            <button
              onClick={disconnectWallet}
              className="mt-6 bg-red-500 text-white py-2 px-4 rounded w-full"
            >
              Disconnect Wallet
            </button>
          </>
        ) : (
          <button
            onClick={connectWallet}
            disabled={loading}
            className="bg-blue-500 text-white py-2 px-4 rounded w-full"
          >
            {loading ? "Connecting..." : "Connect Wallet"}
          </button>
        )}

        {error && <p className="text-red-500 mt-4">{error}</p>}
      </div>
    </div>
  );
}

export default App;
