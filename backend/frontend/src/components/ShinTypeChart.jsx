import React, { useRef, useEffect, useState } from 'react';

const COMPACTNESS = 0.8;
const VERTICAL_PADDING = 0;
const VERTICAL_TEXT_OFFSET = 5;

const ShinTypeChart = ({ width, sameRatio = 0 }) => {
  const [svgWidth, setSvgWidth] = useState(width);
  const containerRef = useRef(null);
  const padding = 20;
  const svgHeight = (110 * COMPACTNESS) - (2 * VERTICAL_PADDING);

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

  const getPosition = (ratio) => {
    const clampedRatio = Math.max(0, Math.min(1, ratio));
    return padding + clampedRatio * (svgWidth - 2 * padding);
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

  return (
    <div ref={containerRef} className="w-full max-w-md mx-auto">
      <svg width="100%" height={svgHeight} viewBox={`0 0 ${svgWidth} ${svgHeight}`} preserveAspectRatio="xMidYMid meet">
        <line 
          x1={padding} 
          y1={((60 * COMPACTNESS) - VERTICAL_PADDING)} 
          x2={svgWidth - padding} 
          y2={((60 * COMPACTNESS) - VERTICAL_PADDING)} 
          stroke="black" 
          strokeWidth="2" 
        />
        
        {[0, 0.5, 1].map(tick => (
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
        
        {[0, 0.5, 1].map(label => (
          <text 
            key={label}
            x={getPosition(label)} 
            y={((15 * COMPACTNESS) - VERTICAL_PADDING)} 
            textAnchor="middle" 
            fontSize="13"
          >
            {`${Math.round(label * 100)}%`}
          </text>
        ))}
        
        {[
          { x: padding, text: "身弱" },
          { x: getPosition(0.5), text: "中和" },
          { x: svgWidth - padding, text: "身旺" }
        ].map(({ x, text }) => (
          <VerticalText key={text} x={x} text={text} fontSize="15" />
        ))}
        
        <polygon 
          points={`
            ${getPosition(sameRatio)},${((52 * COMPACTNESS) - VERTICAL_PADDING)} 
            ${getPosition(sameRatio)-8},${((40 * COMPACTNESS) - VERTICAL_PADDING)} 
            ${getPosition(sameRatio)+8},${((40 * COMPACTNESS) - VERTICAL_PADDING)}
          `}
          fill="#E64841"
        />
      </svg>
    </div>
  );
};

export default ShinTypeChart;
