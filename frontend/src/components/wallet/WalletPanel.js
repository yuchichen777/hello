// src/components/WalletPanel.js
import React, { useState, useEffect } from "react";
import WalletSelector from "./WalletSelector";
import axios from "axios";
import { toast } from "react-toastify";
import { Button } from "../ui/button";

export default function WalletPanel() {
  const [wallet, setWallet] = useState(null);
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(false);

  const getBalance = async (addr) => {
    if (!addr) return;
    try {
      const res = await axios.get(`http://localhost:8080/balance/${addr}`);
      setBalance(res.data.balance);
    } catch {
      toast.error("❌ 查詢餘額失敗");
    }
  };

  const handleCreateWallet = async () => {
    try {
      const res = await axios.post("http://localhost:8080/createWallet");
      const newWallet = res.data;

      const list = JSON.parse(localStorage.getItem("walletList") || "[]");
      list.push(newWallet);
      localStorage.setItem("walletList", JSON.stringify(list));
      localStorage.setItem("minerAddress", newWallet.address);

      setWallet(newWallet);
      getBalance(newWallet.address);
      toast.success("✅ 錢包建立成功");
    } catch {
      toast.error("❌ 建立錢包失敗");
    }
  };

  const handleSelectWallet = (addr) => {
    const wallets = JSON.parse(localStorage.getItem("walletList") || "[]");
    const selected = wallets.find((w) => w.address === addr);
    if (selected) {
      setWallet(selected);
      localStorage.setItem("minerAddress", selected.address);
      getBalance(selected.address);
    }
  };

  const handleFaucet = async () => {
    if (!wallet?.address) {
      toast.error("請先建立或選擇錢包");
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post("http://localhost:8080/faucet", {
        to: wallet.address,
      });
      toast.success(res.data.message || "✅ 測試幣已發送");
      getBalance(wallet.address); // 更新餘額
    } catch {
      toast.error("❌ 領取測試幣失敗");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const addr = localStorage.getItem("minerAddress");
    const wallets = JSON.parse(localStorage.getItem("walletList") || "[]");
    const found = wallets.find((w) => w.address === addr);
    if (found) {
      setWallet(found);
      getBalance(found.address);
    }
  }, []);

  return (
    <div className="p-4 border rounded space-y-4">
      <h2 className="text-lg font-semibold">👛 錢包管理</h2>

      <div className="space-y-2">
        <Button onClick={handleCreateWallet}>➕ 建立新錢包</Button>
        <WalletSelector
          selected={wallet?.address || ""}
          onSelect={handleSelectWallet}
        />
      </div>

      {wallet && (
        <div className="pt-3 space-y-2">
          <p><strong>當前地址：</strong>{wallet.address}</p>
          <p><strong>目前餘額：</strong>{balance ?? "查詢中..."} tokens</p>
          <Button onClick={handleFaucet} disabled={loading}>
            {loading ? "請稍候..." : "領取測試幣"}
          </Button>
        </div>
      )}
    </div>
  );
}
