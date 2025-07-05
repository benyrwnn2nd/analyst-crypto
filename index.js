const axios = require("axios");

const API_KEY = "your-apikey-here";

function sma(data, period) {
  if (data.length < period) return Array(data.length).fill(undefined);
  let result = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) result.push(undefined);
    else result.push(data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period);
  }
  return result;
}

function rsi(data, period = 14) {
  if (data.length <= period) return Array(data.length).fill(undefined);
  let result = [];
  let gain = 0, loss = 0;
  for (let i = 1; i <= period; i++) {
    const d = data[i] - data[i - 1];
    if (d >= 0) gain += d;
    else loss -= d;
  }
  gain /= period;
  loss /= period;
  let rs = gain / (loss || 1e-10);
  for (let i = 0; i < data.length; i++) {
    if (i < period) result.push(undefined);
    else if (i === period) result.push(100 - 100 / (1 + rs));
    else {
      const d = data[i] - data[i - 1];
      gain = (gain * (period - 1) + (d > 0 ? d : 0)) / period;
      loss = (loss * (period - 1) + (d < 0 ? -d : 0)) / period;
      rs = gain / (loss || 1e-10);
      result.push(100 - 100 / (1 + rs));
    }
  }
  return result;
}

function macd(data, fast = 12, slow = 26, signal = 9) {
  function ema(data, period) {
    if (data.length < period) return Array(data.length).fill(undefined);
    let result = [];
    const k = 2 / (period + 1);
    let sum = 0;
    for (let i = 0; i < period; i++) sum += data[i];
    let prevEma = sum / period;
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) result.push(undefined);
      else if (i === period - 1) result.push(prevEma);
      else {
        prevEma = (data[i] - prevEma) * k + prevEma;
        result.push(prevEma);
      }
    }
    return result;
  }
  const emaFast = ema(data, fast);
  const emaSlow = ema(data, slow);
  let macdLine = data.map((_, i) =>
    emaFast[i] !== undefined && emaSlow[i] !== undefined ? emaFast[i] - emaSlow[i] : undefined
  );
  const validMacdValues = macdLine.filter(v => v !== undefined);
  const signalLineCalculation = ema(validMacdValues, signal);
  const padding = Array(macdLine.length - signalLineCalculation.length).fill(undefined);
  let signalLine = [...padding, ...signalLineCalculation];
  return {
    macdLine,
    signalLine,
    histogram: macdLine.map((m, i) =>
      m !== undefined && signalLine[i] !== undefined ? m - signalLine[i] : undefined
    )
  };
}

function bollingerBands(data, period = 20, stdDev = 2) {
  let smaArr = sma(data, period);
  let upper = [], lower = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      upper.push(undefined);
      lower.push(undefined);
    } else {
      const slice = data.slice(i - period + 1, i + 1);
      const mean = smaArr[i];
      const variance = slice.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / period;
      const std = Math.sqrt(variance);
      upper.push(mean + stdDev * std);
      lower.push(mean - stdDev * std);
    }
  }
  return { upper, lower, middle: smaArr };
}

function findSwingHighLow(candles) {
  if (candles.length === 0) return { swingHigh: 0, swingLow: 0 };
  let swingHigh = candles[0].high, swingLow = candles[0].low;
  for (let i = 1; i < candles.length; i++) {
    if (candles[i].high > swingHigh) swingHigh = candles[i].high;
    if (candles[i].low < swingLow) swingLow = candles[i].low;
  }
  return { swingHigh, swingLow };
}

function getDecimalPlaces(num) {
  if (num === 0) return 0;
  const str = num.toString();
  if (str.includes('e-')) {
    return parseInt(str.split('e-')[1], 10) + (str.split('.')[1]?.length || 0);
  }
  const decimalPart = str.split('.')[1];
  return decimalPart ? decimalPart.length : 0;
}

function fibonacciLevels(high, low) {
  const diff = high - low;
  let maxPrecision = Math.max(getDecimalPlaces(high), getDecimalPlaces(low));
  maxPrecision = Math.max(2, maxPrecision);
  return {
    '0%': high.toFixed(maxPrecision),
    '23.6%': (high - diff * 0.236).toFixed(maxPrecision),
    '38.2%': (high - diff * 0.382).toFixed(maxPrecision),
    '50%': (high - diff * 0.5).toFixed(maxPrecision),
    '61.8%': (high - diff * 0.618).toFixed(maxPrecision),
    '100%': low.toFixed(maxPrecision)
  };
}

async function generateChart(symbol = "BTC") {
  const body = {
    theme: "dark",
    interval: "4h",
    symbol: `BINANCE:${symbol.toUpperCase()}USDT`,
    timezone: "Asia/Jakarta",
    width: 800,
    height: 600,
    override: {
      showStudyLastValue: false,
    },
    studies: [{
      name: "Volume",
      forceOverlay: true,
    }, {
      name: "MACD",
      override: {
        "Signal.linewidth": 2,
        "Signal.color": "rgb(255,65,129)",
      },
    }],
  };

  try {
    const response = await axios.post(
      "https://api.chart-img.com/v2/tradingview/advanced-chart",
      body, {
        headers: {
          "x-api-key": API_KEY,
          "content-type": "application/json",
        },
        responseType: "arraybuffer",
      }
    );
    const chartBuffer = Buffer.from(response.data);
    return chartBuffer;
  } catch (err) {
    let msg = err.response?.data;
    try {
      msg = msg.toString();
      msg = JSON.parse(msg);
    } catch (e) {}
    console.error("Gagal ambil chart:", msg || err.message);
  }
}

async function analyst(coinSymbol) {
  try {
    const { data } = await axios.get(
      `https://api.binance.com/api/v3/klines?symbol=${coinSymbol.toUpperCase()}USDT&interval=4h&limit=200`
    );
    const candles = data.map(c => ({
      open: +c[1],
      high: +c[2],
      low: +c[3],
      close: +c[4],
      volume: +c[5]
    }));
    const closes = candles.map(c => c.close);

    let dynamicPricePrecision = 2;
    if (closes.length > 0 && typeof closes[closes.length - 1] === 'number') {
      dynamicPricePrecision = getDecimalPlaces(closes[closes.length - 1]);
      dynamicPricePrecision = Math.max(2, dynamicPricePrecision);
      dynamicPricePrecision = Math.min(dynamicPricePrecision, 12);
    }

    const rsiArr = rsi(closes, 14);
    const latestRsi = rsiArr[rsiArr.length - 1]?.toFixed(2) ?? "-";

    const bb = bollingerBands(closes, 20, 2);
    const bbUpper = bb.upper[bb.upper.length - 1]?.toLocaleString(undefined, { maximumFractionDigits: dynamicPricePrecision }) ?? "-";
    const bbLower = bb.lower[bb.lower.length - 1]?.toLocaleString(undefined, { maximumFractionDigits: dynamicPricePrecision }) ?? "-";
    const bbMid = bb.middle[bb.middle.length - 1]?.toLocaleString(undefined, { maximumFractionDigits: dynamicPricePrecision }) ?? "-";

    const macdObj = macd(closes, 12, 26, 9);
    const macdVal = macdObj.macdLine[macdObj.macdLine.length - 1]?.toLocaleString(undefined, { maximumFractionDigits: dynamicPricePrecision + 2 }) ?? "-";
    const macdSig = macdObj.signalLine[macdObj.signalLine.length - 1]?.toLocaleString(undefined, { maximumFractionDigits: dynamicPricePrecision + 2 }) ?? "-";

    const ma20Arr = sma(closes, 20);
    const ma50Arr = sma(closes, 50);
    const ma100Arr = sma(closes, 100);
    const ma200Arr = sma(closes, 200);
    const ma20 = ma20Arr[closes.length - 1]?.toLocaleString(undefined, { maximumFractionDigits: dynamicPricePrecision }) ?? "-";
    const ma50 = ma50Arr[closes.length - 1]?.toLocaleString(undefined, { maximumFractionDigits: dynamicPricePrecision }) ?? "-";
    const ma100 = ma100Arr[closes.length - 1]?.toLocaleString(undefined, { maximumFractionDigits: dynamicPricePrecision }) ?? "-";
    const ma200 = ma200Arr[closes.length - 1]?.toLocaleString(undefined, { maximumFractionDigits: dynamicPricePrecision }) ?? "-";

    const prevMA20 = ma20Arr[closes.length - 2];
    const prevMA100 = ma100Arr[closes.length - 2];
    const prevMA200 = ma200Arr[closes.length - 2];
    const currMA20 = ma20Arr[closes.length - 1];
    const currMA100 = ma100Arr[closes.length - 1];
    const currMA200 = ma200Arr[closes.length - 1];

    let crossingMsg = "";
    if (
      prevMA20 !== undefined && prevMA100 !== undefined &&
      currMA20 !== undefined && currMA100 !== undefined
    ) {
      if (prevMA20 < prevMA100 && currMA20 > currMA100) {
        crossingMsg += "📈 Golden Cross MA20/MA100 (potensi bullish)\n";
      } else if (prevMA20 > prevMA100 && currMA20 < currMA100) {
        crossingMsg += "📉 Death Cross MA20/MA100 (potensi bearish)\n";
      }
    }
    if (
      prevMA20 !== undefined && prevMA200 !== undefined &&
      currMA20 !== undefined && currMA200 !== undefined
    ) {
      if (prevMA20 < prevMA200 && currMA20 > currMA200) {
        crossingMsg += "📈 Golden Cross MA20/MA200 (potensi bullish)\n";
      } else if (prevMA20 > prevMA200 && currMA20 < currMA200) {
        crossingMsg += "📉 Death Cross MA20/MA200 (potensi bearish)\n";
      }
    }

    const currentPrice = closes[closes.length - 1]?.toLocaleString(undefined, { maximumFractionDigits: dynamicPricePrecision }) ?? "-";
    const currentVolume = candles[candles.length - 1].volume?.toLocaleString(undefined, { maximumFractionDigits: 2 }) ?? "-";
    const avgVolume = (candles.slice(-20).reduce((sum, candle) => sum + candle.volume, 0) / 20)?.toLocaleString(undefined, { maximumFractionDigits: 2 }) ?? "-";

    const { swingHigh, swingLow } = findSwingHighLow(candles);
    const fibLevels = fibonacciLevels(swingHigh, swingLow);

    const supportLevel = parseFloat(fibLevels['100%']).toLocaleString(undefined, { maximumFractionDigits: dynamicPricePrecision });
    const resistanceLevel = parseFloat(fibLevels['0%']).toLocaleString(undefined, { maximumFractionDigits: dynamicPricePrecision });
    const fib618 = parseFloat(fibLevels['61.8%']).toLocaleString(undefined, { maximumFractionDigits: dynamicPricePrecision });

    let outlookMsg = `${coinSymbol.toUpperCase()} Analyst

Price: $${currentPrice}

Potensi Zona Beli (Support Levels):
- Fibonacci 61.8%: $${fib618}
- MA20: $${ma20}
- MA50: $${ma50}
- MA100: $${ma100}
- MA200: $${ma200}
- Swing Low: $${supportLevel}

Resistance Level (Target Jual): $${resistanceLevel}

Indicators:
- RSI(14): ${latestRsi}
- MACD: ${macdVal} (Signal: ${macdSig})
- BB (U/L/Mid): ${bbUpper} / ${bbLower} / ${bbMid}
- Volume (Last): ${currentVolume} (Avg20: ${avgVolume})

${crossingMsg ? crossingMsg.trim() + "\n" : ""}Disclaimer: Cryptocurrency investments are subject to high risk. This analysis is for informational purposes only.
`;

    const chartBuffer = await generateChart(coinSymbol);
    return { text: outlookMsg, chartBuffer, currentPrice };
  } catch (e) {
    console.error(`Gagal mengambil data atau indikator untuk ${coinSymbol}:`, e);
    return { text: `Gagal mengambil data atau indikator untuk ${coinSymbol}: ${e.message}. \n\nKemungkinan penyebab:\n- Simbol koin salah atau tidak tersedia di Binance.\n- Tidak ada data historis yang cukup.\n- Masalah koneksi API.` };
  }
}

module.exports = { analyst, generateChart };
