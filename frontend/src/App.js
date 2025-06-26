// src/App.js
import React from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import Home from "./pages/Home";
import Blocks from "./pages/Blocks";
import TxPool from "./pages/TxPool";
import SendTx from "./pages/SendTx";
import TxHistory from './pages/TxHistory';
import TxDetail from "./pages/TxDetail";
import TxSearch from "./pages/TxSearch";
import Network from "./pages/Network";
import NodeSelector from "./components/node/NodeSelector";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function App() {
  return (
    <Router>
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold mb-4">🧱 區塊鏈區塊瀏覽器</h1>
        <nav className="space-x-4">
          <Link className="text-blue-500" to="/">🏠 首頁</Link>
          <Link to="/blocks">📦 區塊列表</Link>
          <Link to="/txpool">📥 交易池</Link>
          <Link to="/sendtx">📤 送出交易</Link>
          <Link to="/TxHistory">📜 交易紀錄</Link>
          <Link to="/TxSearch" className="text-blue-500 underline">🔎 查詢交易</Link>
          <Link to="/Network" className="text-blue-500 underline">🌐 節點同步</Link>
          <NodeSelector />
        </nav>

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/blocks" element={<Blocks />} />
          <Route path="/txpool" element={<TxPool />} />
          <Route path="/sendtx" element={<SendTx />} />
          <Route path="/TxHistory" element={<TxHistory />} />
          <Route path="/TxSearch" element={<TxSearch />} />
          <Route path="/Network" element={<Network />} />
          <Route path="/tx/:txid" element={<TxDetail />} />
        </Routes>
        <ToastContainer position="top-center" />
      </div>
    </Router>
  );
}

export default App;
