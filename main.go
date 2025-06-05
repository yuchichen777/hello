package main

import (
    "crypto/sha256"
    "encoding/json"
    "fmt"
    "io"
    "log"
    "net/http"
    "strconv"
    "strings"
    "time"
)

// 區塊結構
type Block struct {
    Index     int    `json:"index"`
    Timestamp string `json:"timestamp"`
    Data      string `json:"data"`
    PrevHash  string `json:"prevHash"`
    Hash      string `json:"hash"`
    Nonce     int    `json:"nonce"`
}

var blockchain []Block

// 雜湊計算
func calculateHash(block Block) string {
    record := strconv.Itoa(block.Index) + block.Timestamp + block.Data + block.PrevHash + strconv.Itoa(block.Nonce)
    hash := sha256.Sum256([]byte(record))
    return fmt.Sprintf("%x", hash)
}

// 工作量證明（挖礦）
func mineBlock(oldBlock Block, data string, difficulty int) Block {
    newBlock := Block{
        Index:     oldBlock.Index + 1,
        Timestamp: time.Now().String(),
        Data:      data,
        PrevHash:  oldBlock.Hash,
        Nonce:     0,
    }

    prefix := strings.Repeat("0", difficulty)
    for {
        newBlock.Hash = calculateHash(newBlock)
        if strings.HasPrefix(newBlock.Hash, prefix) {
            break
        }
        newBlock.Nonce++
    }

    return newBlock
}

// 區塊鏈合法性驗證
func isChainValid(chain []Block) bool {
    for i := 1; i < len(chain); i++ {
        current := chain[i]
        prev := chain[i-1]

        if current.Hash != calculateHash(current) {
            log.Println("❌ Hash 錯誤 at block", i)
            return false
        }

        if current.PrevHash != prev.Hash {
            log.Println("❌ 前雜湊錯誤 at block", i)
            return false
        }
    }
    return true
}

// 處理 GET /blocks
func handleGetBlocks(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(blockchain)
}

// 處理 POST /add
type BlockData struct {
    Data string `json:"data"`
}

func handleAddBlock(w http.ResponseWriter, r *http.Request) {
    var input BlockData
    body, _ := io.ReadAll(r.Body)
    json.Unmarshal(body, &input)

    lastBlock := blockchain[len(blockchain)-1]
    newBlock := mineBlock(lastBlock, input.Data, 3)
    blockchain = append(blockchain, newBlock)

    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusCreated)
    json.NewEncoder(w).Encode(newBlock)
}

func main() {
    // 建立創世區塊
    genesis := Block{
        Index:     0,
        Timestamp: time.Now().String(),
        Data:      "Genesis Block",
        PrevHash:  "",
        Nonce:     0,
    }
    genesis.Hash = calculateHash(genesis)
    blockchain = append(blockchain, genesis)

    http.HandleFunc("/blocks", handleGetBlocks)
    http.HandleFunc("/add", handleAddBlock)

    log.Println("✅ 區塊鏈伺服器啟動：http://localhost:8080")
    if !isChainValid(blockchain) {
        log.Fatal("區塊鏈驗證失敗！")
    }

    log.Fatal(http.ListenAndServe(":8080", nil))
}
// 使用 curl 測試
// 創建區塊：curl -X POST -H "Content-Type: application/json" -d '{"data":"新區塊資料"}' http://localhost:8080/add