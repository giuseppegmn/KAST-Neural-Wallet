import { useForecast } from "./hooks/useForecast";

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
      
      {isLoading && <p style={{textAlign: "center", color: "#00d4ff"}}>Loading...</p>}
      
      {error && (
        <div style={{ backgroundColor: "#ff444420", border: "1px solid #ff4444", padding: "20px", borderRadius: "8px", marginBottom: "20px", textAlign: "center" }}>
          <p style={{ color: "#ff4444" }}>⚠️ Error: {error}</p>
          <button onClick={refresh} style={{ marginTop: "10px", padding: "10px 20px", backgroundColor: "#ff4444", color: "white", border: "none", borderRadius: "5px", cursor: "pointer" }}>Try Again</button>
        </div>
      )}
      
      {!isLoading && !error && prices.length > 0 && (
        <div style={{ backgroundColor: "#111", borderRadius: "12px", padding: "20px", border: "1px solid #222" }}>
          {prices.map((p: any) => (
            <div key={p.symbol} style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "20px",
              borderBottom: "1px solid #222",
              marginBottom: "10px"
            }}>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontWeight: "bold", fontSize: "24px", color: "#00d4ff" }}>
                  {p.symbol}
                </span>
                <span style={{ fontSize: "14px", color: "#666", marginTop: "5px" }}>
                  Confidence: ±{(p.relativeUncertainty * 100).toFixed(2)}%
                </span>
              </div>
              
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "32px", fontWeight: "bold", color: "#fff" }}>
                  ${p.price?.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </div>
                <div style={{ fontSize: "12px", color: "#444", marginTop: "5px" }}>
                  {p.lastUpdated || "Now"}
                </div>
              </div>
            </div>
          ))}
          
          <button onClick={refresh} style={{
            width: "100%",
            marginTop: "20px",
            padding: "15px",
            backgroundColor: "#00d4ff",
            color: "#000",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "bold",
            fontSize: "18px"
          }}>🔄 Update Prices</button>
        </div>
      )}
      
      <p style={{ textAlign: "center", marginTop: "30px", fontSize: "12px", color: "#333" }}>
        Data provided by Pyth Network • Auto-refresh every 30s
      </p>
    </div>
  );
}
