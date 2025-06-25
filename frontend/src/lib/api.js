// src/lib/api.js
const DEFAULT_API = localStorage.getItem("backendURL") || "http://localhost:8080";

let currentApi = DEFAULT_API;

export function setAPI(url) {
  currentApi = url;
  localStorage.setItem("backendURL", url);
}

export function getAPI() {
  return currentApi;
}
