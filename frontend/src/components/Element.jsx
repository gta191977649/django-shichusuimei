import React from 'react';

export default function Element(props) {
  // Define a function to map element names to colors
  const getElementColor = (element) => {
    const colorTable = {
      "forestgreen": ["甲", "乙", "寅", "卯"],
      "red": ["丙", "丁", "巳", "午"],
      "saddlebrown": ["戌","戊", "己", "未","丑","辰"],
      "orange": ["庚", "辛", "申", "酉"],
      "royalblue": ["壬", "癸", "亥", "子"],
    };
    // Loop through each color in the table and check if the element belongs to that color
    for (const color in colorTable) {
      if (colorTable[color].includes(element)) {
        return color;  // Return the color if a match is found
      }
    }
    return "black";  // Return a default color if no match is found
  };

  // Use the function to get the color for the current element name
  const color = getElementColor(props.name);

  // Return the JSX with dynamic styling based on the element color
  return (
    <ruby className='text-element'>
      <span style={{ color: color, fontWeight: 700 }}>{props.name}</span><rt className='vt'>{props.tsuhen}</rt>
    </ruby>
  );
}
