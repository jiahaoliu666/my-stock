import { useEffect, useRef } from 'react';
import { createChart, ColorType, Time, IChartApi, HistogramData, CandlestickData } from 'lightweight-charts';

interface ChartData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface ChartWidgetProps {
  data: ChartData[];
  currentPrice: number;
}

export default function ChartWidget({ data, currentPrice }: ChartWidgetProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // 創建圖表
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: '#ffffff' },
        textColor: '#333',
      },
      grid: {
        vertLines: { color: '#f0f0f0' },
        horzLines: { color: '#f0f0f0' },
      },
      crosshair: {
        mode: 0,
      },
      rightPriceScale: {
        borderColor: '#f0f0f0',
      },
      timeScale: {
        borderColor: '#f0f0f0',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    // 添加K線圖
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#ef4444',
      downColor: '#22c55e',
      borderDownColor: '#22c55e',
      borderUpColor: '#ef4444',
      wickDownColor: '#22c55e',
      wickUpColor: '#ef4444',
    });

    // 添加成交量圖
    const volumeSeries = chart.addHistogramSeries({
      color: '#26a69a',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '',
    });

    // 設置數據
    const formattedCandleData = data.map(item => ({
      time: item.time as Time,
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close,
    }));

    const formattedVolumeData = data.map(item => ({
      time: item.time as Time,
      value: item.volume,
      color: item.close > item.open ? '#ef4444' : '#22c55e',
    }));

    candlestickSeries.setData(formattedCandleData);
    volumeSeries.setData(formattedVolumeData);

    // 添加當前價格線
    const priceLine = candlestickSeries.createPriceLine({
      price: currentPrice,
      color: '#2196F3',
      lineWidth: 2,
      lineStyle: 2,
      axisLabelVisible: true,
      title: '現價',
    });

    // 自適應容器大小
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    chartRef.current = chart;

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [data, currentPrice]);

  return <div ref={chartContainerRef} className="w-full h-full" />;
} 