// src/pages/Network.js
import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { getAPI } from "../lib/api";

export default function Network() {
    const [peerUrl, setPeerUrl] = useState("");
    const [message, setMessage] = useState("");
    const [peers, setPeers] = useState([]);
    const [loading, setLoading] = useState(false);
    const api = getAPI();

    const addPeer = async () => {
        try {
            let url = peerUrl.trim();
            if (!url.startsWith("http")) {
                if (/^\d+$/.test(url)) {
                    url = `http://localhost:${url}`; // 如果是純數字，假設是端口號
                } else {
                    url = `http://${url}`; // 否則假設是完整 URL
                }
            }
            await axios.post(`${api}/peers`, { url: url });
            setMessage("✅ 已加入節點");
            setPeerUrl("");
            fetchPeers(); // 加入後刷新
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

    const fetchPeers = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${api}/peers`);
            const list = Array.isArray(res.data) ? res.data : [];
            setPeers(list);
        } catch {
            setPeers([]);
        } finally {
            setLoading(false);
        }
    }, [api]);

    useEffect(() => {
        fetchPeers();
    }, [fetchPeers]);

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

            <hr />

            <h2 className="text-lg font-semibold">🔗 目前已連接節點</h2>
            {loading ? (
                <p>讀取中...</p>
            ) : peers.length === 0 ? (
                <p className="text-gray-500">尚未加入任何節點</p>
            ) : (
                <ul className="list-disc pl-5 text-sm space-y-1">
                    {peers.map((peer, i) => (
                        <li key={i}>{peer}</li>
                    ))}
                </ul>
            )}
        </div>
    );
}
