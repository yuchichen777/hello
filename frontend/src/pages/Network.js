// src/pages/Network.js
import React, { useState, useMemo } from "react";
import axios from "axios";
import { getAPI } from "../lib/api";

export default function Network() {
    const [peerUrl, setPeerUrl] = useState("");
    const [message, setMessage] = useState("");
    const api = useMemo(() => getAPI(), []);

    const addPeer = async () => {
        try {
            const res = await axios.post(`${api}/peers`, { url: peerUrl });
            setMessage(res.data.message || "已加入節點");
            setPeerUrl("");
        } catch {
            setMessage("❌ 加入節點失敗");
        }
    };

    const syncPeers = async () => {
        try {
            const res = await axios.get(`${api}/sync`);
            setMessage(res.data.message || "✅ 同步完成");
        } catch {
            setMessage("❌ 同步失敗");
        }
    };

    return (
        <div className="p-6 max-w-xl mx-auto space-y-4">
            <h1 className="text-2xl font-bold">🌐 網路節點管理</h1>

            <input
                value={peerUrl}
                onChange={(e) => setPeerUrl(e.target.value)}
                placeholder="輸入節點 URL（例如 http://localhost:8081）"
                className="border p-2 w-full text-sm"
            />
            <div className="space-x-2">
                <button className="bg-green-600 text-white px-4 py-2 rounded" onClick={addPeer}>
                    ➕ 加入節點
                </button>
                <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={syncPeers}>
                    🔁 同步區塊鏈
                </button>
            </div>

            {message && <p className="mt-2 text-blue-500">{message}</p>}
        </div>
    );
}
