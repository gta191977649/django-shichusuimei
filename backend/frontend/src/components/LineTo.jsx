import React, { useEffect, useState, useRef, useCallback } from 'react';

const LineTo = ({ from, to, color = 'black', thickness = 2, label = '', labelStyle = {}, offset = 0 }) => {
  const [line, setLine] = useState({ x1: 0, y1: 0, x2: 0, y2: 0 });
  const textRef = useRef(null);
  const [textDimensions, setTextDimensions] = useState({ width: 0, height: 0 });

  const updateLine = useCallback(() => {
    const fromElement = document.querySelector(`.${from}`);
    const toElement = document.querySelector(`.${to}`);

    if (fromElement && toElement) {
      const fromRect = fromElement.getBoundingClientRect();
      const toRect = toElement.getBoundingClientRect();

      const scrollX = window.scrollX;
      const scrollY = window.scrollY;

      const x1 = fromRect.left + fromRect.width / 2 + scrollX;
      const y1 = fromRect.top + fromRect.height / 2 + scrollY;
      const x2 = toRect.left + toRect.width / 2 + scrollX;
      const y2 = toRect.top + toRect.height / 2 + scrollY;

      // Calculate the angle and apply offset
      const angle = Math.atan2(y2 - y1, x2 - x1);
      const offsetX = Math.cos(angle) * offset;
      const offsetY = Math.sin(angle) * offset;

      return {
        x1: x1 + offsetX,
        y1: y1 + offsetY,
        x2: x2 - offsetX,
        y2: y2 - offsetY,
      };
    }
    return null;
  }, [from, to, offset]);

  useEffect(() => {
    const handleUpdate = () => {
      const newLine = updateLine();
      if (newLine) {
        setLine(prevLine => {
          if (
            prevLine.x1 !== newLine.x1 ||
            prevLine.y1 !== newLine.y1 ||
            prevLine.x2 !== newLine.x2 ||
            prevLine.y2 !== newLine.y2
          ) {
            return newLine;
          }
          return prevLine;
        });
      }
    };

    handleUpdate();
    window.addEventListener('resize', handleUpdate);
    window.addEventListener('scroll', handleUpdate);

    return () => {
      window.removeEventListener('resize', handleUpdate);
      window.removeEventListener('scroll', handleUpdate);
    };
  }, [updateLine]);

  useEffect(() => {
    if (textRef.current) {
      const bbox = textRef.current.getBBox();
      setTextDimensions(prev => {
        if (prev.width !== bbox.width || prev.height !== bbox.height) {
          return { width: bbox.width, height: bbox.height };
        }
        return prev;
      });
    }
  }, [label, labelStyle]);

  const midX = (line.x1 + line.x2) / 2;
  const midY = (line.y1 + line.y2) / 2;

  const angle = Math.atan2(line.y2 - line.y1, line.x2 - line.x1) * 180 / Math.PI;

  const defaultLabelStyle = {
    fill: color,
    textAnchor: 'middle',
    dominantBaseline: 'central',
    fontSize: '12px',
    fontFamily: 'Arial, sans-serif',
    pointerEvents: 'none',
    userSelect: 'none',
    ...labelStyle
  };

  const padding = 4; // Padding around the text

  return (
    <svg style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      zIndex: 1,
    }}>
      <line
        x1={line.x1}
        y1={line.y1}
        x2={line.x2}
        y2={line.y2}
        style={{
          stroke: color,
          strokeWidth: thickness,
        }}
      />
      {label && (
        <>
          <rect
            x={midX - textDimensions.width / 2 - padding}
            y={midY - textDimensions.height / 2 - padding}
            width={textDimensions.width + padding * 2}
            height={textDimensions.height + padding * 2}
            fill="white"
            transform={`rotate(${angle}, ${midX}, ${midY})`}
          />
          <text
            ref={textRef}
            x={midX}
            y={midY}
            transform={`rotate(${angle}, ${midX}, ${midY})`}
            style={defaultLabelStyle}
          >
            {label}
          </text>
        </>
      )}
    </svg>
  );
};

export default LineTo;
