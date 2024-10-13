import React from 'react';
import ProgressBar from 'react-bootstrap/ProgressBar';
import 'bootstrap/dist/css/bootstrap.min.css';

const CustomProgressBar = ({ bars, color, min, max, value, label, labelColor }) => {
  // If `bars` is provided, treat it as a stacked progress bar
  if (bars && bars.length > 0) {
    return (
      <ProgressBar className="bar-input" animated>
        {bars.map((bar, index) => (
          <div
            key={index}
            className="progress-bar"
            style={{
              backgroundColor: bar.color, // Color for each bar
              width: `${(bar.value / bar.max) * 100}%`, // Calculate percentage for each bar
              height: '100%',
              transition: 'width 0.4s ease',
              position: 'relative',
            }}
          >
            {/* Display label if available, with label color */}
            {bar.label && (
              <span
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                  color: bar.labelColor || '#fff', // Default to white if no color is provided
                  fontWeight: 'bold',
                }}
              >
                {bar.label}
              </span>
            )}
          </div>
        ))}
      </ProgressBar>
    );
  }

  // Otherwise, render a single progress bar
  return (
    <ProgressBar className="bar-input" animated>
      <div
        className="progress-bar"
        style={{
          backgroundColor: color, // Color from prop
          width: `${(value / max) * 100}%`, // Calculate percentage based on value
          height: '100%',
          transition: 'width 0.4s ease',
          position: 'relative',
        }}
      >
        {/* Optional Label for the single bar, with customizable label color */}
        {label && (
          <span
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              color: labelColor || '#fff', // Default to white if no color is provided
              fontWeight: 'bold',
            }}
          >
            {label}
          </span>
        )}
      </div>
    </ProgressBar>
  );
};

export default CustomProgressBar;
