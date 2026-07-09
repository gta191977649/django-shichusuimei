import React, { useMemo } from "react";

const UNKNOWN_PILLAR_TEXT = "不明";
const PILLARS = ["年柱", "月柱", "日柱", "時柱"];
const FLOW_TYPES = new Set(["干合", "支合", "三合局", "三会局", "半合"]);
const BLOCK_TYPES = new Set(["干沖", "干冲", "支沖", "支冲", "支刑", "自刑"]);
const NODE_X = [62, 180, 298, 416];
const ROW_Y = { kan: 86, shi: 232 };
const CANVAS_WIDTH = 478;
const CANVAS_HEIGHT = 304;

const SYMBOL_ELEMENT = {
  甲: "木", 乙: "木", 寅: "木", 卯: "木",
  丙: "火", 丁: "火", 巳: "火", 午: "火",
  戊: "土", 己: "土", 辰: "土", 戌: "土", 丑: "土", 未: "土",
  庚: "金", 辛: "金", 申: "金", 酉: "金",
  壬: "水", 癸: "水", 亥: "水", 子: "水",
};

const ELEMENT_COLORS = {
  木: "forestgreen",
  火: "#e64841",
  土: "saddlebrown",
  金: "darkorange",
  水: "royalblue",
};

const GENERATES = { 木: "火", 火: "土", 土: "金", 金: "水", 水: "木" };
const CONTROLS = { 木: "土", 土: "水", 水: "火", 火: "金", 金: "木" };

const RELATION_LABEL = {
  干合: "合",
  支合: "合",
  半合: "半合",
  三合局: "三合局",
  三会局: "三会局",
  干沖: "冲",
  干冲: "冲",
  支沖: "冲",
  支冲: "冲",
  支刑: "刑",
  自刑: "刑",
};

const isKnown = (value) => Boolean(value && value !== UNKNOWN_PILLAR_TEXT);
const symbolColor = (symbol) => ELEMENT_COLORS[SYMBOL_ELEMENT[symbol]] || "#111";
const pairKey = (row, left, right) => `${row}:${Math.min(left, right)}:${Math.max(left, right)}`;
const pillarKey = (index) => `pillar:${index}`;
const pointFor = (row, index) => ({ row, index, x: NODE_X[index], y: ROW_Y[row] });
const isAdjacentPair = (indexes) => indexes.length === 2 && Math.abs(indexes[0] - indexes[1]) === 1;

const getFiveElementRelation = (left, right) => {
  const leftElement = SYMBOL_ELEMENT[left];
  const rightElement = SYMBOL_ELEMENT[right];
  if (!leftElement || !rightElement) return null;
  if (leftElement === rightElement) return { status: "flow", label: "助", type: "相助" };
  if (GENERATES[leftElement] === rightElement || GENERATES[rightElement] === leftElement) {
    return { status: "flow", label: "生", type: "相生" };
  }
  if (CONTROLS[leftElement] === rightElement || CONTROLS[rightElement] === leftElement) {
    return { status: "block", label: "克", type: "相克" };
  }
  return null;
};

const buildGoukaRelations = (response, visibleIndexes) => {
  const gouka = response?.gouka || {};
  const relations = [];
  const covered = new Set();

  const pushRelation = (item, row) => {
    const indexes = Array.isArray(item?.index) ? item.index.filter((index) => visibleIndexes.has(index)) : [];
    if (!isAdjacentPair(indexes)) return;

    const type = item.type || "";
    const isFlow = FLOW_TYPES.has(type);
    const isBlock = BLOCK_TYPES.has(type);
    if (!isFlow && !isBlock) return;

    const sortedIndexes = [...indexes].sort((left, right) => left - right);
    covered.add(pairKey(row, sortedIndexes[0], sortedIndexes[1]));

    relations.push({
      key: `gouka-${row}-${type}-${sortedIndexes.join("-")}-${item.to || ""}`,
      status: isFlow ? "flow" : "block",
      label: `${RELATION_LABEL[type] || type}${item.to && isFlow ? `化${item.to}` : ""}`,
      badgeLabel: RELATION_LABEL[type] || type,
      points: sortedIndexes.map((index) => pointFor(row, index)),
      priority: "gouka",
    });
  };

  (gouka.kan || []).forEach((item) => pushRelation(item, "kan"));
  (gouka.shi || []).forEach((item) => pushRelation(item, "shi"));

  return { relations, covered };
};

const buildSupplementRelations = (response, visibleIndexes, covered) => {
  const relations = [];
  const stems = response?.tenkan || [];
  const branches = response?.chishi || [];

  const pushPair = (row, leftIndex, rightIndex, leftSymbol, rightSymbol) => {
    const key = pairKey(row, leftIndex, rightIndex);
    if (covered.has(key)) return;
    const relation = getFiveElementRelation(leftSymbol, rightSymbol);
    if (!relation) return;
    relations.push({
      key: `element-${key}`,
      status: relation.status,
      label: relation.label,
      badgeLabel: relation.label,
      type: relation.type,
      hideLine: relation.type === "相克",
      points: [pointFor(row, leftIndex), pointFor(row, rightIndex)],
      priority: "supplement",
    });
  };

  for (let index = 0; index < 3; index += 1) {
    if (!visibleIndexes.has(index) || !visibleIndexes.has(index + 1)) continue;
    if (isKnown(stems[index]) && isKnown(stems[index + 1])) {
      pushPair("kan", index, index + 1, stems[index], stems[index + 1]);
    }
    if (isKnown(branches[index]) && isKnown(branches[index + 1])) {
      pushPair("shi", index, index + 1, branches[index], branches[index + 1]);
    }
  }

  for (let index = 0; index < 4; index += 1) {
    if (!visibleIndexes.has(index) || !isKnown(stems[index]) || !isKnown(branches[index])) continue;
    const relation = getFiveElementRelation(stems[index], branches[index]);
    if (!relation) continue;
    relations.push({
      key: `element-${pillarKey(index)}`,
      status: relation.status,
      label: relation.label,
      badgeLabel: relation.label,
      type: relation.type,
      hideLine: relation.type === "相克",
      points: [pointFor("kan", index), pointFor("shi", index)],
      priority: "supplement",
    });
  }

  return relations;
};

const midpoint = (points) => {
  const first = points[0];
  const last = points[points.length - 1];
  return { x: (first.x + last.x) / 2, y: (first.y + last.y) / 2 };
};

const absolutePointStyle = (x, y) => ({
  left: `${(x / CANVAS_WIDTH) * 100}%`,
  top: `${(y / CANVAS_HEIGHT) * 100}%`,
});

const lineStyle = (x1, y1, x2, y2) => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.sqrt((dx * dx) + (dy * dy));
  return {
    ...absolutePointStyle(x1, y1),
    width: `${(length / CANVAS_WIDTH) * 100}%`,
    transform: `rotate(${Math.atan2(dy, dx)}rad)`,
  };
};

function RelationPath({ relation }) {
  const baseCenter = midpoint(relation.points);
  const isVertical = relation.points.every((point) => point.x === relation.points[0].x);
  const center = baseCenter;
  const statusClass = relation.status === "flow" ? "element-flow-relation-flow" : "element-flow-relation-block";

  return (
    <div
      className={`element-flow-relation ${statusClass}`}
      style={{ "--element-flow-color": relation.status === "flow" ? ELEMENT_COLORS.木 : ELEMENT_COLORS.火 }}
      title={relation.label}
    >
      {!relation.hideLine && relation.points.slice(0, -1).map((point, index) => {
        const nextPoint = relation.points[index + 1];
        const offsets = isVertical ? [-10, 10] : [-8, 8];
        return offsets.map((offset) => (
          <div
            key={`${relation.key}-${index}-${offset}`}
            className="element-flow-line"
            style={lineStyle(
              isVertical ? point.x + offset : point.x + 26,
              isVertical ? point.y + 32 : point.y + offset,
              isVertical ? nextPoint.x + offset : nextPoint.x - 26,
              isVertical ? nextPoint.y - 32 : nextPoint.y + offset,
            )}
          />
        ));
      })}
      <div
        className="element-flow-badge"
        style={absolutePointStyle(center.x, center.y)}
      >
        {relation.badgeLabel}
      </div>
    </div>
  );
}

function PillarNode({ index, stem, branch, stemTsuhen, branchTsuhen, hidden }) {
  const x = NODE_X[index];
  const stemText = hidden ? "？" : stem || "・";
  const branchText = hidden ? "？" : branch || "・";

  return (
    <div className={`element-flow-pillar${hidden ? " element-flow-pillar-hidden" : ""}`}>
      <div className="element-flow-pillar-label" style={absolutePointStyle(x, 24)}>{PILLARS[index]}</div>
      <div className="element-flow-tsuhen" style={absolutePointStyle(x, 50)}>{hidden ? "不明" : stemTsuhen || " "}</div>
      <div className="element-flow-symbol" style={{ ...absolutePointStyle(x, ROW_Y.kan), color: symbolColor(stem) }}>{stemText}</div>
      <div className="element-flow-symbol" style={{ ...absolutePointStyle(x, ROW_Y.shi), color: symbolColor(branch) }}>{branchText}</div>
      <div className="element-flow-tsuhen" style={absolutePointStyle(x, 286)}>{hidden ? "不明" : branchTsuhen || " "}</div>
    </div>
  );
}

export default function ElementFlow({ response, tableWidth = "100%", active = true }) {
  const { relations, visibleIndexes } = useMemo(() => {
    if (!response || !active) return { relations: [], visibleIndexes: new Set() };
    const indexes = new Set([0, 1, 2, 3]);
    if (response.birth_time_unknown || response.birthTimeUnknown) indexes.delete(3);

    const gouka = buildGoukaRelations(response, indexes);
    return {
      relations: [...gouka.relations, ...buildSupplementRelations(response, indexes, gouka.covered)],
      visibleIndexes: indexes,
    };
  }, [active, response]);

  if (!response) return <div className="element-flow-empty">-</div>;

  const stems = response.tenkan || [];
  const branches = response.chishi || [];
  const stemTsuhen = response.junshi?.tenkan || [];
  const branchTsuhen = response.junshi?.zoukan_honki || [];

  return (
    <div className="element-flow" style={{ width: tableWidth }}>
      <div className="element-flow-canvas" role="img" aria-label="命局流通図">
        <div className="element-flow-lines">
          {relations.map((relation) => <RelationPath key={relation.key} relation={relation} />)}
        </div>
        {[0, 1, 2, 3].map((index) => (
          <PillarNode
            key={`pillar-${index}`}
            index={index}
            stem={stems[index]}
            branch={branches[index]}
            stemTsuhen={stemTsuhen[index]}
            branchTsuhen={branchTsuhen[index]}
            hidden={!visibleIndexes.has(index)}
          />
        ))}
      </div>
      <div className="element-flow-legend">
        <div className="element-flow-legend-row">
          <span className="element-flow-legend-dot element-flow-legend-flow" />
          <span>流通：三合、三会、五合、六合、相生、相助</span>
        </div>
        <div className="element-flow-legend-row">
          <span className="element-flow-legend-dot element-flow-legend-block" />
          <span>阻塞：相冲、相刑、相克</span>
        </div>
      </div>
    </div>
  );
}
