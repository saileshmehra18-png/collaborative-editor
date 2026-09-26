import React from 'react';
import './TabBar.css';

export type TabType = 'dashboard' | 'editor' | 'diagnostics';

interface TabBarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  documentName?: string;
}

export const TabBar: React.FC<TabBarProps> = ({
  activeTab,
  onTabChange,
  documentName = 'Untitled Document',
}) => {
  return (
    <div className="tab-bar">
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => onTabChange('dashboard')}
        >
          <span className="tab-icon">📊</span>
          <span className="tab-label">Dashboard</span>
        </button>

        <button
          className={`tab ${activeTab === 'editor' ? 'active' : ''}`}
          onClick={() => onTabChange('editor')}
        >
          <span className="tab-icon">📝</span>
          <span className="tab-label">Active Editor</span>
          <span className="tab-subtitle">{documentName}</span>
        </button>

        <button
          className={`tab ${activeTab === 'diagnostics' ? 'active' : ''}`}
          onClick={() => onTabChange('diagnostics')}
        >
          <span className="tab-icon">🔍</span>
          <span className="tab-label">Diagnostics</span>
        </button>
      </div>

      <div className="tab-actions">
        <button className="tab-action-btn" title="Split View">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="1" y="2" width="6" height="12" stroke="currentColor" strokeWidth="1.5" />
            <rect x="9" y="2" width="6" height="12" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </button>
        <button className="tab-action-btn" title="More Options">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="3" r="1.5" fill="currentColor" />
            <circle cx="8" cy="8" r="1.5" fill="currentColor" />
            <circle cx="8" cy="13" r="1.5" fill="currentColor" />
          </svg>
        </button>
      </div>
    </div>
  );
};
