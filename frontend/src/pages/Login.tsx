import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/auth_modern.css';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    }
  };


  return (
    <div className="auth-container">
      <div className="auth-wrapper">
        <div className="auth-header">
          <div className="auth-logo">🎀</div>
          <h1>TrackHER</h1>
          <p>Women's Health Companion</p>
        </div>

        <div className="auth-card">
          <h2>Welcome Back</h2>

          {error && <div className="error-message">{error}</div>}

          <form onSubmit={handleSubmit}>
  <div className="form-field">
    <label htmlFor="email">EMAIL</label>
    <input
      id="email"
      type="email"
      placeholder="your@email.com"
      value={email}
      onChange={(e) => setEmail(e.target.value)}
      required
      disabled={loading}
    />
  </div>

  <div className="form-field">
    <label htmlFor="password">PASSWORD</label>
    <input
      id="password"
      type="password"
      placeholder="••••••••"
      value={password}
      onChange={(e) => setPassword(e.target.value)}
      required
      disabled={loading}
    />
  </div>

  <button 
    type="submit" 
    className="btn-primary-auth"
    disabled={loading}
  >
    {loading ? 'SIGNING IN...' : 'SIGN IN'}
  </button>
</form>
<div className="auth-footer">
  <p>
    Don't have an account?{' '}
    <a onClick={() => navigate('/signup')}>
      Create one
    </a>
  </p>
</div>
        </div>
      </div>
    </div>
  );
}