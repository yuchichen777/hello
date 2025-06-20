import React, { useState } from 'react';
import axios from 'axios';

export default function SendTxForm() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [privKey, setPrivKey] = useState('');
  const [status, setStatus] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('簽章中...');

    try {
      const { data: signedTx } = await axios.post('http://localhost:8080/signTx', {
        from,
        to,
        amount: parseFloat(amount),
        privKey,
      });

      setStatus('簽章完成，提交交易中...');

      const res = await axios.post('http://localhost:8080/add', signedTx);
      setStatus(res.data.message);
    } catch (err) {
      setStatus('❌ 錯誤：' + (err.response?.data || err.message));
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-2">發送交易</h2>
      <form onSubmit={handleSubmit} className="space-y-2">
        <input className="border p-1 w-full" placeholder="From Address" value={from} onChange={(e) => setFrom(e.target.value)} />
        <input className="border p-1 w-full" placeholder="To Address" value={to} onChange={(e) => setTo(e.target.value)} />
        <input className="border p-1 w-full" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <input className="border p-1 w-full" placeholder="Private Key" value={privKey} onChange={(e) => setPrivKey(e.target.value)} />
        <button className="border px-4 py-1 bg-blue-500 text-white" type="submit">送出</button>
      </form>
      <p className="mt-2">{status}</p>
    </div>
  );
}
