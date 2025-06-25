import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";

export default function TxDetail() {
  const { txid } = useParams();
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    axios.get(`http://localhost:8080/tx/${txid}`)
      .then((res) => setData(res.data))
      .catch(() => setErr("查無此交易"));
  }, [txid]);

  if (err) return <div className="p-6">{err}</div>;
  if (!data) return <div className="p-6">載入中...</div>;

  return (
    <div className="p-6 space-y-2">
      <h1 className="text-2xl font-bold mb-2">🔍 交易詳情</h1>
      <p><strong>TxID:</strong> {txid}</p>
      <p><strong>狀態:</strong> {data.status}</p>
      <p><strong>From:</strong> {data.tx.from}</p>
      <p><strong>To:</strong> {data.tx.to}</p>
      <p><strong>Amount:</strong> {data.tx.amount}</p>
      <p><strong>時間:</strong> {new Date(data.timestamp * 1000).toLocaleString()}</p>
      {data.status === "confirmed" && (
        <p><strong>區塊編號:</strong> {data.block}</p>
      )}
    </div>
  );
}
