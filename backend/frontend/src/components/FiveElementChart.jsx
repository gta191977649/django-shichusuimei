import React from 'react';
import { Radar } from 'react-chartjs-2';
import { Chart as ChartJS, RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend } from 'chart.js';
import { getFiveElementEnergy } from '../common';

// Registering Radar chart components with Chart.js
ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

const FiveElementChart = ({ response, elementEnergy = null, label = '五行エネルギー' }) => {
  const energyPayload = elementEnergy || response.element_energy;
  const radarData = {
    labels: [`木:${energyPayload.relation["木"]}`, `火:${energyPayload.relation["火"]}`, `土:${energyPayload.relation["土"]}`, `金:${energyPayload.relation["金"]}`, `水:${energyPayload.relation["水"]}`], 
      datasets: [
        {
          label, // [ Element Names ]
          data: [
            getFiveElementEnergy(response, '木', energyPayload),
            getFiveElementEnergy(response, '火', energyPayload),
            getFiveElementEnergy(response, '土', energyPayload),
            getFiveElementEnergy(response, '金', energyPayload),
            getFiveElementEnergy(response, '水', energyPayload),
          ],
          backgroundColor: 'rgba(204, 255, 204,0.5)',
          borderColor: 'black',
          borderWidth: 1,
          pointBackgroundColor: 'black', 
        },
      ],
    };

    const radarOptions = {
      scales: {
        r: {
          angleLines: {
            color: 'black', // Black lines for radial axes
          },
          grid: {
            color: 'black', // Black grid lines for the circular grid
          },
          pointLabels: {
            font: {
              family: 'Noto Serif JP', // Custom font for the labels
              size: 20,
              weight: 'bold',
            },
            color: 'black', // Black color for the axis labels
          },
          ticks: {
            display: true,
            font: {
              family: 'Noto Serif JP', // Custom font for ticks
            },
            color: 'black', // Black color for the ticks
          },
        },
      },
      plugins: {
        legend: {
          labels: {
            font: {
              family: 'Noto Serif JP', // Custom font for the legend
              size: 18,
              weight: 'bold',
            },
          },
        },
      },
      layout: {
        padding: {
          top: 10,
          right: 10,
          bottom: 10,
          left: 10
        }
      }
  };
  
    

  return (
    <div style={{ width: '100%', height: 'auto' }}>
      <Radar data={radarData} options={radarOptions} />
    </div>
  );
};

export default FiveElementChart;
