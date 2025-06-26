// src/pages/Blocks.js
import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { getAPI } from "../lib/api";

export default function Blocks() {
  const [blocks, setBlocks] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [loading, setLoading] = useState(true);
  const api = getAPI();

  useEffect(() => {
    axios.get(`${api}/blocks`)
      .then((res) => {
        setBlocks(res.data?.reverse() || []);
      })
      .catch(() => {
        console.error("無法取得區塊資料");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [api]);

  const toggleExpand = (index) => {
    setExpanded(expanded === index ? null : index);
  };

  if (loading) {
    return <p>📡 正在載入區塊資料...</p>;
  }

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4">📦 區塊列表</h2>
      {blocks.length === 0 ? (
        <p>⚠️ 尚無區塊資料</p>
      ) : (
        blocks.map((block, idx) => (
          <div
            key={block.Index}
            className="border rounded p-4 mb-4 cursor-pointer bg-gray-50 hover:bg-gray-100"
            onClick={() => toggleExpand(idx)}
          >
            <p>
              <strong>區塊編號：</strong> {block.index}
            </p>
            <p>
              <strong>Hash：</strong> {block.hash?.slice(0, 20) || "(無資料)"}...
            </p>
            {expanded === idx && (
              <div className="mt-3 space-y-2">
                <p>
                  <strong>時間：</strong> {block.timestamp}
                </p>
                <p>
                  <strong>前一個 Hash：</strong> {block.prevHash}
                </p>
                <p>
                  <strong>Nonce：</strong> {block.nonce}
                </p>
                <div>
                  <strong>交易紀錄：</strong>
                  {(block.txs?.length ?? 0) === 0 ? (
                    <p>（無交易）</p>
                  ) : (
                    <ul className="list-disc pl-5">
                      {block.txs.map((tx, tIdx) => (
                        <li key={tIdx}>
                          <div>
                            <span className="font-bold">From:</span> {tx.from} →{" "}
                            <span className="font-bold">To:</span> {tx.to},{" "}
                            <span className="font-bold">Amount:</span> {tx.amount}
                            {tx.txid && (
                              <Link to={`/tx/${tx.txid}`} className="text-blue-600 underline ml-2 text-sm">
                                查看詳細
                              </Link>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
