import React, { useEffect, useState, useRef } from 'react';
import Element from './Element';

export default function GoukaAnlysis({ tableWidth, response }) {
  const containerRef = useRef(null);
  const [svgSize, setSvgSize] = useState({ width: 0, height: 0 });
  const [lines, setLines] = useState([]);

  // Update container size
  useEffect(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setSvgSize({ width: rect.width, height: rect.height });
    }
  }, [response]);

  // Compute line positions relative to the container
  useEffect(() => {
    if (response && containerRef.current) {
      const newLines = [];
      const containerRect = containerRef.current.getBoundingClientRect();

      const processData = (data, prefix) => {
        data.forEach((item, rowIdx) => {
          const lineId = `gouka-${prefix}-${rowIdx}`;
          const startEl = containerRef.current.querySelector(`.${lineId}-start`);
          const endEl = containerRef.current.querySelector(`.${lineId}-end`);
          if (startEl && endEl) {
            const startRect = startEl.getBoundingClientRect();
            const endRect = endEl.getBoundingClientRect();
            // Get positions relative to container.
            const x1 = startRect.left + startRect.width / 2 - containerRect.left;
            const y1 = startRect.top + startRect.height / 2 - containerRect.top;
            const x2 = endRect.left + endRect.width / 2 - containerRect.left;
            const y2 = endRect.top + endRect.height / 2 - containerRect.top;
            newLines.push({
              x1,
              y1,
              x2,
              y2,
              color: 'black',
              thickness: 1.2,
              label: `${item.type}${item.to ? item.to : ''}`,
              offset: 10,
            });
          }
        });
      };

      if (response.gouka && response.gouka.kan) {
        processData(response.gouka.kan, 'kan');
      }
      if (response.gouka && response.gouka.shi) {
        processData(response.gouka.shi, 'shi');
      }
      setLines(newLines);
    }
  }, [response]);

  // Render table rows for gouka
  const renderGouka = (data, prefix) => {
    if (data) {
      return data.map((item, rowIdx) => {
        const [startIndex, endIndex] = item.index;
        const lineId = `gouka-${prefix}-${rowIdx}`;
        return (
          <tr key={`${lineId}-row`}>
            {[0, 1, 2, 3].map((colIdx) => (
              <td key={`${lineId}-col-${colIdx}`}>
                {colIdx === startIndex && (
                  <div className={`gouka-element ${lineId}-start`}>
                    {item.element[0]}
                  </div>
                )}
                {colIdx === endIndex && (
                  <div className={`gouka-element ${lineId}-end`}>
                    {item.element[1]}
                  </div>
                )}
              </td>
            ))}
          </tr>
        );
      });
    }
    return null;
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: tableWidth }}>
      <table className="table-gouka" style={{ width: '100%' }}>
        {response && response.gouka && response.gouka.kan && renderGouka(response.gouka.kan, 'kan')}
        <tr>
          <td>年柱</td>
          <td>月柱</td>
          <td>日柱</td>
          <td>時柱</td>
        </tr>
        <tr>
          <td>
            <Element name={response ? response.tenkan[0] : '･'} tsuhen={response ? response.junshi.tenkan[0] : ''} />
          </td>
          <td>
            <Element name={response ? response.tenkan[1] : '･'} tsuhen={response ? response.junshi.tenkan[1] : ''} />
          </td>
          <td>
            <Element name={response ? response.tenkan[2] : '･'} tsuhen={response ? response.junshi.tenkan[2] : ''} />
          </td>
          <td>
            <Element name={response ? response.tenkan[3] : '･'} tsuhen={response ? response.junshi.tenkan[3] : ''} />
          </td>
        </tr>
        <tr>
          <td>
            <Element name={response ? response.chishi[0] : '･'} tsuhen={response ? response.junshi.zoukan_honki[0] : ''} />
          </td>
          <td>
            <Element name={response ? response.chishi[1] : '･'} tsuhen={response ? response.junshi.zoukan_honki[1] : ''} />
          </td>
          <td>
            <Element name={response ? response.chishi[2] : '･'} tsuhen={response ? response.junshi.zoukan_honki[2] : ''} />
          </td>
          <td>
            <Element name={response ? response.chishi[3] : '･'} tsuhen={response ? response.junshi.zoukan_honki[3] : ''} />
          </td>
        </tr>
        {response && response.gouka && response.gouka.shi && renderGouka(response.gouka.shi, 'shi')}
      </table>
      {/* Single SVG overlay covering the container */}
      <svg
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          pointerEvents: 'none',
        }}
        width={svgSize.width}
        height={svgSize.height}
      >
        {lines.map((line, index) => {
          const { x1, y1, x2, y2, color, thickness, label, offset } = line;
          // Apply offset to the line endpoints
          const angle = Math.atan2(y2 - y1, x2 - x1);
          const offsetX = Math.cos(angle) * offset;
          const offsetY = Math.sin(angle) * offset;
          const newX1 = x1 + offsetX;
          const newY1 = y1 + offsetY;
          const newX2 = x2 - offsetX;
          const newY2 = y2 - offsetY;
          const midX = (newX1 + newX2) / 2;
          const midY = (newY1 + newY2) / 2;
          const computedAngle = (angle * 180) / Math.PI;
          return (
            <g key={index}>
              <line
                x1={newX1}
                y1={newY1}
                x2={newX2}
                y2={newY2}
                stroke={color}
                strokeWidth={thickness}
              />
              {label && (
                <>
                  <rect
                    x={midX - 20}
                    y={midY - 10}
                    width={40}
                    height={20}
                    fill="white"
                    transform={`rotate(${computedAngle}, ${midX}, ${midY})`}
                  />
                  <text
                    x={midX}
                    y={midY}
                    textAnchor="middle"
                    alignmentBaseline="middle"
                    fill={color}
                    fontSize="12"
                    transform={`rotate(${computedAngle}, ${midX}, ${midY})`}
                  >
                    {label}
                  </text>
                </>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}