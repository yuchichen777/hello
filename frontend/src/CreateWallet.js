import React, { useState } from "react";
import axios from "axios";
import { Button } from "./components/ui/button";

export default function CreateWallet() {
    const [wallet, setWallet] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const generateWallet = async () => {
        setLoading(true);
        setError("");
        try {
            const res = await axios.post("http://localhost:8080/createWallet");
            setWallet(res.data);
            localStorage.setItem("minerAddress", res.data.address);

            // ➕ 新增：自動請求測試幣
            await axios.post("http://localhost:8080/faucet", {
                to: res.data.address
            });

        } catch (err) {
            setError("無法建立錢包或取得測試幣");
        }
        setLoading(false);
    };

    return (
        <div className="p-4 max-w-xl mx-auto">
            <h2 className="text-2xl font-bold mb-4">🔐 建立新錢包</h2>
            <Button onClick={generateWallet} disabled={loading}>
                {loading ? "建立中..." : "建立錢包"}
            </Button>

            {error && <p className="text-red-500 mt-2">{error}</p>}

            {wallet && (
                <div className="mt-4 space-y-2 break-all">
                    <p><strong>地址：</strong>{wallet.address}</p>
                    <p><strong>私鑰：</strong>{wallet.privateKey}</p>
                    <p><strong>公鑰：</strong>{wallet.publicKey}</p>
                </div>
            )}
        </div>
    );
}
