// File: main.go
// Description: A simple blockchain implementation in Go with REST API for transactions, mining, and wallet management.
package main

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"math/big"
	"net/http"
	"os"
	"sort"
	"strconv"
	"strings"
	"time"
)

type Block struct {
	Index     int           `json:"index"`
	Timestamp string        `json:"timestamp"`
	Txs       []Transaction `json:"txs"`
	PrevHash  string        `json:"prevHash"`
	Hash      string        `json:"hash"`
	Nonce     int           `json:"nonce"`
}

type Transaction struct {
	From      string  `json:"from"`
	To        string  `json:"to"`
	Amount    float64 `json:"amount"`
	PubKey    string  `json:"pubKey"`
	Signature string  `json:"signature"`
	Timestamp int64   `json:"timestamp"`
	TxID      string  `json:"txid"`
}

var (
	blockchain []Block
	balances   = make(map[string]float64)
	txPool     []Transaction
	peers      []string
	dataFile   = "blockchain.json"
	peerFile   = "peers.json"
	selfPort   = "8080"
	selfURL    = ""
)

func savePeersToFile() {
	file, err := os.Create(peerFile)
	if err != nil {
		log.Println("❌ 無法儲存 peers.json:", err)
		return
	}
	defer file.Close()
	json.NewEncoder(file).Encode(peers)
}

func loadPeersFromFile() {
	file, err := os.Open(peerFile)
	if err != nil {
		log.Println("⚠️ 找不到 peers.json，使用預設節點")
		peers = defaultPeers()
		savePeersToFile()
		return
	}
	defer file.Close()

	if err := json.NewDecoder(file).Decode(&peers); err != nil || len(peers) == 0 {
		log.Println("⚠️ peers.json 空或格式錯誤，使用預設節點")
		peers = defaultPeers()
		savePeersToFile()
	}

	// 若 peers 沒有包含 localhost:8080，則補上
	found := false
	for _, p := range peers {
		if p == "http://localhost:8080" {
			found = true
			break
		}
	}
	if !found {
		peers = append(peers, "http://localhost:8080")
		savePeersToFile()
	}

	// 移除與自身相同的 peer
	selfURL := fmt.Sprintf("http://localhost:%s", selfPort)
	filtered := []string{}
	for _, peer := range peers {
		if peer != selfURL {
			filtered = append(filtered, peer)
		}
	}
	peers = filtered
}

func handleGetTxByID(w http.ResponseWriter, r *http.Request) {
	txid := strings.TrimPrefix(r.URL.Path, "/tx/")
	if txid == "" {
		http.Error(w, "缺少 txid", http.StatusBadRequest)
		return
	}

	// 先查打包的區塊
	for _, block := range blockchain {
		for _, tx := range block.Txs {
			if tx.TxID == txid {
				json.NewEncoder(w).Encode(map[string]interface{}{
					"status":    "confirmed",
					"tx":        tx,
					"timestamp": tx.Timestamp,
					"block":     block.Index,
				})
				return
			}
		}
	}

	// 查交易池
	for _, tx := range txPool {
		if tx.TxID == txid {
			json.NewEncoder(w).Encode(map[string]interface{}{
				"status":    "pending",
				"tx":        tx,
				"timestamp": tx.Timestamp,
			})
			return
		}
	}

	http.Error(w, "找不到交易", http.StatusNotFound)
}

func generateTxID(tx Transaction) string {
	input := tx.From + tx.To + fmt.Sprintf("%.4f", tx.Amount) + fmt.Sprintf("%d", tx.Timestamp) + tx.Signature
	hash := sha256.Sum256([]byte(input))
	return fmt.Sprintf("%x", hash[:])
}

func calculateHash(block Block) string {
	record := strconv.Itoa(block.Index) + block.Timestamp + block.PrevHash + strconv.Itoa(block.Nonce)
	for _, tx := range block.Txs {
		record += txMessage(tx)
	}
	h := sha256.Sum256([]byte(record))
	return fmt.Sprintf("%x", h)
}

func mineBlock(prev Block, txs []Transaction, difficulty int) Block {
	block := Block{
		Index:     prev.Index + 1,
		Timestamp: time.Now().String(),
		Txs:       txs,
		PrevHash:  prev.Hash,
		Nonce:     0,
	}
	prefix := strings.Repeat("0", difficulty)
	for {
		block.Hash = calculateHash(block)
		if strings.HasPrefix(block.Hash, prefix) {
			break
		}
		block.Nonce++
	}
	return block
}

func applyTransaction(tx Transaction) {
	if tx.From != "SYSTEM" {
		balances[tx.From] -= tx.Amount
	}
	balances[tx.To] += tx.Amount
}

func rebuildBalancesFromBlockchain() {
	balances = make(map[string]float64)
	for _, block := range blockchain {
		for _, tx := range block.Txs {
			applyTransaction(tx)
		}
	}
}

func isTransactionValid(tx Transaction) bool {
	if tx.From == "SYSTEM" {
		return true
	}
	if tx.From == tx.To || tx.Amount <= 0 || balances[tx.From] < tx.Amount {
		return false
	}
	return VerifyTransactionSignature(tx)
}

func saveBlockchainToFile() {
	file, _ := os.Create(dataFile)
	defer file.Close()
	json.NewEncoder(file).Encode(blockchain)
}

func loadBlockchainFromFile() {
	file, err := os.Open(dataFile)
	if err != nil {
		genesis := Block{
			Index:     0,
			Timestamp: time.Now().String(),
			Txs:       []Transaction{{From: "SYSTEM", To: "GENESIS", Amount: 0}},
			PrevHash:  "",
			Nonce:     0,
		}
		genesis.Hash = calculateHash(genesis)
		blockchain = append(blockchain, genesis)
		saveBlockchainToFile()
		return
	}
	defer file.Close()
	json.NewDecoder(file).Decode(&blockchain)
	rebuildBalancesFromBlockchain()
}

func handleGetBlocks(w http.ResponseWriter, r *http.Request) {
	json.NewEncoder(w).Encode(blockchain)
}

func handleGetBalance(w http.ResponseWriter, r *http.Request) {
	acct := strings.TrimPrefix(r.URL.Path, "/balance/")
	if b, ok := balances[acct]; ok {
		json.NewEncoder(w).Encode(map[string]interface{}{"account": acct, "balance": b})
	} else {
		http.Error(w, "帳戶不存在", 404)
	}
}

func handleAddBlock(w http.ResponseWriter, r *http.Request) {
	var tx Transaction
	json.NewDecoder(r.Body).Decode(&tx)
	if !isTransactionValid(tx) {
		http.Error(w, "❌ 餘額不足或格式錯誤", http.StatusForbidden)
		return
	}
	txPool = append(txPool, tx)
	json.NewEncoder(w).Encode(map[string]string{"message": "交易加入池中"})
}

func txConfirmed(txid string) bool {
	for _, block := range blockchain {
		for _, tx := range block.Txs {
			if tx.TxID == txid {
				return true
			}
		}
	}
	return false
}

func filterUnconfirmedOnly(pool []Transaction, confirmed []Transaction) []Transaction {
	c := make(map[string]bool)
	for _, tx := range confirmed {
		c[tx.TxID] = true
	}
	result := []Transaction{}
	for _, tx := range pool {
		if !c[tx.TxID] {
			result = append(result, tx)
		}
	}
	return result
}

func handleMine(w http.ResponseWriter, r *http.Request) {
	miner := r.URL.Query().Get("miner")
	if miner == "" {
		http.Error(w, "缺少 miner 參數", http.StatusBadRequest)
		return
	}
	if len(txPool) == 0 {
		http.Error(w, "交易池為空", http.StatusBadRequest)
		return
	}

	// 排除已存在區塊鏈中的交易
	filtered := []Transaction{}
	for _, tx := range txPool {
		if isTransactionValid(tx) && !txConfirmed(tx.TxID) {
			filtered = append(filtered, tx)
		}
	}

	if len(filtered) == 0 {
		http.Error(w, "無有效交易可打包", http.StatusBadRequest)
		return
	}

	// 加上礦工獎勵
	reward := Transaction{From: "SYSTEM", To: miner, Amount: 10, Timestamp: time.Now().Unix()}
	reward.TxID = generateTxID(reward)
	filtered = append(filtered, reward)

	newBlock := mineBlock(blockchain[len(blockchain)-1], filtered, 3)
	blockchain = append(blockchain, newBlock)
	for _, tx := range filtered {
		applyTransaction(tx)
	}
	saveBlockchainToFile()

	// 移除已打包的交易
	txPool = filterUnconfirmedOnly(txPool, newBlock.Txs)

	broadcastBlock(newBlock)
	json.NewEncoder(w).Encode(map[string]string{"message": "挖礦成功，已打包交易與獎勵"})
}

func handleFaucet(w http.ResponseWriter, r *http.Request) {
	var req struct {
		To     string  `json:"to"`
		Amount float64 `json:"amount"` // Optional: 可從前端傳入
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.To == "" {
		http.Error(w, "請提供有效地址", http.StatusBadRequest)
		return
	}
	if req.Amount <= 0 {
		req.Amount = 100 // 預設發 100
	}
	tx := Transaction{From: "SYSTEM", To: req.To, Amount: req.Amount, Timestamp: time.Now().Unix()}
	tx.TxID = generateTxID(tx)
	txPool = append(txPool, tx)

	json.NewEncoder(w).Encode(map[string]interface{}{
		"message":   "已請求 Faucet，等待礦工打包",
		"status":    "queued",
		"to":        req.To,
		"amount":    req.Amount,
		"txid":      tx.TxID,
		"timestamp": tx.Timestamp,
	})
}

func handlePeers(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodGet {
		json.NewEncoder(w).Encode(peers)
		return
	}

	var req struct {
		URL string `json:"url"`
	}
	json.NewDecoder(r.Body).Decode(&req)

	selfURL := fmt.Sprintf("http://localhost:%s", selfPort)
	if req.URL == selfURL {
		http.Error(w, "❌ 無法加入自己作為節點", http.StatusBadRequest)
		return
	}

	// 避免重複加入
	for _, peer := range peers {
		if peer == req.URL {
			json.NewEncoder(w).Encode(map[string]string{
				"message": "節點已存在", "peer": req.URL,
			})
			return
		}
	}

	peers = append(peers, req.URL)
	savePeersToFile()
	json.NewEncoder(w).Encode(map[string]string{"message": "✅ 已新增節點", "peer": req.URL})
}

func defaultPeers() []string {
	return []string{"http://localhost:8080"}
}

func txExists(tx Transaction) bool {
	for _, existing := range txPool {
		if tx.TxID == existing.TxID {
			return true
		}
	}
	return false
}

func handleSync(w http.ResponseWriter, r *http.Request) {
	for _, peer := range peers {
		resp, err := http.Get(peer + "/blocks")
		if err != nil {
			continue
		}
		defer resp.Body.Close()
		var remoteChain []Block
		json.NewDecoder(resp.Body).Decode(&remoteChain)
		if len(remoteChain) > len(blockchain) && isChainValid(remoteChain) {
			blockchain = remoteChain
			rebuildBalancesFromBlockchain()
			saveBlockchainToFile()
			log.Println("🔁 區塊鏈已同步自：", peer)
		}

		// 同步交易池
		txResp, err := http.Get(peer + "/txpool")
		if err == nil {
			var remotePool []Transaction
			json.NewDecoder(txResp.Body).Decode(&remotePool)
			txResp.Body.Close()

			for _, tx := range remotePool {
				if isTransactionValid(tx) && !txExists(tx) {
					txPool = append(txPool, tx)
				}
			}
		}
	}
	json.NewEncoder(w).Encode(map[string]string{"message": "同步完成"})
}

func handleReceive(w http.ResponseWriter, r *http.Request) {
	var newBlock Block
	json.NewDecoder(r.Body).Decode(&newBlock)
	last := blockchain[len(blockchain)-1]
	if newBlock.PrevHash == last.Hash && calculateHash(newBlock) == newBlock.Hash {
		blockchain = append(blockchain, newBlock)
		for _, tx := range newBlock.Txs {
			applyTransaction(tx)
		}
		saveBlockchainToFile()
		log.Println("📥 接收來自節點的新區塊：", newBlock.Index)
	}
}

func broadcastBlock(block Block) {
	for _, peer := range peers {
		b, _ := json.Marshal(block)
		http.Post(peer+"/receive", "application/json", strings.NewReader(string(b)))
	}
}

type SignRequest struct {
	From    string  `json:"from"`
	To      string  `json:"to"`
	Amount  float64 `json:"amount"`
	PrivKey string  `json:"privKey"`
}

func handleSignTx(w http.ResponseWriter, r *http.Request) {
	var req SignRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "❌ JSON 格式錯誤", http.StatusBadRequest)
		return
	}
	// 將私鑰轉為 big.Int
	privKeyBytes, _ := hex.DecodeString(req.PrivKey)
	priv := new(ecdsa.PrivateKey)
	priv.Curve = elliptic.P256()
	priv.D = new(big.Int).SetBytes(privKeyBytes)
	priv.PublicKey.X, priv.PublicKey.Y = priv.Curve.ScalarBaseMult(priv.D.Bytes())
	priv.PublicKey.Curve = priv.Curve
	pubKey := append(priv.PublicKey.X.Bytes(), priv.PublicKey.Y.Bytes()...)
	address := sha256.Sum256(pubKey)
	if req.From != fmt.Sprintf("%x", address[:20]) {
		http.Error(w, "❌ From 地址與私鑰不符", http.StatusForbidden)
		return
	}
	tx := Transaction{From: req.From, To: req.To, Amount: req.Amount, PubKey: fmt.Sprintf("%x", pubKey), Timestamp: time.Now().Unix()}
	hash := sha256.Sum256([]byte(txMessage(tx)))
	rSig, sSig, _ := ecdsa.Sign(rand.Reader, priv, hash[:])
	sig := append(rSig.Bytes(), sSig.Bytes()...)
	tx.Signature = fmt.Sprintf("%x", sig)
	tx.TxID = generateTxID(tx)
	json.NewEncoder(w).Encode(tx)
}

func handleTxHistory(w http.ResponseWriter, r *http.Request) {
	addr := strings.TrimPrefix(r.URL.Path, "/txs/")
	var result []map[string]interface{}

	// 找出交易池中尚未打包的交易
	inPool := func(tx Transaction) bool {
		for _, pending := range txPool {
			if tx.From == pending.From && tx.To == pending.To && tx.Amount == pending.Amount && tx.Timestamp == pending.Timestamp {
				return true
			}
		}
		return false
	}

	// 掃區塊鏈內所有交易
	for _, block := range blockchain {
		for _, tx := range block.Txs {
			if tx.From == addr || tx.To == addr {
				status := "confirmed"
				if inPool(tx) {
					status = "pending"
				}
				result = append(result, map[string]interface{}{
					"from":      tx.From,
					"to":        tx.To,
					"amount":    tx.Amount,
					"status":    status,
					"timestamp": tx.Timestamp,
					"txid":      tx.TxID,
				})
			}
		}
	}

	// 額外加入純粹在 pool 中、還未進區塊鏈的
	for _, tx := range txPool {
		if tx.From == addr || tx.To == addr {
			result = append(result, map[string]interface{}{
				"from":      tx.From,
				"to":        tx.To,
				"amount":    tx.Amount,
				"status":    "pending",
				"timestamp": tx.Timestamp,
				"txid":      tx.TxID,
			})
		}
	}

	sort.Slice(result, func(i, j int) bool {
		return result[i]["timestamp"].(int64) > result[j]["timestamp"].(int64)
	})

	json.NewEncoder(w).Encode(result)
}

func handleCreateWallet(w http.ResponseWriter, r *http.Request) {
	// 產生 ECDSA 金鑰對
	priv, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		http.Error(w, "無法產生金鑰", http.StatusInternalServerError)
		return
	}

	// 計算公鑰與地址
	pubKey := append(priv.PublicKey.X.Bytes(), priv.PublicKey.Y.Bytes()...)
	hash := sha256.Sum256(pubKey)
	address := fmt.Sprintf("%x", hash[:20])

	// 加入 balances，初始為 0
	if _, exists := balances[address]; !exists {
		balances[address] = 0
	}

	// 回傳私鑰、公鑰、地址
	resp := map[string]string{
		"privateKey": fmt.Sprintf("%x", priv.D.Bytes()),
		"publicKey":  fmt.Sprintf("%x", pubKey),
		"address":    address,
	}
	json.NewEncoder(w).Encode(resp)
}

func txMessage(tx Transaction) string {
	return fmt.Sprintf("%s%s%.4f%d", tx.From, tx.To, tx.Amount, tx.Timestamp)
}

func VerifyTransactionSignature(tx Transaction) bool {
	hash := sha256.Sum256([]byte(txMessage(tx)))
	pubKeyBytes, err := hex.DecodeString(tx.PubKey)
	if err != nil || len(pubKeyBytes) != 64 {
		return false
	}
	x := new(big.Int).SetBytes(pubKeyBytes[:32])
	y := new(big.Int).SetBytes(pubKeyBytes[32:])
	pubKey := ecdsa.PublicKey{Curve: elliptic.P256(), X: x, Y: y}
	sigBytes, err := hex.DecodeString(tx.Signature)
	if err != nil || len(sigBytes) < 64 {
		return false
	}
	r := new(big.Int).SetBytes(sigBytes[:32])
	s := new(big.Int).SetBytes(sigBytes[32:])
	return ecdsa.Verify(&pubKey, hash[:], r, s)
}

func isChainValid(chain []Block) bool {
	for i := 1; i < len(chain); i++ {
		current := chain[i]
		prev := chain[i-1]
		if current.Hash != calculateHash(current) {
			log.Println("❌ 區塊", i, "的 Hash 不正確")
			return false
		}
		if current.PrevHash != prev.Hash {
			log.Println("❌ 區塊", i, "的 PrevHash 錯誤")
			return false
		}
	}
	return true
}

func withCORS(h http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		h(w, r)
	}
}

func handleTxPool(w http.ResponseWriter, r *http.Request) {
	if txPool == nil {
		txPool = []Transaction{}
	}
	json.NewEncoder(w).Encode(txPool)
}

func main() {
	loadBlockchainFromFile()

	// 解析 port
	selfPort = "8080"
	if len(os.Args) > 1 && strings.HasPrefix(os.Args[1], "-port=") {
		selfPort = strings.TrimPrefix(os.Args[1], "-port=")
	}
	selfURL = fmt.Sprintf("http://localhost:%s", selfPort)

	loadPeersFromFile()
	http.HandleFunc("/blocks", withCORS(handleGetBlocks))
	http.HandleFunc("/balance/", withCORS(handleGetBalance))
	http.HandleFunc("/add", withCORS(handleAddBlock))
	http.HandleFunc("/mine", withCORS(handleMine))
	http.HandleFunc("/faucet", withCORS(handleFaucet))
	http.HandleFunc("/signTx", withCORS(handleSignTx))
	http.HandleFunc("/createWallet", withCORS(handleCreateWallet))
	http.HandleFunc("/peers", withCORS(handlePeers))
	http.HandleFunc("/sync", withCORS(handleSync))
	http.HandleFunc("/receive", withCORS(handleReceive))
	http.HandleFunc("/txs/", withCORS(handleTxHistory))
	http.HandleFunc("/txpool", withCORS(handleTxPool))
	http.HandleFunc("/tx/", withCORS(handleGetTxByID))

	// 預設 port
	port := "8080"
	if len(os.Args) > 1 && strings.HasPrefix(os.Args[1], "-port=") {
		port = strings.TrimPrefix(os.Args[1], "-port=")
	}

	log.Printf("✅ 區塊鏈伺服器啟動：%s\n", selfURL)

	if !isChainValid(blockchain) {
		log.Fatal("❌ 區塊鏈驗證失敗")
	}

	http.ListenAndServe(":"+port, nil)
}
