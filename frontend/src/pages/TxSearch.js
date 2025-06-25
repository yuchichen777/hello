// src/pages/TxSearch.js
import React, { useState } from "react";
import axios from "axios";

export default function TxSearch() {
    const [txid, setTxid] = useState("");
    const [data, setData] = useState(null);
    const [error, setError] = useState("");

    const handleSearch = async () => {
        setError("");
        setData(null);
        try {
            const res = await axios.get(`http://localhost:8080/tx/${txid}`);
            setData(res.data);
        } catch {
            setError("查無此交易");
        }
    };

    return (
        <div className="p-6 max-w-xl mx-auto">
            <h1 className="text-2xl font-bold mb-4">🔍 交易查詢</h1>
            <input
                value={txid}
                onChange={(e) => setTxid(e.target.value)}
                placeholder="請輸入交易 TxID"
                className="border p-2 w-full"
            />
            <button
                onClick={handleSearch}
                className="bg-blue-600 text-white px-4 py-2 mt-2 rounded"
            >
                查詢
            </button>

            {error && <p className="mt-4 text-red-500">{error}</p>}

            {data && (
                <div className="mt-4 border rounded p-3 bg-gray-50">
                    <p><strong>狀態:</strong> {data.status === "confirmed" ? "✅ 已確認" : "⏳ 等待打包"}</p>
                    <p><strong>時間:</strong> {new Date(data.timestamp * 1000).toLocaleString()}</p>
                    <p><strong>From:</strong> {data.tx.from}</p>
                    <p><strong>To:</strong> {data.tx.to}</p>
                    <p><strong>Amount:</strong> {data.tx.amount}</p>
                    <p><strong>TxID:</strong> {data.tx.txid}</p>
                </div>
            )}
        </div>
    );
}
