// src/BlockchainUI.js
import React, { useState } from 'react';
import axios from 'axios';

export default function BlockchainUI() {
  const [address, setAddress] = useState('');
  const [balance, setBalance] = useState(null);

  const getBalance = async () => {
    const res = await axios.get(`http://localhost:8080/balance/${address}`);
    setBalance(res.data.balance);
  };

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">查詢帳戶餘額</h1>
      <input
        type="text"
        className="border p-2 mr-2"
        placeholder="請輸入地址"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
      />
      <button
        onClick={getBalance}
        className="bg-blue-500 text-white px-4 py-2 rounded"
      >
        查詢
      </button>
      {balance !== null && (
        <div className="mt-4">
          <strong>餘額：</strong> {balance}
        </div>
      )}
    </div>
  );
}
