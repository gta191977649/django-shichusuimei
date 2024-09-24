import React, { useRef, useEffect, useState } from 'react';

// 紧凑度常量：较小的值会使图表更紧凑，较大的值会使图表更宽松
const COMPACTNESS = 0.7; // 您可以调整这个值来改变紧凑程度

const ShinTypeChart = ({ value }) => {
  const [svgWidth, setSvgWidth] = useState(300);
  const containerRef = useRef(null);
  const padding = 20; // Padding on each side
  const svgHeight = 150 * COMPACTNESS; // 基础高度乘以紧凑度

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setSvgWidth(containerRef.current.offsetWidth);
      }
    };

    window.addEventListener('resize', updateWidth);
    updateWidth();

    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const getPosition = (val) => {
    const clampedVal = Math.max(-6, Math.min(6, val));
    return padding + (clampedVal + 6) * ((svgWidth - 2 * padding) / 12);
  };

  const VerticalText = ({ x, text, fontSize = "16" }) => (
    <text x={x} y={85 * COMPACTNESS} textAnchor="middle" fontSize={fontSize} fontWeight="bold">
      {text.split('').map((char, i) => (
        <tspan x={x} dy={i === 0 ? 0 : `${1.1 * COMPACTNESS}em`} key={i}>
          {char}
        </tspan>
      ))}
    </text>
  );

  const displayValue = Math.max(-6, Math.min(6, value));

  return (
    <div ref={containerRef} className="w-full max-w-md mx-auto">
      <svg width="100%" height={svgHeight} viewBox={`0 0 ${svgWidth} ${svgHeight}`} preserveAspectRatio="xMidYMid meet">
        {/* Horizontal line (axis) */}
        <line x1={padding} y1={60 * COMPACTNESS} x2={svgWidth - padding} y2={60 * COMPACTNESS} stroke="black" strokeWidth="2" />
        
        {/* Tick marks */}
        <line x1={getPosition(-3)} y1={55 * COMPACTNESS} x2={getPosition(-3)} y2={65 * COMPACTNESS} stroke="black" strokeWidth="2" />
        <line x1={getPosition(0)} y1={55 * COMPACTNESS} x2={getPosition(0)} y2={65 * COMPACTNESS} stroke="black" strokeWidth="2" />
        <line x1={getPosition(3)} y1={55 * COMPACTNESS} x2={getPosition(3)} y2={65 * COMPACTNESS} stroke="black" strokeWidth="2" />
        
        {/* Labels above the line */}
        <text x={padding} y={15 * COMPACTNESS} textAnchor="middle" fontSize="12">-6</text>
        <text x={getPosition(-3)} y={15 * COMPACTNESS} textAnchor="middle" fontSize="12">-3</text>
        <text x={getPosition(0)} y={15 * COMPACTNESS} textAnchor="middle" fontSize="12">0</text>
        <text x={getPosition(3)} y={15 * COMPACTNESS} textAnchor="middle" fontSize="12">3</text>
        <text x={svgWidth - padding} y={15 * COMPACTNESS} textAnchor="middle" fontSize="12">6</text>
        
        {/* Vertically stacked text labels below the line */}
        <VerticalText x={padding} text="極弱" fontSize="16" />
        <VerticalText x={getPosition(-3)} text="身弱" fontSize="16"/>
        <VerticalText x={getPosition(0)} text="中和" fontSize="16"/>
        <VerticalText x={getPosition(3)} text="身旺" fontSize="16"/>
        <VerticalText x={svgWidth - padding} text="極旺" fontSize="16"/>
        
        {/* Red triangle indicator */}
        <polygon 
          points={`${getPosition(value)},${55 * COMPACTNESS} ${getPosition(value)-8},${42 * COMPACTNESS} ${getPosition(value)+8},${42 * COMPACTNESS}`}
          fill="red"
        />
      </svg>
    </div>
  );
};

export default ShinTypeChart;