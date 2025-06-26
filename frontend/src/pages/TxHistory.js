// src/pages/TxHistory.js
import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import WalletSelector from "../components/wallet/WalletSelector";
import { Link } from "react-router-dom";
import { getAPI } from "../lib/api";

export default function TxHistory() {
    const [address, setAddress] = useState("");
    const [txs, setTxs] = useState([]);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [minAmount, setMinAmount] = useState("");
    const api = getAPI();

    const fetchHistory = useCallback(async (addr) => {
        try {
            const res = await axios.get(`${api}/txs/${addr}`);
            const sorted = (res.data || []).sort((a, b) => b.timestamp - a.timestamp);
            setTxs(sorted);
        } catch {
            setTxs([]);
        }
    }, [api]);

    useEffect(() => {
        if (address) fetchHistory(address);
    }, [fetchHistory, address]);

    const filteredTxs = txs.filter((tx) => {
        const matchSearch = search === "" || tx.to.includes(search) || tx.from.includes(search);
        const matchStatus = statusFilter === "all" || tx.status === statusFilter;
        const matchAmount = minAmount === "" || tx.amount >= parseFloat(minAmount);
        return matchSearch && matchStatus && matchAmount;
    });

    return (
        <div className="p-6 max-w-xl mx-auto">
            <h1 className="text-2xl font-bold mb-4">📜 交易歷史查詢</h1>
            <WalletSelector selected={address} onSelect={setAddress} />

            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-2">
                <input
                    type="text"
                    placeholder="🔍 搜尋地址"
                    className="border p-1"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
                <select
                    className="border p-1"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                >
                    <option value="all">全部狀態</option>
                    <option value="confirmed">✅ 已確認</option>
                    <option value="pending">⏳ 等待打包</option>
                </select>
                <input
                    type="number"
                    placeholder="💰 最低金額"
                    className="border p-1"
                    value={minAmount}
                    onChange={(e) => setMinAmount(e.target.value)}
                />
            </div>

            {filteredTxs.length === 0 ? (
                <p className="mt-4">❌ 查無符合條件的交易</p>
            ) : (
                <ul className="mt-4 space-y-2">
                    {filteredTxs.map((tx, i) => (
                        <li key={i} className="border rounded p-2 bg-gray-50">
                            <p>
                                狀態: {tx.status === "confirmed" ? (
                                    <span className="text-green-600 font-semibold">✅ 已確認</span>
                                ) : (
                                    <span className="text-yellow-600 font-semibold">⏳ 等待打包</span>
                                )}
                            </p>
                            <p><strong>時間:</strong> {tx.timestamp ? new Date(tx.timestamp * 1000).toLocaleString() : "未知"}</p>
                            <div><strong>From:</strong> {tx.from}</div>
                            <div><strong>To:</strong> {tx.to}</div>
                            <div><strong>Amount:</strong> {tx.amount}</div>
                            <div><strong>TxID:</strong> {tx.txid}</div>
                            <Link to={`/tx/${tx.txid}`} className="text-blue-600 underline text-sm">
                                查看詳細
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
