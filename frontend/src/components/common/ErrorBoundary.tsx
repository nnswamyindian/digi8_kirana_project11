import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[Application ErrorBoundary Caught]:', error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '40px 20px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '400px',
          textAlign: 'center',
          background: '#f8fafc',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          margin: '20px'
        }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '14px',
            background: '#fee2e2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px',
            color: '#dc2626'
          }}>
            <AlertTriangle size={30} />
          </div>

          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: '0 0 8px 0' }}>
            {this.props.fallbackTitle || 'Dashboard View Encountered a Display Issue'}
          </h3>

          <p style={{ fontSize: '0.875rem', color: '#64748b', maxWidth: '480px', lineHeight: 1.5, margin: '0 0 20px 0' }}>
            A temporary component rendering error was captured. You can refresh this view or navigate back to the main portal.
          </p>

          {this.state.error && (
            <div style={{
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '10px 14px',
              fontSize: '0.78rem',
              color: '#991b1b',
              fontFamily: 'monospace',
              maxWidth: '560px',
              wordBreak: 'break-word',
              marginBottom: '20px'
            }}>
              {this.state.error.message}
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              onClick={this.handleReset}
              className="btn btn-primary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 18px' }}
            >
              <RefreshCw size={15} />
              <span>Retry / Reload View</span>
            </button>
            <button
              onClick={() => {
                window.location.href = '/';
              }}
              className="btn btn-secondary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 18px' }}
            >
              <Home size={15} />
              <span>Return to Platform Home</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
