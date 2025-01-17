import { useState, useEffect } from 'react';
import { SignalResult } from '@/services/tradingSignals';

interface Props {
  signal?: SignalResult;
}

export default function TradingSignals({ signal }: Props) {
  const getSignalColor = (type: string, strength: string) => {
    if (type === 'ENTRY') {
      return strength === 'strong' ? 'bg-green-100 text-green-800' : 'bg-green-50 text-green-600';
    } else if (type === 'EXIT') {
      return strength === 'strong' ? 'bg-red-100 text-red-800' : 'bg-red-50 text-red-600';
    }
    return 'bg-gray-100 text-gray-600';
  };

  const getSignalIcon = (type: string) => {
    switch (type) {
      case 'ENTRY':
        return '↗️';
      case 'EXIT':
        return '↘️';
      default:
        return '↔️';
    }
  };

  const getSignalText = (type: string) => {
    switch (type) {
      case 'ENTRY':
        return '建議進場';
      case 'EXIT':
        return '建議出場';
      default:
        return '持續觀察';
    }
  };

  if (!signal) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">交易訊號</h3>
        <div className="text-gray-500">載入中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">交易訊號</h3>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getSignalColor(signal.type, signal.strength)}`}>
          {getSignalIcon(signal.type)} {getSignalText(signal.type)}
        </span>
      </div>

      <div className="border rounded-lg p-4">
        <div className="space-y-3">
          <div>
            <h4 className="text-sm font-medium text-gray-600 mb-1">訊號強度</h4>
            <div className="flex items-center space-x-1">
              {['weak', 'moderate', 'strong'].map((level) => (
                <div
                  key={level}
                  className={`h-2 w-8 rounded ${
                    ['weak', 'moderate', 'strong'].indexOf(level) <= ['weak', 'moderate', 'strong'].indexOf(signal.strength)
                      ? signal.type === 'ENTRY'
                        ? 'bg-green-500'
                        : signal.type === 'EXIT'
                        ? 'bg-red-500'
                        : 'bg-gray-500'
                      : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-600 mb-1">訊號原因</h4>
            <p className="text-sm">{signal.reason}</p>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-600 mb-1">更新時間</h4>
            <p className="text-sm text-gray-500">{signal.timestamp}</p>
          </div>
        </div>
      </div>

      <div className="border rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-600 mb-2">注意事項</h4>
        <ul className="text-sm text-gray-500 space-y-1">
          <li>• 此訊號僅供參考，請根據個人風險承受能力做出判斷</li>
          <li>• 建議配合其他技術分析工具使用</li>
          <li>• 請注意設置止損，控制風險</li>
        </ul>
      </div>
    </div>
  );
} 