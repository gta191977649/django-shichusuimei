import React from 'react';
import ProgressBar from 'react-bootstrap/ProgressBar';
import 'bootstrap/dist/css/bootstrap.min.css';

const CustomProgressBar = ({ color, min, max, value }) => {
  return (
    <ProgressBar
      now={value}
      min={min}
      max={max}
      className='bar-input'
      animated
    >
      <div
        className="progress-bar"
        style={{
          backgroundColor: color, // Color from props
          width: `${(value / max) * 100}%`, // Calculate percentage based on min, max, and value
          height: '100%',
          transition: 'width 0.4s ease',
        }}
      />
    </ProgressBar>
  );
};

export default CustomProgressBar;
