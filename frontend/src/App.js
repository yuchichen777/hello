import React, { useState, useEffect } from "react";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Button } from "./components/ui/button";

export default function App() {
  const [wallet, setWallet] = useState(null);
  const [balance, setBalance] = useState(null);
  const [mining, setMining] = useState(false);

  const createWallet = async () => {
    try {
      const res = await axios.post("http://localhost:8080/createWallet");
      setWallet(res.data);
      localStorage.setItem("minerAddress", res.data.address);
      toast.success("錢包建立成功");
    } catch {
      toast.error("建立錢包失敗");
    }
  };

  const faucet = async () => {
    const minerAddress = wallet?.address || localStorage.getItem("minerAddress");
    if (!minerAddress) {
      toast.error("請先建立錢包");
      return;
    }

    try {
      const res = await axios.post("http://localhost:8080/faucet", {
        to: minerAddress,
      });
      toast.success(res.data.message || "已成功獲得測試幣");
    } catch {
      toast.error("獲得測試幣失敗");
    }
  };

  const getBalance = async (addr) => {
    if (!addr) {
      toast.error("請先建立錢包");
      return;
    }
    try {
      const res = await axios.get(`http://localhost:8080/balance/${addr}`);
      setBalance(res.data.balance);
    } catch {
      toast.error("查詢失敗，帳戶不存在");
    }
  };

  const mine = async () => {
    const minerAddress = wallet?.address || localStorage.getItem("minerAddress");
    if (!minerAddress) {
      toast.error("請先建立錢包");
      return;
    }

    setMining(true);
    try {
      const res = await axios.post(`http://localhost:8080/mine?miner=${minerAddress}`);
      toast.success(res.data.message);
      getBalance(minerAddress);
    } catch (err) {
      toast.error(err.response?.data || "挖礦失敗");
    }
    setMining(false);
  };

  useEffect(() => {
    const saved = localStorage.getItem("minerAddress");
    if (saved) {
      setWallet({ address: saved });
    }
  }, []);

  useEffect(() => {
    if (wallet?.address) {
      console.log("錢包已載入：", wallet.address);
      getBalance(wallet.address);
    }
  }, [wallet]);

  return (
    <div className="p-6 max-w-xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">簡易區塊鏈前端</h1>

      <div className="space-x-4">
        <Button onClick={createWallet}>🔐 建立錢包</Button>
        <Button onClick={faucet}>🧪 測試幣</Button>
      </div>
      {wallet?.address && (
        <p className="mt-2 break-all">地址：{wallet.address}</p>
      )}

      <div>
        <Button onClick={() => getBalance(wallet?.address)}>💰 查詢餘額</Button>
        {balance !== null && (
          <p className="mt-2">餘額：{balance} tokens</p>
        )}
      </div>

      <div>
        <Button onClick={mine} disabled={mining}>
          {mining ? "挖礦中..." : "⚒️ 一鍵挖礦"}
        </Button>
      </div>

      <ToastContainer position="top-center" />
    </div>
  );
}
