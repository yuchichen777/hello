// src/components/SendTxPanel.js
import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { Button } from "../ui/button";
import { toast } from "react-toastify";
import { getAPI } from "../../lib/api";
import WalletSelector from "../wallet/WalletSelector";

export default function SendTxPanel() {
  const [form, setForm] = useState({
    from: "",
    to: "",
    amount: "",
    privKey: "",
  });
  const [walletList, setWalletList] = useState([]);
  const [balance, setBalance] = useState(null);
  const api = useMemo(() => getAPI(), []);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("walletList") || "[]");
    setWalletList(stored);
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleFromChange = async (fromAddress) => {
    const selectedWallet = walletList.find((w) => w.address === fromAddress);
    setForm({
      ...form,
      from: fromAddress,
      privKey: selectedWallet?.privateKey || "",
    });

    try {
      const res = await axios.get(`${api}/balance/${fromAddress}`);
      setBalance(res.data.balance);
    } catch {
      setBalance(null);
      toast.error("⚠️ 無法取得錢包餘額");
    }
  };

  const sendTx = async () => {
    const { from, to, amount, privKey } = form;
    if (!from || !to || !amount || !privKey) {
      return toast.error("❌ 請填寫完整欄位");
    }

    if (from === to) {
      return toast.error("❌ 收款地址不能與寄件地址相同");
    }

    const parsedAmount = parseFloat(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return toast.error("❌ 金額必須為有效數字");
    }

    try {
      const res1 = await axios.post(`${api}/signTx`, {
        from,
        to,
        amount: parsedAmount,
        privKey,
      });
      console.log("簽名交易內容：", res1.data);
      await axios.post(`${api}/add`, res1.data);
      toast.success("✅ 交易已送出並加入交易池");
      setForm({ ...form, to: "", amount: "" });
      handleFromChange(from); // 重新查餘額
    } catch {
      toast.error("❌ 交易送出失敗");
    }
  };

  return (
    <div className="p-4 border rounded space-y-2">
      <h2 className="text-lg font-semibold">📤 送出交易</h2>

      <label className="block font-semibold">寄件者（From）</label>
      <WalletSelector selected={form.from} onSelect={handleFromChange} />
      {balance !== null && (
        <p className="text-sm text-gray-600 mt-1">💰 目前餘額：{balance} tokens</p>
      )}

      <label className="block font-semibold mt-2">收款者（To）</label>
      <WalletSelector
        selected={form.to}
        onSelect={(val) => setForm({ ...form, to: val })}
      />

      <input
        name="amount"
        placeholder="金額"
        value={form.amount}
        onChange={handleChange}
        className="border p-1 w-full mt-2"
      />
      <input
        name="privKey"
        type="password"
        placeholder="私鑰會依寄件者自動填入"
        value={form.privKey}
        readOnly
        className="border p-1 w-full text-gray-400"
      />
      <Button onClick={sendTx}>送出交易</Button>
    </div>
  );
}
