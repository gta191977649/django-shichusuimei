import React, { useRef } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

// Register chart components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

// Set default font and color
ChartJS.defaults.font.family = '"Noto Serif JP", serif';
ChartJS.defaults.color = '#000';

/**
 * Props:
 * - response: API response containing trend.daiun and trend.suiun
 * - defaultVisible: Array of element keys to show by default (e.g., ['木', '火'])
 * - chartHeight: Height of the chart container in pixels or CSS value (default: 400)
 * - chartWidth: Width of the chart container in pixels or CSS value (default: '100%')
 */
export default function DaiunTrend({ response, defaultVisible = ['木'], chartHeight = 300, chartWidth = '100%' }) {
  const chartRef = useRef();

  if (!response?.trend?.daiun || !response?.trend?.suiun) return <></>;

  const elements = ['木', '火', '土', '金', '水'];

  const colors = {
    木: { suiun: 'rgb(20,97,20)', daiyun: 'rgb(35,167,35)' },
    火: { suiun: 'rgb(208,0,0)', daiyun: 'rgb(255,59,59)' },
    土: { suiun: 'rgb(149,45,0)', daiyun: 'rgb(79,25,0)' },
    金: { suiun: 'rgb(218,165,32)', daiyun: 'rgb(255,223,63)' },
    水: { suiun: 'rgba(29,77,125,1)', daiyun: 'rgba(30,144,255,1)' }
  };

  const totalPoints = response.trend.suiun['木'].length;
  const birthYear = new Date(response.birth).getFullYear();
  const labels = Array.from({ length: totalPoints }, (_, i) => {
    const year = birthYear + i;
    const age = i + 1;
    return `${year}年 (${age}歳)`;
  });

  const datasets = elements.flatMap(el => {
    const visible = defaultVisible.includes(el);
    const suiunData = response.trend.suiun[el] || [];
    const { daiyun: daiyunRaw = [], ryuren = [] } = response.trend.daiun[el] || {};
    const daiyunData = daiyunRaw.flatMap((val, idx) => Array(ryuren[idx]?.length||0).fill(val));
    return [
      {
        label: `${el}(${response.element_energy.relation[el]}) - 歳運`,
        data: suiunData,
        hidden: !visible,
        borderColor: colors[el].suiun,
        backgroundColor: colors[el].suiun,
        fill: false,
        tension: 0.4,
        stepped: false,
      },
      {
        label: `${el}(${response.element_energy.relation[el]}) - 大運`,
        data: daiyunData,
        hidden: !visible,
        borderColor: colors[el].daiyun,
        backgroundColor: 'transparent',
        stepped: true,
        tension: 0
      }
    ];
  });

  const data = { labels, datasets };
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        // ← 在这里添加标题配置
        title: {
            display: true,
            text: '運勢線',
            color: '#000',
            font: {
            family: '"Noto Serif JP", serif',
            size: 16
            },
        },
        legend: { position: 'bottom', labels: { color: '#000', font: { family: '"Noto Serif JP", serif' } } },
        //tooltip: { titleColor: '#000', bodyColor: '#000' }
    },
    scales: {
      x: {
        title: { display: true, text: '年', color: '#000' },
        ticks: { color: '#000', maxRotation: 90, minRotation: 90 },
        grid: { display: true, color: '#000' }
      },
      y: {
        title: { display: false, text: 'エネルギー', color: '#000' },
        ticks: { color: '#000' },
        grid: { display: true, color: '#000' }
      }
    }
  };

  return (
    <div className='tb-box' style={{ width: chartWidth, height: chartHeight }}>
      <Line ref={chartRef} data={data} options={options} />
    </div>
  );
}