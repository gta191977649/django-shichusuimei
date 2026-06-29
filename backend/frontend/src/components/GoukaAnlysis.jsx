import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Element from './Element';

const PILLAR_NAMES = ['年柱', '月柱', '日柱', '時柱'];
const UNKNOWN_PILLAR_TEXT = '不明';
const PLACEHOLDER_VALUES = new Set(['', null, undefined, false, '・', '･', UNKNOWN_PILLAR_TEXT]);
const VALID_STEMS = new Set(['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']);
const VALID_BRANCHES = new Set(['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']);
const STATE_LABELS = {
  成立: '成立',
  減力: '減力',
  失效: '失效',
  化成: '化成',
  有化意: '有化意',
  不化: '不化',
  不适用: '不適用',
};

const TEXT_REPLACEMENTS = [
  ['Chart-level裁决', '全盤裁決'],
  ['Chart-level裁決', '全盤裁決'],
  ['原始检出', '原始檢出'],
  ['裁决', '裁決'],
  ['减力', '減力'],
  ['失效', '失效'],
  ['有化意', '有化意'],
  ['不适用', '不適用'],
  ['牵制', '牽制'],
  ['本盘未见达到成化阈值的关系，合与化已分离判读。', '本盤未見達到成化閾值的關係，合與化已分離判讀。'],
  ['本盘', '本盤'],
  ['命局内未见同成员的强阻断关系', '命局內未見同一成員的強阻斷關係'],
  ['相邻柱互动，作用力加重', '相鄰柱互動，作用力加重'],
  ['涉及月柱，月令引动加分', '涉及月柱，月令引動加分'],
  ['涉及日支，宫位体感更直接', '涉及日支，宮位體感更直接'],
  ['出现争合/妒合，关系不纯', '出現爭合／妒合，關係不純'],
  ['出现争合，化神不纯', '出現爭合，化神不純'],
  ['目标不专一，先只判合不判化', '目標不專一，先只判合，不判化'],
  ['本身已失效，不能再判成化', '本身已失效，不能再判成化'],
  ['冲开', '沖開'],
  ['扰动', '擾動'],
  ['明显下降', '明顯下降'],
  ['减弱', '減弱'],
  ['参与', '參與'],
  ['权重', '權重'],
  ['关系', '關係'],
  ['达到', '達到'],
  ['阈值', '閾值'],
  ['判读', '判讀'],
  ['支持度', '支持度'],
  ['透出数', '透出數'],
  ['强阻断', '強阻斷'],
  ['成员', '成員'],
  ['加分', '加分'],
];

function toTraditionalDisplay(text) {
  if (!text) return '';

  let next = text;
  TEXT_REPLACEMENTS.forEach(([source, target]) => {
    next = next.split(source).join(target);
  });
  Object.entries(STATE_LABELS).forEach(([source, target]) => {
    next = next.split(source).join(target);
  });
  return next;
}

function stateLabel(state) {
  return STATE_LABELS[state] || state;
}

function relationKey(item) {
  const realm = item?.realm || '';
  const type = item?.type || '';
  const indexes = Array.isArray(item?.index) ? item.index.join('-') : '';
  const elements = Array.isArray(item?.element) ? item.element.join('') : '';
  const target = item?.to || '';
  return `${realm}:${type}:${indexes}:${elements}:${target}`;
}

function formatPillarPair(indexes = []) {
  return indexes.map((index) => PILLAR_NAMES[index] || `柱${index}`).join(' / ');
}

function formatRelation(item) {
  const left = item?.element?.[0] || '';
  const right = item?.element?.[1] || '';
  const type = item?.type || '';
  const target = item?.to ? `→${item.to}` : '';
  return `${left}${right} ${type}${target}`.trim();
}

function isKnownElement(value, realm) {
  if (PLACEHOLDER_VALUES.has(value)) return false;
  return realm === 'kan' ? VALID_STEMS.has(value) : VALID_BRANCHES.has(value);
}

function isRenderableRelation(item, realm, birthTimeUnknown) {
  const indexes = Array.isArray(item?.index) ? item.index : [];
  const elements = Array.isArray(item?.element) ? item.element : [];
  if (indexes.length < 2 || elements.length < 2) return false;
  if (birthTimeUnknown && indexes.includes(3)) return false;
  return elements.every((element) => isKnownElement(element, realm));
}

function filterRelations(items, realm, birthTimeUnknown) {
  if (!Array.isArray(items)) return [];
  return items.filter((item) => isRenderableRelation(item, realm, birthTimeUnknown));
}

function filterSummary(items, birthTimeUnknown) {
  if (!Array.isArray(items)) return [];
  if (!birthTimeUnknown) return items;
  return items.filter((item) => !String(item).includes('時柱') && !String(item).includes('时柱'));
}

function SimpleList({ items, emptyText }) {
  if (!Array.isArray(items) || items.length === 0) {
    return <div className="gouka-empty">{emptyText}</div>;
  }

  return (
    <div className="gouka-chip-list">
      {items.map((item, index) => (
        <div key={`${item.type}-${item.element?.join('')}-${index}`} className="gouka-chip-card">
          <div className="gouka-chip-title">{formatRelation(item)}</div>
          <div className="gouka-chip-meta">{formatPillarPair(item.index)}</div>
          {item.state ? <div className="gouka-chip-meta">狀態：{stateLabel(item.state)}</div> : null}
          {item.transform_state ? <div className="gouka-chip-meta">化判定：{stateLabel(item.transform_state)}</div> : null}
        </div>
      ))}
    </div>
  );
}

function ResolvedList({ items, emptyText, activeKey, onSelect }) {
  if (!Array.isArray(items) || items.length === 0) {
    return <div className="gouka-empty">{emptyText}</div>;
  }

  return (
    <div className="gouka-judge-list">
      {items.map((item, index) => {
        const cardKey = relationKey(item);
        const isActive = activeKey === cardKey;

        return (
          <div
            key={`${item.type}-${item.element?.join('')}-${index}`}
            className={`gouka-judge-card${isActive ? ' gouka-judge-card-active' : ''}`}
            onClick={() => onSelect(cardKey)}
          >
            <div className="gouka-judge-head">
              <div>
                <div className="gouka-judge-title">{formatRelation(item)}</div>
                <div className="gouka-judge-meta">{formatPillarPair(item.index)}</div>
              </div>
              <div className="gouka-judge-badges">
                <span className={`gouka-badge gouka-badge-${item.state}`}>{stateLabel(item.state)}</span>
                {typeof item.score === 'number' ? <span className="gouka-badge">{item.score}</span> : null}
              </div>
            </div>

            {Array.isArray(item.blocked_by) && item.blocked_by.length > 0 ? (
              <div className="gouka-judge-line">牽制：{item.blocked_by.join(' / ')}</div>
            ) : null}

            {item.transform?.eligible ? (
              <div className="gouka-judge-line">
                化判定：
                {' '}
                <span className={`gouka-badge gouka-badge-${item.transform.state}`}>{stateLabel(item.transform.state)}</span>
                {typeof item.transform.score === 'number' ? ` ${item.transform.score}` : ''}
              </div>
            ) : null}

            {Array.isArray(item.reasons) && item.reasons.length > 0 ? (
              <ul className="gouka-reason-list">
                {item.reasons.map((reason, reasonIndex) => (
                  <li key={`${index}-reason-${reasonIndex}`}>{toTraditionalDisplay(reason)}</li>
                ))}
              </ul>
            ) : null}

            {Array.isArray(item.transform?.reasons) && item.transform.reasons.length > 0 ? (
              <ul className="gouka-reason-list gouka-transform-reasons">
                {item.transform.reasons.map((reason, reasonIndex) => (
                  <li key={`${index}-transform-${reasonIndex}`}>{toTraditionalDisplay(reason)}</li>
                ))}
              </ul>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export default function GoukaAnlysis({ tableWidth, response, active = true }) {
  const containerRef = useRef(null);
  const [svgSize, setSvgSize] = useState({ width: 0, height: 0 });
  const [lines, setLines] = useState([]);
  const [showResolved, setShowResolved] = useState(false);
  const [selectedRelationKey, setSelectedRelationKey] = useState(null);

  const gouka = response?.gouka || {};
  const birthTimeUnknown = Boolean(response?.birth_time_unknown || response?.birthTimeUnknown);
  const filteredGouka = useMemo(() => {
    const sourceResolved = gouka.resolved || {};
    const kan = filterRelations(gouka.kan, 'kan', birthTimeUnknown);
    const shi = filterRelations(gouka.shi, 'shi', birthTimeUnknown);

    return {
      ...gouka,
      kan,
      shi,
      resolved: {
        ...sourceResolved,
        kan: filterRelations(sourceResolved.kan, 'kan', birthTimeUnknown),
        shi: filterRelations(sourceResolved.shi, 'shi', birthTimeUnknown),
        effective_kan: filterRelations(sourceResolved.effective_kan, 'kan', birthTimeUnknown),
        effective_shi: filterRelations(sourceResolved.effective_shi, 'shi', birthTimeUnknown),
        summary: filterSummary(sourceResolved.summary, birthTimeUnknown),
      },
    };
  }, [birthTimeUnknown, gouka]);
  const resolved = filteredGouka.resolved || {};
  const activeRelationKey = selectedRelationKey;

  const recomputeLayout = useCallback(() => {
    if (!active || !response || !containerRef.current) {
      setLines([]);
      return;
    }

    const containerRect = containerRef.current.getBoundingClientRect();
    if (containerRect.width === 0 || containerRect.height === 0) {
      return;
    }

    setSvgSize({ width: containerRect.width, height: containerRect.height });

    const newLines = [];
    const processData = (data, prefix) => {
      data.forEach((item, rowIdx) => {
        const lineId = `gouka-${prefix}-${rowIdx}`;
        const startEl = containerRef.current.querySelector(`.${lineId}-start`);
        const endEl = containerRef.current.querySelector(`.${lineId}-end`);

        if (!startEl || !endEl) return;

        const startRect = startEl.getBoundingClientRect();
        const endRect = endEl.getBoundingClientRect();
        const x1 = startRect.left + startRect.width / 2 - containerRect.left;
        const y1 = startRect.top + startRect.height / 2 - containerRect.top;
        const x2 = endRect.left + endRect.width / 2 - containerRect.left;
        const y2 = endRect.top + endRect.height / 2 - containerRect.top;

        newLines.push({
          key: relationKey(item),
          x1,
          y1,
          x2,
          y2,
          color: 'black',
          thickness: 1.2,
          label: `${item.type}${item.to ? item.to : ''}`,
          offset: 10,
        });
      });
    };

    if (filteredGouka.kan) {
      processData(filteredGouka.kan, 'kan');
    }
    if (filteredGouka.shi) {
      processData(filteredGouka.shi, 'shi');
    }

    setLines(newLines);
  }, [active, filteredGouka.kan, filteredGouka.shi, response]);

  useEffect(() => {
    if (!active) return;

    let raf2 = 0;
    const raf1 = window.requestAnimationFrame(() => {
      raf2 = window.requestAnimationFrame(() => {
        recomputeLayout();
      });
    });

    return () => {
      window.cancelAnimationFrame(raf1);
      window.cancelAnimationFrame(raf2);
    };
  }, [active, recomputeLayout]);

  useEffect(() => {
    setSelectedRelationKey(null);
  }, [response]);

  useEffect(() => {
    if (!active || !containerRef.current) return;

    const observer = new ResizeObserver(() => {
      recomputeLayout();
    });

    observer.observe(containerRef.current);
    window.addEventListener('resize', recomputeLayout);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', recomputeLayout);
    };
  }, [active, recomputeLayout]);

  const renderGoukaRows = (data, prefix) => {
    if (!Array.isArray(data)) return null;

    return data.map((item, rowIdx) => {
      const [startIndex, endIndex] = item.index;
      const lineId = `gouka-${prefix}-${rowIdx}`;
      const isActive = activeRelationKey === relationKey(item);
      return (
        <tr key={`${lineId}-row`} className={isActive ? 'gouka-row-active' : ''}>
          {[0, 1, 2, 3].map((colIdx) => (
            <td key={`${lineId}-col-${colIdx}`}>
              {colIdx === startIndex ? (
                <div className={`gouka-element ${lineId}-start${isActive ? ' gouka-element-active' : ''}`}>{item.element[0]}</div>
              ) : null}
              {colIdx === endIndex ? (
                <div className={`gouka-element ${lineId}-end${isActive ? ' gouka-element-active' : ''}`}>{item.element[1]}</div>
              ) : null}
            </td>
          ))}
        </tr>
      );
    });
  };

  return (
    <div className="gouka-layout" style={{ width: tableWidth }}>
      <section className="gouka-section">
        <div className="gouka-graph-toolbar">
          <button
            type="button"
            className="gouka-toggle-button"
            onClick={() => setShowResolved((current) => !current)}
          >
            裁決結果参照
          </button>
        </div>

        <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
          <table className="table-gouka" style={{ width: '100%' }}>
            {renderGoukaRows(filteredGouka.kan, 'kan')}
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
            {renderGoukaRows(filteredGouka.shi, 'shi')}
          </table>

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
              const { key, x1, y1, x2, y2, color, thickness, label, offset } = line;
              const isActive = activeRelationKey === key;
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
                    stroke={isActive ? '#e64841' : color}
                    strokeWidth={isActive ? thickness + 1.8 : thickness}
                    strokeOpacity={isActive ? 1 : 0.85}
                  />
                  {label ? (
                    <>
                      <rect
                        x={midX - 20}
                        y={midY - 10}
                        width={40}
                        height={20}
                        fill={isActive ? '#fff4cf' : 'white'}
                        transform={`rotate(${computedAngle}, ${midX}, ${midY})`}
                      />
                      <text
                        x={midX}
                        y={midY}
                        textAnchor="middle"
                        alignmentBaseline="middle"
                        fill={isActive ? '#b42318' : color}
                        fontSize="12"
                        fontWeight={isActive ? '700' : '400'}
                        transform={`rotate(${computedAngle}, ${midX}, ${midY})`}
                      >
                        {label}
                      </text>
                    </>
                  ) : null}
                </g>
              );
            })}
          </svg>
        </div>
      </section>

      {showResolved ? (
        <section className="gouka-section">
          <div className="gouka-section-title">裁決結果</div>
          <div className="gouka-section-subtitle">納入制化與牽制後的最終判定。</div>

          <div className="gouka-subgrid">
            <div>
              <div className="gouka-subtitle">天干判定</div>
              <ResolvedList
                items={resolved.kan}
                emptyText="沒有天干裁決結果。"
                activeKey={activeRelationKey}
                onSelect={(key) => setSelectedRelationKey((current) => (current === key ? null : key))}
              />
            </div>
            <div>
              <div className="gouka-subtitle">地支判定</div>
              <ResolvedList
                items={resolved.shi}
                emptyText="沒有地支裁決結果。"
                activeKey={activeRelationKey}
                onSelect={(key) => setSelectedRelationKey((current) => (current === key ? null : key))}
              />
            </div>
          </div>

          <div className="gouka-subgrid">
            <div>
              <div className="gouka-subtitle">有效關係 天干</div>
              <SimpleList items={resolved.effective_kan} emptyText="沒有有效關係。" />
            </div>
            <div>
              <div className="gouka-subtitle">有效關係 地支</div>
              <SimpleList items={resolved.effective_shi} emptyText="沒有有效關係。" />
            </div>
          </div>

          <div>
            <div className="gouka-subtitle">全盤裁決</div>
            {Array.isArray(resolved.summary) && resolved.summary.length > 0 ? (
              <ul className="gouka-summary-list">
                {resolved.summary.map((item, index) => (
                  <li key={`summary-${index}`}>{toTraditionalDisplay(item)}</li>
                ))}
              </ul>
            ) : (
              <div className="gouka-empty">沒有裁決摘要。</div>
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}
