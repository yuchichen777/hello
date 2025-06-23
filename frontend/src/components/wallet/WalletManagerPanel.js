// src/components/WalletManagerPanel.js
import React, { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { toast } from "react-toastify";

export default function WalletManagerPanel({ onSelect }) {
  const [wallets, setWallets] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("wallets") || "[]");
    setWallets(stored);
  }, []);

  const deleteWallet = (index) => {
    const updated = wallets.filter((_, i) => i !== index);
    localStorage.setItem("wallets", JSON.stringify(updated));
    setWallets(updated);
    toast.info("已刪除錢包");
  };

  const handleSelect = (wallet, index) => {
    setSelected(index);
    localStorage.setItem("minerAddress", wallet.address);
    onSelect?.(wallet);
    toast.success("已切換至選擇的錢包");
  };

  return (
    <div className="p-4 border rounded space-y-3">
      <h2 className="text-lg font-semibold">👛 錢包管理</h2>
      {wallets.length === 0 ? (
        <p>尚未建立任何錢包</p>
      ) : (
        <ul className="space-y-2">
          {wallets.map((w, i) => (
            <li key={i} className="border p-2 rounded bg-gray-50">
              <p className="break-all text-sm">
                <strong>地址:</strong> {w.address}
              </p>
              <div className="flex space-x-2 mt-2">
                <Button onClick={() => handleSelect(w, i)} variant={selected === i ? "default" : "outline"}>
                  使用此錢包
                </Button>
                <Button onClick={() => deleteWallet(i)} variant="destructive">
                  刪除
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
