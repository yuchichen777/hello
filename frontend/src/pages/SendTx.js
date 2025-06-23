// src/pages/SendTx.js
import React from "react";
import SendTxPanel from "../components/tx/SendTxPanel";

export default function SendTx() {
  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">📤 送出交易</h1>
      <SendTxPanel />
    </div>
  );
}
