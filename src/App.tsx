import { useMemo, useState } from "react";
import { useForecast } from "./hooks/useForecast";
import { useDecision } from "./hooks/useDecision";

export default function App() {
  const { prices = [], isLoading, error, refresh } = useForecast({});
  
  return (
    <div style={{ 
      padding: "40px", 
      fontFamily: "Segoe UI, Arial, sans-serif",
      backgroundColor: "#0a0a0a",
      color: "#fff",
      minHeight: "100vh",
      maxWidth: "800px",
      margin: "0 auto"
    }}>
      <h1 style={{ color: "#00d4ff", marginBottom: "10px", textAlign: "center" }}>
        🧠 KAST Neural Wallet
      </h1>
      <p style={{ textAlign: "center", color: "#888", marginBottom: "30px" }}>
        Powered by Pyth Network Oracle
      </p>
      
      {isLoading && (
        <div style={{ textAlign: "center", padding: "40px", color: "#00d4ff" }}>
          <div style={{ fontSize: "24px", marginBottom: "10px" }}>⏳</div>
          <p>Carregando dados do oráculo...</p>
        </div>
      )}
      
      {error && (
        <div style={{ 
          backgroundColor: "#ff444420", 
          border: "1px solid #ff4444",
          padding: "20px",
          borderRadius: "8px",
          marginBottom: "20px",
          textAlign: "center"
        }}>
          <p style={{ color: "#ff4444", marginBottom: "10px" }}>⚠️ Erro ao conectar com o oráculo</p>
          <p style={{ fontSize: "14px", color: "#ff6666" }}>{error}</p>
          <button onClick={refresh} style={{
            marginTop: "15px",
            padding: "10px 20px",
            backgroundColor: "#ff4444",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
            fontWeight: "bold"
          }}>🔄 Tentar Novamente</button>
        </div>
      )}
      
      {!isLoading && !error && prices.length === 0 && (
        <p style={{ textAlign: "center", color: "#666" }}>Nenhum dado disponível</p>
      )}
      
      {!isLoading && !error && prices.length > 0 && (
        <div style={{
          backgroundColor: "#111",
          borderRadius: "12px",
          padding: "20px",
          border: "1px solid #222"
        }}>
          {prices.map((p: any) => (
            <div key={p.symbol} style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "15px",
              borderBottom: "1px solid #222"
            }}>
              <div>
                <span style={{ fontWeight: "bold", fontSize: "18px", color: "#00d4ff" }}>
                  {p.symbol}
                </span>
                <span style={{ fontSize: "12px", color: "#666", marginLeft: "10px" }}>
                  ±{(p.relativeUncertainty * 100).toFixed(2)}%
                </span>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "20px", fontWeight: "bold", color: "#fff" }}>
                  
                </div>
                <div style={{ fontSize: "11px", color: "#444" }}>
                  Atualizado: {p.lastUpdated || "Agora"}
                </div>
              </div>
            </div>
          ))}
          
          <button onClick={refresh} style={{
            width: "100%",
            marginTop: "20px",
            padding: "12px",
            backgroundColor: "#00d4ff",
            color: "#000",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "bold",
            fontSize: "16px"
          }}>🔄 Atualizar Preços</button>
        </div>
      )}
      
      <div style={{ textAlign: "center", marginTop: "30px", fontSize: "12px", color: "#333" }}>
        Dados fornecidos por Pyth Network • Atualização automática a cada 30s
      </div>
    </div>
  );
}
