import React, { useRef, useEffect, useState } from 'react';

// 紧凑度常量：较小的值会使图表更紧凑，较大的值会使图表更宽松
const COMPACTNESS = 0.8; // 您可以调整这个值来改变紧凑程度

// 上下边距常量：控制图表顶部和底部的空白
const VERTICAL_PADDING = 0; // 您可以调整这个值来改变上下边距

// 垂直文本下移常量：控制垂直堆叠文本的下移程度
const VERTICAL_TEXT_OFFSET = 5; // 您可以调整这个值来改变文本的下移程度

const ShinTypeChart = ({ width,value }) => {
  const [svgWidth, setSvgWidth] = useState(width);
  const containerRef = useRef(null);
  const padding = 20; // 左右边距
  const svgHeight = (110 * COMPACTNESS) - (2 * VERTICAL_PADDING); // 调整高度以考虑新的上下边距

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
    <text x={x} y={((85 * COMPACTNESS) - VERTICAL_PADDING + VERTICAL_TEXT_OFFSET)} textAnchor="middle" fontSize={fontSize} fontWeight="bold">
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
        <line 
          x1={padding} 
          y1={((60 * COMPACTNESS) - VERTICAL_PADDING)} 
          x2={svgWidth - padding} 
          y2={((60 * COMPACTNESS) - VERTICAL_PADDING)} 
          stroke="black" 
          strokeWidth="2" 
        />
        
        {/* Tick marks */}
        {[-3, 0, 3].map(tick => (
          <line 
            key={tick}
            x1={getPosition(tick)} 
            y1={((55 * COMPACTNESS) - VERTICAL_PADDING)} 
            x2={getPosition(tick)} 
            y2={((65 * COMPACTNESS) - VERTICAL_PADDING)} 
            stroke="black" 
            strokeWidth="2" 
          />
        ))}
        
        {/* Labels above the line */}
        {[-6, -3, 0, 3, 6].map(label => (
          <text 
            key={label}
            x={label === -6 ? padding : label === 6 ? svgWidth - padding : getPosition(label)} 
            y={((15 * COMPACTNESS) - VERTICAL_PADDING)} 
            textAnchor="middle" 
            fontSize="13"
          >
            {label}
          </text>
        ))}
        
        {/* Vertically stacked text labels below the line */}
        {[
          { x: padding, text: "極弱" },
          { x: getPosition(-3), text: "身弱" },
          { x: getPosition(0), text: "中和" },
          { x: getPosition(3), text: "身旺" },
          { x: svgWidth - padding, text: "極旺" }
        ].map(({ x, text }) => (
          <VerticalText key={text} x={x} text={text} fontSize="15" />
        ))}
        
        {/* Red triangle indicator */}
        <polygon 
          points={`
            ${getPosition(value)},${((52 * COMPACTNESS) - VERTICAL_PADDING)} 
            ${getPosition(value)-8},${((40 * COMPACTNESS) - VERTICAL_PADDING)} 
            ${getPosition(value)+8},${((40 * COMPACTNESS) - VERTICAL_PADDING)}
          `}
          fill="#E64841"
        />
      </svg>
    </div>
  );
};

export default ShinTypeChart;