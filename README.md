# 🧠 KAST Neural Wallet

[![React](https://img.shields.io/badge/React-18-blue)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-6-purple)](https://vitejs.dev)
[![Pyth Network](https://img.shields.io/badge/Oracle-Pyth_Network-green)](https://pyth.network)

Neural crypto wallet with real-time price feeds from **Pyth Network Oracle**. Live monitoring for BTC, ETH, SOL, USDC & USDT.

## ✨ Features

- 📊 **Real-time prices** via Pyth Network Hermes API
- 🔄 **Auto-refresh** every 30 seconds
- 🎯 **Uncertainty/Confidence** indicators for each asset
- ⚡ **High performance** with React + Vite + TypeScript
- 🎨 **Clean UI** with dark theme

## 🚀 Tech Stack

- **Frontend**: React 18 + TypeScript 5 + Vite 6
- **Oracle**: Pyth Network (Hermes Client)
- **Styling**: Inline Styles (CSS-in-JS)

## 📦 Installation

`ash
git clone https://github.com/giuseppegmn/KAST-Neural-Wallet.git
cd KAST-Neural-Wallet
npm install
npm run dev

Access: http://localhost:5173
🔮 About Pyth Network
This project uses Pyth Network, one of the largest financial data oracle networks, providing high-frequency, low-latency price data for digital assets.
Docs: https://docs.pyth.network
Price Feeds: https://pyth.network/price-feeds
🛠️ Project Structure

src/
├── hooks/
│   └── useForecast.ts    # Custom hook for Pyth data
├── App.tsx               # Main component
└── main.tsx             # Entry point

📝 License
MIT License