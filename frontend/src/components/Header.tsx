import React from 'react';
import '../styles/header.css';

interface HeaderProps {
  onNavigate: (page: 'dashboard' | 'history') => void;
  currentPage: 'dashboard' | 'history';
}

export const Header: React.FC<HeaderProps> = ({ onNavigate, currentPage }) => {
  return (
    <header className="header">
      <div className="header-container">
        <div className="header-left">
          <h1 className="logo">
            <span className="logo-flower">🌸</span> TrackHER
          </h1>
          <p className="tagline">Your Personal Women's Health Companion</p>
        </div>
        
        <nav className="header-nav">
          <button
            className={`nav-link ${currentPage === 'dashboard' ? 'active' : ''}`}
            onClick={() => onNavigate('dashboard')}
          >
            Dashboard
          </button>
          <button
            className={`nav-link ${currentPage === 'history' ? 'active' : ''}`}
            onClick={() => onNavigate('history')}
          >
            History
          </button>
        </nav>
      </div>
    </header>
  );
};

export default Header;