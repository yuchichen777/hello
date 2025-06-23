// src/pages/Home.js
import React, { useState, useEffect } from "react";
import WalletPanel from "../components/wallet/WalletPanel";
import axios from "axios";
import { toast } from "react-toastify";

export default function Home() {
    const [wallet, setWallet] = useState(null);
    const [balance, setBalance] = useState(null);

    const createWallet = async () => {
        try {
            const res = await axios.post("http://localhost:8080/createWallet");
            const newWallet = res.data;

            // 加入本地錢包列表
            const list = JSON.parse(localStorage.getItem("walletList") || "[]");
            list.push(newWallet);
            localStorage.setItem("walletList", JSON.stringify(list));

            // 設定當前錢包
            localStorage.setItem("minerAddress", newWallet.address);
            setWallet(newWallet);  // 如果你有 useState 控制當前錢包
            toast.success("錢包建立成功並設為目前使用者");
        } catch {
            toast.error("建立錢包失敗");
        }
    };

    const faucet = async () => {
        const minerAddress = wallet?.address || localStorage.getItem("minerAddress");
        if (!minerAddress) {
            toast.error("請先建立錢包");
            return;
        }

        try {
            const res = await axios.post("http://localhost:8080/faucet", { to: minerAddress });
            toast.success(res.data.message || "已成功獲得測試幣");
        } catch {
            toast.error("獲得測試幣失敗");
        }
    };

    const getBalance = async (addr) => {
        if (!addr) return;
        try {
            const res = await axios.get(`http://localhost:8080/balance/${addr}`);
            setBalance(res.data.balance);
        } catch {
            toast.error("查詢失敗");
        }
    };

    useEffect(() => {
        const saved = localStorage.getItem("minerAddress");
        if (saved) {
            setWallet({ address: saved });
            getBalance(saved);
        }
    }, []);

    return (
        <div className="p-6 max-w-xl mx-auto">
            <h1 className="text-3xl font-bold mb-4">區塊鏈首頁</h1>
            <WalletPanel
                wallet={wallet}
                balance={balance}
                onCreate={createWallet}
                onFaucet={faucet}
                onQuery={() => getBalance(wallet?.address)}
            />
        </div>
    );
}
