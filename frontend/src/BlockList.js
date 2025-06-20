// src/BlockList.js
import React, { useEffect, useState } from "react";
import axios from "axios";

export default function BlockList() {
  const [blocks, setBlocks] = useState([]);
  const [error, setError] = useState("");

  const fetchBlocks = async () => {
    try {
      const res = await axios.get("http://localhost:8080/blocks");
      setBlocks(res.data.reverse()); // 反轉，讓最新的在上面
    } catch (err) {
      setError("無法載入區塊資料");
    }
  };

  useEffect(() => {
    fetchBlocks();
  }, []);

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">📦 區塊鏈區塊列表</h2>
      {error && <p className="text-red-500 mb-2">{error}</p>}
      {blocks.map((block) => (
        <div key={block.hash} className="border rounded-lg p-4 mb-4 shadow">
          <p><strong>#</strong> {block.index}</p>
          <p><strong>時間：</strong> {block.timestamp}</p>
          <p><strong>Hash：</strong> {block.hash}</p>
          <p><strong>前一個 Hash：</strong> {block.prevHash}</p>
          <p><strong>Nonce：</strong> {block.nonce}</p>
          <p><strong>交易：</strong></p>
          <ul className="ml-4 list-disc">
            {block.txs.map((tx, idx) => (
              <li key={idx} className="text-sm">
                {tx.from} → {tx.to}：{tx.amount}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
