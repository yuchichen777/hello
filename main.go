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
}

var (
	blockchain []Block
	balances   = make(map[string]float64)
	txPool     []Transaction
	peers      []string
	dataFile   = "blockchain.json"
)

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
	validTxs := []Transaction{}
	for _, tx := range txPool {
		if isTransactionValid(tx) {
			validTxs = append(validTxs, tx)
		}
	}
	reward := Transaction{From: "SYSTEM", To: miner, Amount: 10}
	validTxs = append(validTxs, reward)
	newBlock := mineBlock(blockchain[len(blockchain)-1], validTxs, 3)
	blockchain = append(blockchain, newBlock)
	for _, tx := range validTxs {
		applyTransaction(tx)
	}
	txPool = []Transaction{}
	saveBlockchainToFile()
	broadcastBlock(newBlock)
	json.NewEncoder(w).Encode(map[string]string{"message": "挖礦成功，已打包交易與獎勵"})
}

func handleFaucet(w http.ResponseWriter, r *http.Request) {
	var req struct {
		To string `json:"to"`
	}
	json.NewDecoder(r.Body).Decode(&req)
	tx := Transaction{From: "SYSTEM", To: req.To, Amount: 100}
	txPool = append(txPool, tx)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message": "系統將發送 100 tokens",
		"status":  "queued",
		"to":      req.To,
	})
}

func handlePeers(w http.ResponseWriter, r *http.Request) {
	var req struct {
		URL string `json:"url"`
	}
	json.NewDecoder(r.Body).Decode(&req)
	peers = append(peers, req.URL)
	json.NewEncoder(w).Encode(map[string]string{"message": "已新增節點", "peer": req.URL})
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
	tx := Transaction{From: req.From, To: req.To, Amount: req.Amount, PubKey: fmt.Sprintf("%x", pubKey)}
	hash := sha256.Sum256([]byte(txMessage(tx)))
	rSig, sSig, _ := ecdsa.Sign(rand.Reader, priv, hash[:])
	sig := append(rSig.Bytes(), sSig.Bytes()...)
	tx.Signature = fmt.Sprintf("%x", sig)
	json.NewEncoder(w).Encode(tx)
}

func handleCreateWallet(w http.ResponseWriter, r *http.Request) {
	priv, _ := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	pubKey := append(priv.PublicKey.X.Bytes(), priv.PublicKey.Y.Bytes()...)
	address := sha256.Sum256(pubKey)
	resp := map[string]string{
		"privateKey": fmt.Sprintf("%x", priv.D.Bytes()),
		"publicKey":  fmt.Sprintf("%x", pubKey),
		"address":    fmt.Sprintf("%x", address[:20]),
	}
	json.NewEncoder(w).Encode(resp)
}

func txMessage(tx Transaction) string {
	return tx.From + tx.To + fmt.Sprintf("%.4f", tx.Amount)
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

func main() {
	loadBlockchainFromFile()
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
	log.Println("✅ 區塊鏈伺服器啟動：http://localhost:8080")
	if !isChainValid(blockchain) {
		log.Fatal("❌ 區塊鏈驗證失敗")
	}

	port := ":8080"
	if len(os.Args) > 1 && strings.HasPrefix(os.Args[1], "-port=") {
		port = ":" + strings.TrimPrefix(os.Args[1], "-port=")
	}
	http.ListenAndServe(port, nil)
}
