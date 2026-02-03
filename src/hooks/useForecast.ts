import { useState, useEffect } from "react";
import { HermesClient } from "@pythnetwork/hermes-client";

// IDs dos feeds de preço Pyth (https://docs.pyth.network/price-feeds/price-feed-ids)
const PRICE_FEEDS = {
  BTC: "e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43",
  ETH: "ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
  SOL: "ef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d",
  USDC: "eaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a",
  USDT: "2b89b9dc8fdf9f34709a5b106b472f0f39bb6ca9ce04b0fd7f2e971688e2e53b"
};

export function useForecast(_options: any) {
  const [prices, setPrices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPrices = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Conectar ao Hermes (API da Pyth)
      const connection = new HermesClient("https://hermes.pyth.network", {});
      
      // Buscar atualizações de preço mais recentes
      const priceIds = Object.values(PRICE_FEEDS);
      const updates = await connection.getLatestPriceUpdates(priceIds);
      
      // Mapear os dados recebidos
      const mappedPrices = updates.parsed.map((item: any) => {
        const symbol = Object.keys(PRICE_FEEDS).find(
          key => PRICE_FEEDS[key as keyof typeof PRICE_FEEDS] === item.id
        );
        
        // Calcular preço real (o valor vem multiplicado por 10^expo)
        const rawPrice = Number(item.price.price);
        const expo = item.price.expo;
        const price = rawPrice * Math.pow(10, expo);
        
        // Incerteza/confiança (confidence interval)
        const conf = Number(item.price.conf) * Math.pow(10, expo);
        const relativeUncertainty = price > 0 ? conf / price : 0;
        
        return {
          symbol: symbol || "UNKNOWN",
          price: price,
          relativeUncertainty: relativeUncertainty,
          lastUpdated: new Date(item.price.publish_time * 1000).toLocaleString()
        };
      });
      
      setPrices(mappedPrices);
    } catch (err: any) {
      console.error("Erro ao buscar preços Pyth:", err);
      setError(err.message || "Erro ao carregar dados do oráculo");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPrices();
    
    // Atualizar a cada 30 segundos
    const interval = setInterval(fetchPrices, 30000);
    return () => clearInterval(interval);
  }, []);

  const refresh = () => {
    fetchPrices();
  };

  return { prices, isLoading, error, refresh };
}
