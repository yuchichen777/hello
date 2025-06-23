// src/components/WalletSelector.js
import React, { useEffect, useState } from "react";

export default function WalletSelector({ selected, onSelect }) {
  const [wallets, setWallets] = useState([]);

  useEffect(() => {
    const stored = localStorage.getItem("walletList");
    if (stored) {
      try {
        setWallets(JSON.parse(stored));
      } catch {
        setWallets([]);
      }
    }
  }, []);

  if (wallets.length === 0) {
    return <p className="text-red-500">⚠️ 尚無錢包可選擇</p>;
  }

  return (
    <select
      value={selected}
      onChange={(e) => onSelect(e.target.value)}
      className="border px-2 py-1 w-full"
    >
      <option value="">請選擇錢包地址</option>
      {wallets.map((w) => (
        <option key={w.address} value={w.address}>
          {w.address}
        </option>
      ))}
    </select>
  );
}
