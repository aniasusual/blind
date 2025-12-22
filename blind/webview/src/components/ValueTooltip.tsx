import { useState, useRef } from 'react';
import './ValueTooltip.css';

interface ValueTooltipProps {
  name: string;
  value: any;
  displayValue: string;
  children: React.ReactNode;
}

export const ValueTooltip = ({ name, value, displayValue, children }: ValueTooltipProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    setIsVisible(true);
  };

  const handleMouseLeave = () => {
    setIsVisible(false);
    setCopySuccess(false);
  };

  const handleCopy = () => {
    const textToCopy = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
    navigator.clipboard.writeText(textToCopy);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const getValueType = (): string => {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'string') {
      if (value.startsWith('<function ')) return 'function';
      if (value.startsWith('<method ')) return 'method';
      if (value.startsWith('<class ')) return 'class';
      return 'string';
    }
    if (Array.isArray(value)) return 'list';
    if (typeof value === 'object') return 'object';
    return typeof value;
  };

  const getFormattedValue = (): string => {
    if (typeof value === 'string') {
      // Already a string, return as-is
      return value;
    }
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value, null, 2);
      } catch {
        return String(value);
      }
    }
    return String(value);
  };

  return (
    <div
      ref={wrapperRef}
      className="value-tooltip-wrapper"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}

      {isVisible && (
        <div className="value-tooltip">
          <div className="tooltip-header">
            <span className="tooltip-name">{name}</span>
            <span className="tooltip-type">{getValueType()}</span>
          </div>

          <div className="tooltip-value">
            <pre>{getFormattedValue()}</pre>
          </div>

          <div className="tooltip-actions">
            <button
              className="tooltip-button"
              onClick={handleCopy}
            >
              {copySuccess ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
