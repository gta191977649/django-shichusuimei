import React, { useLayoutEffect, useRef, useState } from "react";

export default function BasicMeishikiTest() {
  const wrapperRef = useRef(null);
  const leftRef = useRef(null);   // left anchor element
  const rightRef = useRef(null);  // right anchor element
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [pathD, setPathD] = useState("");

  // get anchor (x,y) within wrapper
  const anchor = (el) => {
    const W = wrapperRef.current.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    return { x: r.left - W.left + r.width / 2, y: r.top - W.top + r.height };
  };

  // Build an arch with "vertical-ish" sides and a flat top
  // dir: 'up' or 'down'
  const buildArch = (a, b, dir = "up") => {
    const arch = 70;                  // arch height
    const peakY = dir === "up" ? Math.min(a.y, b.y) - arch : Math.max(a.y, b.y) + arch;
    const midX = (a.x + b.x) / 2;

    // Two cubic segments. First: a -> peak, Second: peak -> b.
    // Control points keep x near the endpoints so sides feel vertical.
    const c1x = a.x, c1y = dir === "up" ? a.y - arch : a.y + arch;
    const c2x = midX - 25, c2y = peakY;

    const c3x = midX + 25, c3y = peakY;
    const c4x = b.x, c4y = dir === "up" ? b.y - arch : b.y + arch;

    return `M ${a.x},${a.y}
            C ${c1x},${c1y} ${c2x},${c2y} ${midX},${peakY}
            C ${c3x},${c3y} ${c4x},${c4y} ${b.x},${b.y}`;
  };

  const recalc = () => {
    if (!wrapperRef.current || !leftRef.current || !rightRef.current) return;
    const a = anchor(leftRef.current);
    const b = anchor(rightRef.current);
    setBox({
      w: wrapperRef.current.clientWidth,
      h: wrapperRef.current.clientHeight,
    });
    setPathD(buildArch(a, b, "up")); // use "down" for 地支 row
  };

  useLayoutEffect(() => {
    recalc();
    const ro = new ResizeObserver(recalc);
    ro.observe(wrapperRef.current);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={wrapperRef} className="position-relative" style={{ padding: "60px 16px 30px" }}>
      {/* SVG overlay */}
      <svg
        width={box.w}
        height={box.h}
        style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      >
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M0 0 L10 5 L0 10 Z" fill="currentColor" />
          </marker>
        </defs>

        {/* the arch */}
        <path id="arch-tg" d={pathD} stroke="#22c55e" strokeWidth="3" fill="none" markerEnd="url(#arrow)" />

        {/* centered label riding the path */}
        <text fontSize="16" fontWeight="600">
          <textPath href="#arch-tg" startOffset="50%" textAnchor="middle" dominantBaseline="central">
            <tspan fill="#e11d48">丁</tspan>
            <tspan fill="#2563eb">壬</tspan>
            <tspan fill="#6b7280">合</tspan>
            <tspan fill="#16a34a">木</tspan>
          </textPath>
        </text>
      </svg>

      {/* Example anchors: you’d use your “天干” cells here */}
      <div className="d-flex justify-content-between" style={{ maxWidth: 520, margin: "0 auto" }}>
        <span ref={leftRef} style={{ color: "#e11d48", fontSize: 24, fontWeight: 700 }}>丁</span>
        <span ref={rightRef} style={{ color: "#2563eb", fontSize: 24, fontWeight: 700 }}>壬</span>
      </div>
    </div>
  );
}
