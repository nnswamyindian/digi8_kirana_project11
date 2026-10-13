import React, { useEffect, useRef } from 'react';
import { Delete, Check, X } from 'lucide-react';

export interface NumericKeypadProps {
  isOpen: boolean;
  value: string;
  onChange: (newValue: string) => void;
  onClose: () => void;
  title?: string;
  allowDecimal?: boolean;
  presets?: Array<{ label: string; value: string | number }>;
  anchorRef?: React.RefObject<HTMLElement | null>;
  className?: string;
}

export const NumericKeypad: React.FC<NumericKeypadProps> = ({
  isOpen,
  value,
  onChange,
  onClose,
  title,
  allowDecimal = true,
  presets = [],
  anchorRef,
  className = ''
}) => {
  const keypadRef = useRef<HTMLDivElement>(null);

  // 1. Automatically dismiss when tapping/clicking outside input or keypad
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node | null;
      if (!target) return;

      const clickedKeypad = keypadRef.current && keypadRef.current.contains(target);
      const clickedAnchor = anchorRef?.current && anchorRef.current.contains(target);

      if (!clickedKeypad && !clickedAnchor) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handlePointerDown, true);
    document.addEventListener('touchstart', handlePointerDown, { passive: true, capture: true });

    return () => {
      document.removeEventListener('mousedown', handlePointerDown, true);
      document.removeEventListener('touchstart', handlePointerDown, true);
    };
  }, [isOpen, onClose, anchorRef]);

  // 2. Automatically dismiss when scrolling the screen away from the input
  useEffect(() => {
    if (!isOpen) return;

    let initialScrollY = window.scrollY;
    let initialScrollX = window.scrollX;

    const handleScroll = (e: Event) => {
      // If the scroll target is inside the keypad itself, allow keypad scrolling
      if (keypadRef.current && keypadRef.current.contains(e.target as Node)) {
        return;
      }

      // Check if window or parent scrolled significantly (> 25px)
      const diffY = Math.abs(window.scrollY - initialScrollY);
      const diffX = Math.abs(window.scrollX - initialScrollX);

      if (diffY > 25 || diffX > 25) {
        onClose();
        return;
      }

      // If a scroll container outside the keypad scrolled, dismiss
      if (e.target !== keypadRef.current) {
        onClose();
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true, capture: true });
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen, onClose]);

  // 3. Dismiss on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleDigit = (digit: string) => {
    if (digit === '.') {
      if (!allowDecimal) return;
      if (value.includes('.')) return;
      onChange(value ? `${value}.` : '0.');
      return;
    }

    if (value === '0') {
      onChange(digit);
    } else {
      onChange(`${value}${digit}`);
    }
  };

  const handleBackspace = () => {
    if (value.length <= 1) {
      onChange('');
    } else {
      onChange(value.slice(0, -1));
    }
  };

  const handleClear = () => {
    onChange('');
  };

  const handlePreset = (val: string | number) => {
    onChange(String(val));
  };

  return (
    <div
      ref={keypadRef}
      className={`pos-onscreen-keypad ${className}`}
      style={{
        background: '#ffffff',
        border: '1.5px solid #cbd5e1',
        borderRadius: '14px',
        boxShadow: '0 12px 36px -4px rgba(15, 23, 42, 0.22), 0 4px 12px -2px rgba(15, 23, 42, 0.1)',
        padding: '10px',
        width: '260px',
        maxWidth: 'calc(100vw - 20px)',
        zIndex: 9999,
        userSelect: 'none',
        touchAction: 'manipulation'
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header with Title and Close Action */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '8px',
        borderBottom: '1px solid #f1f5f9',
        paddingBottom: '6px'
      }}>
        <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#334155', letterSpacing: '0.02em' }}>
          {title || '⌨️ Number Pad'}
        </span>
        <button
          type="button"
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: '#64748b',
            cursor: 'pointer',
            padding: '2px 4px',
            display: 'flex',
            alignItems: 'center'
          }}
          title="Dismiss Keypad"
        >
          <X size={15} />
        </button>
      </div>

      {/* Optional Presets Row */}
      {presets.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${presets.length}, 1fr)`,
          gap: '4px',
          marginBottom: '8px'
        }}>
          {presets.map((p, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handlePreset(p.value)}
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                padding: '5px 2px',
                fontSize: '0.72rem',
                fontWeight: 700,
                color: '#0f172a',
                cursor: 'pointer'
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      {/* Main 4x3 Numeric Key Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '6px',
        marginBottom: '8px'
      }}>
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(d => (
          <button
            key={d}
            type="button"
            onClick={() => handleDigit(d)}
            style={{
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              height: '42px',
              fontSize: '1.2rem',
              fontWeight: 800,
              color: '#0f172a',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.1s ease',
              touchAction: 'manipulation'
            }}
            onMouseDown={(e) => { e.currentTarget.style.background = '#e2e8f0'; }}
            onMouseUp={(e) => { e.currentTarget.style.background = '#f8fafc'; }}
          >
            {d}
          </button>
        ))}

        {/* Bottom row: Decimal or Clear, 0, Backspace */}
        <button
          type="button"
          onClick={() => (allowDecimal ? handleDigit('.') : handleClear())}
          style={{
            background: '#f1f5f9',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            height: '42px',
            fontSize: allowDecimal ? '1.4rem' : '0.85rem',
            fontWeight: 800,
            color: '#334155',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            touchAction: 'manipulation'
          }}
        >
          {allowDecimal ? '.' : 'C'}
        </button>

        <button
          type="button"
          onClick={() => handleDigit('0')}
          style={{
            background: '#f8fafc',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            height: '42px',
            fontSize: '1.2rem',
            fontWeight: 800,
            color: '#0f172a',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            touchAction: 'manipulation'
          }}
          onMouseDown={(e) => { e.currentTarget.style.background = '#e2e8f0'; }}
          onMouseUp={(e) => { e.currentTarget.style.background = '#f8fafc'; }}
        >
          0
        </button>

        <button
          type="button"
          onClick={handleBackspace}
          style={{
            background: '#fee2e2',
            border: '1px solid #fca5a5',
            borderRadius: '8px',
            height: '42px',
            color: '#dc2626',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            touchAction: 'manipulation'
          }}
          title="Backspace"
        >
          <Delete size={18} />
        </button>
      </div>

      {/* Action Row: Clear & Done */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '6px' }}>
        <button
          type="button"
          onClick={handleClear}
          style={{
            background: '#f1f5f9',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            height: '36px',
            fontSize: '0.78rem',
            fontWeight: 700,
            color: '#475569',
            cursor: 'pointer'
          }}
        >
          Clear
        </button>
        <button
          type="button"
          onClick={onClose}
          style={{
            background: '#059669',
            border: 'none',
            borderRadius: '8px',
            height: '36px',
            fontSize: '0.85rem',
            fontWeight: 800,
            color: 'white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            boxShadow: '0 2px 6px rgba(5, 150, 105, 0.3)'
          }}
        >
          <Check size={16} /> Done
        </button>
      </div>
    </div>
  );
};
