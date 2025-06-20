// src/MineBlock.js
import React, { useState } from "react";
import axios from "axios";
import { Button } from "./components/ui/button";
import { toast } from "react-toastify";

export default function MineBlock() {
  const [mining, setMining] = useState(false);

  const mine = async () => {
    const minerAddress = localStorage.getItem("minerAddress");
    if (!minerAddress) {
      toast.error("請先建立或填入礦工地址");
      return;
    }
    setMining(true);
    try {
      const res = await axios.post(`http://localhost:8080/mine?miner=${minerAddress}`);
      toast.success(res.data.message);
    } catch (err) {
      toast.error(err.response?.data || "挖礦失敗");
    }
    setMining(false);
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-2">⚒️ 一鍵挖礦</h2>
      <Button onClick={mine} disabled={mining}>
        {mining ? "挖礦中..." : "立即挖礦"}
      </Button>
    </div>
  );
}
