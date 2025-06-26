let currentApi = "http://localhost:8080"; // fallback 預設值

export async function initAPI() {
  try {
    const res = await fetch("http://localhost:8080/peers"); // 或使用本機 peers.json 靜態路徑
    const peers = await res.json();

    // 取第一個節點作為初始 backend API
    if (Array.isArray(peers) && peers.length > 0) {
      currentApi = peers[0];
    }
  } catch (err) {
    console.warn("無法載入 peers，使用預設 API:", err);
  }
}

export function setAPI(url) {
  currentApi = url;
}

export function getAPI() {
  return currentApi;
}
