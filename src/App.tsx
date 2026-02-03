import { useMemo, useState } from "react";
import { useForecast } from "./hooks/useForecast";
import { useDecision } from "./hooks/useDecision";

export default function App() {
  const { prices = [], isLoading, error, refresh } = useForecast({});
  
  // Debug - ver no console o que está vindo
  console.log("Prices:", prices);
  console.log("isLoading:", isLoading);
  
  return (
    <div style={{ padding: "20px", fontFamily: "Arial" }}>
      <h1>KAST Neural Wallet</h1>
      {isLoading && <p>Carregando...</p>}
      {error && <p style={{ color: "red" }}>Erro: {error}</p>}
      
      {!isLoading && prices.length === 0 && (
        <p>Nenhum preço encontrado (array vazio)</p>
      )}
      
      {prices && prices.length > 0 && (
        <ul>
          {prices.map((p: any) => (
            <li key={p.symbol}>
              {p.symbol}: ${p.price} (±{p.relativeUncertainty * 100}%)
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
