export type MarketPrice = {
  symbol: string;
  price: number;
  relativeUncertainty: number;
};

const PYTH_ENDPOINT =
  "https://hermes.pyth.network/v2/updates/price/latest?ids[]=";

// price feed IDs oficiais da Pyth (mainnet)
const FEEDS: Record<string, string> = {
  BTC: "0xe62df6c8b4a85fe1b2a48d0a90b6b0b8d9f1a9c0f9f9fdd2bb2b4d9e898f4d41",
  ETH: "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
  SOL: "0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0a6c0bda3e7b6d4a2b5c6d3",
};

export function useMarketData() {
  const [prices, setPrices] = useState<MarketPrice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPrices() {
      try {
        const symbols = Object.keys(FEEDS);

        const responses = await Promise.all(
          symbols.map(async (symbol) => {
            const id = FEEDS[symbol];
            const res = await fetch(PYTH_ENDPOINT + id);
            const json = await res.json();

            const data = json.parsed[0].price;
            const price = Number(data.price);
            const conf = Number(data.conf);
            const uncertainty = conf / price;

            return {
              symbol,
              price,
              relativeUncertainty: uncertainty,
            };
          })
        );

        setPrices(responses);
      } catch (err) {
        console.error("Pyth fetch error:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchPrices();
  }, []);

  return {
    prices,
    loading,
  };
}
