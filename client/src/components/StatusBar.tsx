import React, { useEffect, useState } from 'react';
import { API_BASE, WS_URL } from '../config';
import './StatusBar.css';

interface StatusBarProps {
  wsConnected: boolean;
  apiEndpoint?: string;
  wsEndpoint?: string;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  wsConnected,
  apiEndpoint = `${API_BASE}/api`,
  wsEndpoint = WS_URL,
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [lastSyncTime, setLastSyncTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (wsConnected) {
      setLastSyncTime(new Date());
    }
  }, [wsConnected]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getTimeSince = (date: Date) => {
    const seconds = Math.floor((currentTime.getTime() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  return (
    <div className="status-bar">
      <div className="status-section">
        <div className="status-item">
          <span className="status-label">REST API:</span>
          <code className="status-value endpoint">{apiEndpoint}</code>
          <span className={`status-indicator ${wsConnected ? 'online' : 'offline'}`}>
            {wsConnected ? '● Online' : '● Offline'}
          </span>
        </div>
      </div>

      <div className="status-section">
        <div className="status-item">
          <span className="status-label">WebSocket:</span>
          <code className="status-value endpoint">{wsEndpoint}</code>
          <span className={`status-indicator ${wsConnected ? 'connected' : 'disconnected'}`}>
            {wsConnected ? '⚡ Connected' : '⚡ Disconnected'}
          </span>
        </div>
      </div>

      <div className="status-section">
        <div className="status-item">
          <span className="status-label">Last Sync:</span>
          <span className="status-value">{formatTime(lastSyncTime)}</span>
          <span className="status-time-ago">({getTimeSince(lastSyncTime)})</span>
        </div>
      </div>

      <div className="status-section">
        <div className="status-item">
          <span className="status-label">System Time:</span>
          <span className="status-value">{formatTime(currentTime)}</span>
        </div>
      </div>

      <div className="status-section status-actions">
        <button className="status-action-btn" title="Network Settings">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M7 1v12M1 7h12M11.5 3.5L2.5 10.5M2.5 3.5l9 7"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
        <button className="status-action-btn" title="Refresh Connection">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M12 7A5 5 0 1 1 7 2M7 2V5m0-3l3 3-3-3Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};
