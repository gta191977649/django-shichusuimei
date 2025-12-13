import React from 'react';
import ReactDOM from 'react-dom';
import LineTo from './LineTo';

const LineOverlay = ({ lines }) => {
  return ReactDOM.createPortal(
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: document.documentElement.scrollWidth,
        height: document.documentElement.scrollHeight,
        pointerEvents: 'none',
        zIndex: 9999,
      }}
    >
      {lines.map((line, idx) => (
        <LineTo key={idx} {...line} />
      ))}
    </div>,
    document.body
  );
};

export default LineOverlay;