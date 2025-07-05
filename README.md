# Cryptocurrency Technical Analysis

This Node.js script analyzes cryptocurrency price data using the Binance API and generates a technical analysis report. It fetches 4-hour candlestick data for a specified cryptocurrency (e.g., BTC) and calculates key technical indicators, including Simple Moving Average (SMA), Relative Strength Index (RSI), Moving Average Convergence Divergence (MACD), Bollinger Bands, Fibonacci Retracement Levels, and Swing Highs/Lows. It also detects Golden Cross and Death Cross signals for potential bullish or bearish trends. Additionally, it retrieves a chart image with volume and MACD studies from a TradingView API (`api.chart-img.com`).

## Features

- Fetches 4-hour candlestick data from the Binance API for a specified cryptocurrency.
- Calculates technical indicators:
  - **SMA**: 20, 50, 100, and 200 periods.
  - **RSI**: 14-period momentum indicator.
  - **MACD**: 12, 26, and 9 periods.
  - **Bollinger Bands**: 20-period with 2 standard deviations.
  - **Fibonacci Retracement Levels**: Based on swing highs and lows.
  - **Swing Highs/Lows**: Identifies key price levels.
- Detects Golden Cross (MA20/MA100, MA20/MA200) and Death Cross signals.
- Generates a formatted text report with price, support/resistance levels, indicators, and volume data.
- Retrieves a chart image (as a Buffer) for visualization, which can be saved as a PNG file.
- Handles errors for invalid symbols, insufficient data, or API issues.

## Prerequisites

- **Node.js**: Version 14 or higher.
- **npm**: For installing dependencies.
- A valid API key for the TradingView chart API (`api.chart-img.com`).

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/benyrwnn2nd/analyst-crypto
   cd analyst-crypto

## Example Usage with Chart (Repeated for Clarity)

As requested, here’s the example usage with chart saving, which is also included in the `README.md`:

```javascript
const { analyst } = require('./index');
const fs = require('fs');

analyst('BTC').then(result => {
  console.log(result.text);
  if (result.chartBuffer) {
    fs.writeFileSync('btc_chart.png', result.chartBuffer);
    console.log('Chart saved as btc_chart.png');
  }
}).catch(err => {
  console.error('Error:', err);
});
```

## Sample Output 

BTC Analyst

Price: $58,123.45

Potensi Zona Beli (Support Levels):
- Fibonacci 61.8%: $56,789.12
- MA20: $57,234.56
- MA50: $56,890.78
- MA100: $55,678.90
- MA200: $54,123.45
- Swing Low: $53,456.78

Resistance Level (Target Jual): $59,876.23

Indicators:
- RSI(14): 65.43
- MACD: 123.45 (Signal: 98.76)
- BB (U/L/Mid): $58,789.12 / $56,123.45 / $57,456.78
- Volume (Last): 1,234.56 (Avg20: 1,100.23)

📈 Golden Cross MA20/MA100 (potensi bullish)

Disclaimer: Cryptocurrency investments are subject to high risk. This analysis is for informational purposes only.

Chart saved as btc_chart.png
