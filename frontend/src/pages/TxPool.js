// src/pages/TxPool.js
import React, { useEffect, useState } from "react";
import axios from "axios";
import { Button } from "../components/ui/button";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom"; // ← 加入這行

export default function TxPool() {
    const [txs, setTxs] = useState([]);
    const navigate = useNavigate(); // ← 初始化導航
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTxPool();
    }, []);

    const fetchTxPool = async () => {
        try {
            const res = await axios.get("http://localhost:8080/txpool");
            setTxs(res.data);
        } catch (err) {
            toast.error("載入交易池失敗");
        } finally {
            setLoading(false);
        }
    };

    const mineNow = async () => {
        const miner = localStorage.getItem("minerAddress");
        if (!miner) return toast.error("請先建立錢包");
        try {
            const res = await axios.post(`http://localhost:8080/mine?miner=${miner}`);
            toast.success(res.data.message || "已成功挖礦");
            navigate("/blocks"); // ← 打包成功跳轉
        } catch (err) {
            toast.error("挖礦失敗：" + (err.response?.data || err.message));
        }
    };

    return (
        <div className="p-6 max-w-xl mx-auto">
            <h1 className="text-2xl font-bold mb-4">💧 交易池 (TxPool)</h1>
            <Button onClick={mineNow} className="mb-4">⚒️ 立即打包交易</Button>
            {loading ? (
                <p>載入中...</p>
            ) : txs.length === 0 ? (
                <p>🚫 目前交易池為空</p>
            ) : (
                <ul className="space-y-4">
                    {txs.map((tx, i) => (
                        <li key={i}>
                            <p>• <strong>From:</strong> {tx?.from || "(未知)"}</p>
                            <p><strong>To:</strong> {tx?.to || "(未知)"}</p>
                            <p><strong>Amount:</strong> {tx?.amount ?? "(未填)"}</p>
                        </li>
                    ))}
                </ul>
            )}

        </div>
    );
}
