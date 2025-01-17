import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    TradingView: any;
  }
}

export default function TradingViewWidget() {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const currentContainer = container.current;
    if (!currentContainer) return;

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.onload = () => {
      if (typeof window.TradingView !== 'undefined') {
        new window.TradingView.widget({
          autosize: true,
          symbol: 'TAIFEX:TXF1!',
          interval: 'D',
          timezone: 'Asia/Taipei',
          theme: 'light',
          style: '1',
          locale: 'zh_TW',
          toolbar_bg: '#f1f3f6',
          enable_publishing: false,
          allow_symbol_change: true,
          container_id: currentContainer.id,
        });
      }
    };
    currentContainer.appendChild(script);

    return () => {
      const script = currentContainer.querySelector('script');
      if (script) {
        script.remove();
      }
    };
  }, []);

  return <div id="tradingview_widget" ref={container} className="w-full h-full" />;
} 