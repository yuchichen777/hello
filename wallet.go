package main

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"log"
)

// Wallet 結構
type Wallet struct {
	PrivateKey *ecdsa.PrivateKey
	PublicKey  []byte // 壓縮或未壓縮格式
	Address    string
}

// 建立錢包
func NewWallet() *Wallet {
	private, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		log.Fatal(err)
	}
	pubKey := append(private.PublicKey.X.Bytes(), private.PublicKey.Y.Bytes()...)

	address := generateAddress(pubKey)

	fmt.Println("wallet created")

	return &Wallet{
		PrivateKey: private,
		PublicKey:  pubKey,
		Address:    address,
	}
}

// 產生地址（對 pubKey 做 sha256，再取前 20 bytes）
func generateAddress(pubKey []byte) string {
	hash := sha256.Sum256(pubKey)
	return hex.EncodeToString(hash[:20])
}

// 對交易內容做簽名
func SignTransaction(tx Transaction, privKey *ecdsa.PrivateKey) (string, error) {
	msg := txMessage(tx)
	hash := sha256.Sum256([]byte(msg))
	r, s, err := ecdsa.Sign(rand.Reader, privKey, hash[:])
	if err != nil {
		return "", err
	}
	signature := append(r.Bytes(), s.Bytes()...)
	return hex.EncodeToString(signature), nil
}
