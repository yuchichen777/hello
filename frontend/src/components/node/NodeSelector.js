// src/components/node/NodeSelector.js
import React, { useEffect, useState } from "react";
import axios from "axios";
import { getAPI, setAPI } from "../../lib/api";

export default function NodeSelector() {
    const api = getAPI();
    const [nodes, setNodes] = useState([{ name: "本地節點", url: api }]);
    const [selected, setSelected] = useState(api);

    // 取得 peers.json 並整理節點清單
    useEffect(() => {
        axios.get(`${api}/peers`)
            .then((res) => {
                const peers = Array.isArray(res.data) ? res.data : [];
                const formatted = [
                    { name: "本地節點", url: api },
                    ...peers.map((url, i) => ({ name: `節點 ${i + 1}`, url }))
                ];
                setNodes(formatted);

                // 預設選第一個節點（本地）
                setSelected(api);
                setAPI(api);
            })
            .catch(() => {
                setNodes([{ name: "本地節點", url: api }]);
                setSelected(api);
                setAPI(api);
            });
    }, [api]);

    const handleChange = (e) => {
        const newURL = e.target.value;
        setSelected(newURL);
        setAPI(newURL); // 實際切換後端 API
    };

    return (
        <div className="mb-4">
            <label className="font-medium mr-2">🌐 節點選擇：</label>
            <select
                value={selected}
                onChange={handleChange}
                className="border px-2 py-1 rounded"
            >
                {nodes.map((node) => (
                    <option key={node.url} value={node.url}>
                        {node.name} ({node.url})
                    </option>
                ))}
            </select>
        </div>
    );
}

