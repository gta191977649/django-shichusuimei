import { cloneElement, Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import api from "../../api";
import Element from "../../components/Element";

const EMPTY_FLOW_ITEMS = { current_index: 0, items: [] };
const EMPTY_RELATIONS = [];
const UNKNOWN_PILLAR_TEXT = "不明";
const NATAL_INSIGHT_COLUMN_KEYS = new Set(["year", "month", "day", "time"]);
const VALID_STEMS = new Set(["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"]);
const VALID_BRANCHES = new Set(["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"]);
const KAN_RELATION_TABLES = [
  { type: "干合", pairs: [["甲", "己", "土"], ["乙", "庚", "金"], ["丙", "辛", "水"], ["丁", "壬", "木"], ["戊", "癸", "火"]] },
  { type: "干沖", pairs: [["甲", "庚"], ["乙", "辛"], ["丙", "壬"], ["丁", "癸"]] },
  { type: "干剋", pairs: [["丙", "庚"], ["丁", "辛"], ["甲", "戊"], ["乙", "己"], ["戊", "壬"], ["己", "癸"]] },
];
const SHI_RELATION_TABLES = [
  { type: "支合", pairs: [["子", "丑", "土"], ["辰", "酉", "金"], ["申", "巳", "水"], ["寅", "亥", "木"], ["午", "未", "火/土"], ["卯", "戌", "火"]] },
  { type: "半合", pairs: [["申", "子", "水"], ["子", "辰", "水"], ["亥", "卯", "木"], ["卯", "未", "木"], ["寅", "午", "火"], ["午", "戌", "火"], ["巳", "酉", "金"], ["酉", "丑", "金"]] },
  { type: "暗合", pairs: [["寅", "丑"], ["申", "卯"], ["午", "亥"], ["子", "巳"]] },
  { type: "支沖", pairs: [["午", "子"], ["未", "丑"], ["申", "寅"], ["酉", "卯"], ["戌", "辰"], ["亥", "巳"]] },
  { type: "支刑", pairs: [["子", "卯"], ["寅", "巳"], ["巳", "申"], ["申", "寅"], ["丑", "戌"], ["戌", "未"], ["未", "丑"]] },
  { type: "自刑", pairs: [["辰", "辰"], ["午", "午"], ["酉", "酉"], ["亥", "亥"]] },
  { type: "支破", pairs: [["酉", "子"], ["辰", "丑"], ["亥", "寅"], ["午", "卯"], ["申", "巳"], ["未", "戌"]] },
  { type: "支害", pairs: [["酉", "戌"], ["申", "亥"], ["未", "子"], ["午", "丑"], ["巳", "寅"], ["辰", "卯"]] },
];
const SANHE_RELATION_TABLES = [
  { type: "三合局", members: ["申", "子", "辰"], to: "水" },
  { type: "三合局", members: ["亥", "卯", "未"], to: "木" },
  { type: "三合局", members: ["寅", "午", "戌"], to: "火" },
  { type: "三合局", members: ["巳", "酉", "丑"], to: "金" },
];
const SANHUI_RELATION_TABLES = [
  { type: "三会局", members: ["亥", "子", "丑"], to: "水" },
  { type: "三会局", members: ["寅", "卯", "辰"], to: "木" },
  { type: "三会局", members: ["巳", "午", "未"], to: "火" },
  { type: "三会局", members: ["申", "酉", "戌"], to: "金" },
];
const HE_LIKE_RELATION_TYPES = new Set(["干合", "支合", "三合局", "三会局", "半合"]);

const formatDate = (value) => {
  if (!value) return "-";
  return value.replace(/-/g, "/");
};

const isKnownSymbol = (value, validSet) => Boolean(value && value !== UNKNOWN_PILLAR_TEXT && validSet.has(value));

const pairMatches = (left, right, pair) =>
  (pair[0] === left && pair[1] === right) || (pair[0] === right && pair[1] === left);

const formatRelationLabel = (relation) => {
  if (!relation) return "";
  if (relation.to && relation.type && HE_LIKE_RELATION_TYPES.has(relation.type)) {
    return `${relation.type}化${relation.to}`;
  }
  if (relation.to && relation.type) {
    return `${relation.type}${relation.to}`;
  }
  return relation.type || "";
};

const buildRelations = (columns, realm) => {
  const validSet = realm === "kan" ? VALID_STEMS : VALID_BRANCHES;
  const tables = realm === "kan" ? KAN_RELATION_TABLES : SHI_RELATION_TABLES;
  const valueKey = realm === "kan" ? "stem" : "branch";
  const relations = [];
  const fullGroupPairKeys = new Set();

  if (realm === "shi") {
    [...SANHE_RELATION_TABLES, ...SANHUI_RELATION_TABLES].forEach((table) => {
      const indexes = [];
      const elements = [];
      table.members.forEach((member) => {
        const index = columns.findIndex((column) => column[valueKey] === member);
        if (index >= 0) {
          indexes.push(index);
          elements.push(member);
        }
      });

      if (indexes.length !== table.members.length) return;
      table.members.forEach((left, leftIndex) => {
        table.members.slice(leftIndex + 1).forEach((right) => {
          fullGroupPairKeys.add([left, right].sort().join("-"));
        });
      });
      relations.push({
        key: `${realm}-${indexes.join("-")}-${table.type}`,
        realm,
        type: table.type,
        to: table.to,
        element: elements,
        index: indexes,
        labels: indexes.map((index) => columns[index].label),
      });
    });
  }

  columns.forEach((leftColumn, leftIndex) => {
    const left = leftColumn[valueKey];
    if (!isKnownSymbol(left, validSet)) return;

    for (let rightIndex = leftIndex + 1; rightIndex < columns.length; rightIndex += 1) {
      const rightColumn = columns[rightIndex];
      const right = rightColumn[valueKey];
      if (!isKnownSymbol(right, validSet)) continue;

      tables.forEach((table) => {
        const matchedPair = table.pairs.find((pair) => pairMatches(left, right, pair));
        if (!matchedPair) return;
        if (table.type === "半合" && fullGroupPairKeys.has([left, right].sort().join("-"))) return;
        relations.push({
          key: `${realm}-${leftIndex}-${rightIndex}-${table.type}`,
          realm,
          type: table.type,
          to: matchedPair[2] || "",
          element: [left, right],
          index: [leftIndex, rightIndex],
          labels: [leftColumn.label, rightColumn.label],
        });
      });
    }
  });

  return relations;
};

const normalizeSelectionPayload = (source) => ({
  flowYearValue: source?.flowYearValue ?? source?.flow_year_value ?? source?.active_year?.year ?? null,
  flowYear: source?.flowYear ?? source?.flow_year ?? null,
  flowMonths: source?.flowMonths ?? source?.flow_months ?? EMPTY_FLOW_ITEMS,
  flowMonth: source?.flowMonth ?? source?.flow_month ?? null,
  flowDays: source?.flowDays ?? source?.flow_days ?? EMPTY_FLOW_ITEMS,
  flowDay: source?.flowDay ?? source?.flow_day ?? null,
  selectedMonthIndex:
    source?.selectedMonthIndex ??
    source?.selected_month_index ??
    source?.flowMonths?.current_index ??
    source?.flow_months?.current_index ??
    0,
  selectedDayIndex:
    source?.selectedDayIndex ??
    source?.selected_day_index ??
    source?.flowDays?.current_index ??
    source?.flow_days?.current_index ??
    0,
});

const renderElementRuby = (value, tsuhen = "", className = "", clickConfig = null) => (
  <div
    className={`pd-element-slot ${className}${clickConfig ? " is-insight-enabled" : ""}`.trim()}
    data-insight-key={clickConfig?.insightKey || undefined}
  >
    <Element
      name={value || "・"}
      tsuhen={tsuhen || ""}
      onClick={clickConfig?.onClick}
      title={clickConfig?.title}
      ariaLabel={clickConfig?.ariaLabel}
      className={clickConfig ? "pd-element-trigger" : undefined}
    />
  </div>
);

const renderZoukanLines = (zoukan = [], getClickConfig = null) => (
  <div className="pd-board-zoukan">
    {[
      { index: 2, part: "hidden_primary" },
      { index: 1, part: "hidden_middle" },
      { index: 0, part: "hidden_residual" },
    ].map(({ index, part }) => {
      const item = zoukan[index] || {};
      return (
        <div key={`zoukan-${index}`} className="pd-board-zoukan-line">
          {renderElementOrBlank(
            item.element,
            item.tsuhen,
            "pd-zoukan-element-ruby",
            getClickConfig ? getClickConfig(part, item.element, item.tsuhen) : null
          )}
        </div>
      );
    })}
  </div>
);

const FLOW_STAR_ABBREVIATIONS = {
  比肩: "比", 劫財: "劫", 劫财: "劫", 食神: "食", 傷官: "傷", 伤官: "傷",
  偏財: "才", 偏财: "才", 正財: "財", 正财: "財", 七殺: "殺", 七杀: "殺", 偏官: "殺",
  正官: "官", 偏印: "梟", 正印: "印",
};
const abbreviateFlowStar = (star) => FLOW_STAR_ABBREVIATIONS[star] || star;

const renderPillarStack = (stem, branch, tsuhen, branchTsuhen) => (
  <div className="pd-flow-column-stack">
    <div className="pd-flow-column-main" title={tsuhen}>{renderElementOrBlank(stem, abbreviateFlowStar(tsuhen), "pd-flow-element-ruby")}</div>
    <div className="pd-flow-column-main" title={branchTsuhen}>{renderElementOrBlank(branch, abbreviateFlowStar(branchTsuhen), "pd-flow-element-ruby")}</div>
  </div>
);

const renderOverviewCell = (content, className = "", style = undefined, key = undefined) => (
  <div key={key} data-pillar={key} className={`pd-overview-cell ${className}`.trim()} style={style}>{content}</div>
);

const renderElementOrBlank = (value, tsuhen = "", className = "", clickConfig = null) =>
  value ? (
    renderElementRuby(value, tsuhen, className, clickConfig)
  ) : (
    <div className={`pd-element-slot ${className}`.trim()}>
      <span className="pd-element-empty" aria-hidden="true" />
    </div>
  );

const renderTopStarText = (value, className = "") => (
  <div className={`pd-top-star-text ${className}`.trim()}>{value || " "}</div>
);

const collectRelationPoints = (containerNode, relationId, gridRect) =>
  Array.from(containerNode.querySelectorAll(`[data-relation-id="${relationId}"]`))
    .map((node) => {
      const rect = node.getBoundingClientRect();
      return {
        column: Number(node.getAttribute("data-relation-column") || 0),
        x: rect.left + rect.width / 2 - gridRect.left + containerNode.scrollLeft,
        y: rect.top + rect.height / 2 - gridRect.top,
      };
    })
    .sort((left, right) => left.column - right.column);

export default function PrecisionMeishikiBoard({
  data,
  requestInput,
  elementInsightsAvailable = false,
  onElementClick = null,
}) {
  const precision = data?.precision_chart;
  const natal = useMemo(() => precision?.natal || {}, [precision?.natal]);
  const yearGroups = useMemo(() => data?.daiun_table?.year_table || [], [data?.daiun_table?.year_table]);
  const daiunSnapshots = precision?.daiun_snapshots || [];
  const initialSelection = useMemo(() => normalizeSelectionPayload(precision), [precision]);

  const [selectedDaiunIndex, setSelectedDaiunIndex] = useState(precision?.active_daiun?.index ?? 0);
  const [selectedYear, setSelectedYear] = useState(initialSelection.flowYearValue);
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(initialSelection.selectedMonthIndex);
  const [selectedDayIndex, setSelectedDayIndex] = useState(initialSelection.selectedDayIndex);
  const [selection, setSelection] = useState(initialSelection);
  const [loadingSelection, setLoadingSelection] = useState(false);
  const [selectionError, setSelectionError] = useState(null);
  const [expandedFlowColumns, setExpandedFlowColumns] = useState(false);
  const selectionRequestRef = useRef(0);
  const flowBoardScrollRefs = useRef({});
  const overviewGridRef = useRef(null);
  const [relationSvgSize, setRelationSvgSize] = useState({ width: 0, height: 0 });
  const [relationLines, setRelationLines] = useState([]);
  const [expandedRelations, setExpandedRelations] = useState({ kan: false, shi: false });

  useEffect(() => {
    ++selectionRequestRef.current;
    setLoadingSelection(false);
    setSelectionError(null);
    const nextSelection = normalizeSelectionPayload(precision);
    setSelection(nextSelection);
    setSelectedDaiunIndex(precision?.active_daiun?.index ?? 0);
    setSelectedYear(nextSelection.flowYearValue);
    setSelectedMonthIndex(nextSelection.selectedMonthIndex);
    setSelectedDayIndex(nextSelection.selectedDayIndex);
    return () => { ++selectionRequestRef.current; };
  }, [precision]);

  const selectedYearList = useMemo(
    () => yearGroups[selectedDaiunIndex]?.list || [],
    [selectedDaiunIndex, yearGroups]
  );

  const loadSelection = async (params) => {
    const { year, monthIndex = 0, dayIndex = 0, daiunIndex = selectedDaiunIndex } = params;
    if (!requestInput?.date || !requestInput?.time || year == null) return;
    const requestId = ++selectionRequestRef.current;
    setSelectionError(null);
    setLoadingSelection(true);
    try {
      const res = await api.post("/api/precision-flow", {
        date: requestInput.date,
        time: requestInput.time,
        time_unknown: requestInput.birthTimeUnknown,
        gender: requestInput.gender,
        year,
        month_index: monthIndex,
        day_index: dayIndex,
      });
      if (requestId !== selectionRequestRef.current) return;
      const payload = normalizeSelectionPayload(res.data || {});
      setSelection(payload);
      setSelectedDaiunIndex(daiunIndex);
      setSelectedYear(payload.flowYearValue);
      setSelectedMonthIndex(payload.selectedMonthIndex);
      setSelectedDayIndex(payload.selectedDayIndex);
    } catch {
      if (requestId === selectionRequestRef.current) setSelectionError({ ...params, daiunIndex });
    } finally {
      if (requestId === selectionRequestRef.current) setLoadingSelection(false);
    }
  };

  const currentDaiun = daiunSnapshots[selectedDaiunIndex] || precision?.active_daiun || null;
  const flowDays = selection?.flowDays?.items || [];
  const resolvedDayIndex = flowDays.length ? Math.min(selectedDayIndex, flowDays.length - 1) : 0;
  const currentFlowDay = flowDays[resolvedDayIndex] || selection?.flowDay || null;
  const currentSelectionSnapshot = normalizeSelectionPayload(precision);

  const handleSelectToday = () => {
    ++selectionRequestRef.current;
    setLoadingSelection(false);
    setSelectionError(null);
    setSelection(currentSelectionSnapshot);
    setSelectedDaiunIndex(precision?.active_daiun?.index ?? 0);
    setSelectedYear(currentSelectionSnapshot.flowYearValue);
    setSelectedMonthIndex(currentSelectionSnapshot.selectedMonthIndex);
    setSelectedDayIndex(currentSelectionSnapshot.selectedDayIndex);
  };

  const selectDay = (index) => {
    ++selectionRequestRef.current;
    setLoadingSelection(false);
    setSelectionError(null);
    setSelectedDayIndex(index);
    setSelection((current) => ({ ...current, flowDay: flowDays[index], selectedDayIndex: index }));
  };

  const allOverviewColumns = useMemo(() => [
    {
      key: "flow-day",
      label: "流日",
      topStar: currentFlowDay?.kan_tsuhen || "",
      stem: currentFlowDay?.tenkan || "",
      branch: currentFlowDay?.chishi || "",
      shi_tsuhen: currentFlowDay?.shi_tsuhen || "",
      zoukan: currentFlowDay?.zoukan || [],
      seiun: currentFlowDay?.seiun || "",
      jizuo: currentFlowDay?.jizuo || "",
      kubou: currentFlowDay?.kubou || "",
      nayin: currentFlowDay?.nayin || "",
    },
    {
      key: "flow-month",
      label: "流月",
      topStar: selection?.flowMonth?.kan_tsuhen || "",
      stem: selection?.flowMonth?.tenkan || "",
      branch: selection?.flowMonth?.chishi || "",
      shi_tsuhen: selection?.flowMonth?.shi_tsuhen || "",
      zoukan: selection?.flowMonth?.zoukan || [],
      seiun: selection?.flowMonth?.seiun || "",
      jizuo: selection?.flowMonth?.jizuo || "",
      kubou: selection?.flowMonth?.kubou || "",
      nayin: selection?.flowMonth?.nayin || "",
    },
    {
      key: "flow-year",
      label: "流年",
      topStar: selection?.flowYear?.kan_tsuhen || "",
      stem: selection?.flowYear?.tenkan || "",
      branch: selection?.flowYear?.chishi || "",
      shi_tsuhen: selection?.flowYear?.shi_tsuhen || "",
      zoukan: selection?.flowYear?.zoukan || [],
      seiun: selection?.flowYear?.seiun || "",
      jizuo: selection?.flowYear?.jizuo || "",
      kubou: selection?.flowYear?.kubou || "",
      nayin: selection?.flowYear?.nayin || "",
    },
    {
      key: "daiun",
      label: "大運",
      topStar: currentDaiun?.kan_tsuhen || "",
      stem: currentDaiun?.tenkan || "",
      branch: currentDaiun?.chishi || "",
      shi_tsuhen: currentDaiun?.shi_tsuhen || "",
      zoukan: currentDaiun?.zoukan || [],
      seiun: currentDaiun?.seiun || "",
      jizuo: currentDaiun?.jizuo || "",
      kubou: currentDaiun?.kubou || "",
      nayin: currentDaiun?.nayin || "",
    },
    {
      key: "year",
      label: "年柱",
      topStar: data?.junshi?.tenkan?.[0] || "",
      stem: data?.tenkan?.[0] || "",
      branch: data?.chishi?.[0] || "",
      shi_tsuhen: natal?.year?.shi_tsuhen || "",
      zoukan: natal?.year?.zoukan || [],
      seiun: data?.juniunshi?.[0] || "",
      jizuo: natal?.year?.jizuo || "",
      kubou: natal?.year?.kubou || "",
      nayin: natal?.year?.nayin || "",
    },
    {
      key: "month",
      label: "月柱",
      topStar: data?.junshi?.tenkan?.[1] || "",
      stem: data?.tenkan?.[1] || "",
      branch: data?.chishi?.[1] || "",
      shi_tsuhen: natal?.month?.shi_tsuhen || "",
      zoukan: natal?.month?.zoukan || [],
      seiun: data?.juniunshi?.[1] || "",
      jizuo: natal?.month?.jizuo || "",
      kubou: natal?.month?.kubou || "",
      nayin: natal?.month?.nayin || "",
    },
    {
      key: "day",
      label: "日柱",
      topStar: data?.junshi?.tenkan?.[2] || "",
      stem: data?.tenkan?.[2] || "",
      branch: data?.chishi?.[2] || "",
      shi_tsuhen: natal?.day?.shi_tsuhen || "",
      zoukan: natal?.day?.zoukan || [],
      seiun: data?.juniunshi?.[2] || "",
      jizuo: natal?.day?.jizuo || "",
      kubou: natal?.day?.kubou || "",
      nayin: natal?.day?.nayin || "",
    },
    {
      key: "time",
      label: "時柱",
      topStar: data?.junshi?.tenkan?.[3] || "",
      stem: data?.tenkan?.[3] || "",
      branch: data?.chishi?.[3] || "",
      shi_tsuhen: natal?.time?.shi_tsuhen || "",
      zoukan: natal?.time?.zoukan || [],
      seiun: data?.juniunshi?.[3] || "",
      jizuo: natal?.time?.jizuo || "",
      kubou: natal?.time?.kubou || "",
      nayin: natal?.time?.nayin || "",
    },
  ], [currentFlowDay, selection?.flowMonth, selection?.flowYear, currentDaiun, data, natal]);
  const overviewColumns = useMemo(
    () => expandedFlowColumns ? allOverviewColumns : allOverviewColumns.slice(2),
    [allOverviewColumns, expandedFlowColumns]
  );

  const mapOverviewColumns = (render) => overviewColumns.map((column) =>
    cloneElement(render(column), { key: column.key, "data-pillar": column.key })
  );

  const buildInsightClickConfig = useCallback(
    (columnKey, part, symbol, tsuhen) => {
      if (typeof onElementClick !== "function") return null;
      if (!NATAL_INSIGHT_COLUMN_KEYS.has(columnKey)) return null;
      if (!symbol || symbol === UNKNOWN_PILLAR_TEXT) return null;

      const insightKey = `${columnKey}.${part}`;
      return {
        insightKey,
        title: elementInsightsAvailable ? "AI 命式要素解読を開く" : "AI 解読を先に実行してください",
        ariaLabel: `AI 命式要素解読: ${insightKey}`,
        onClick: () =>
          onElementClick({
            key: insightKey,
            pillar: columnKey,
            part,
            symbol,
            tsuhen: tsuhen || "",
            available: elementInsightsAvailable,
          }),
      };
    },
    [elementInsightsAvailable, onElementClick]
  );

  const { kanRelations, shiRelations } = useMemo(
    () => ({
      kanRelations: buildRelations(overviewColumns, "kan"),
      shiRelations: buildRelations(overviewColumns, "shi"),
    }),
    [overviewColumns]
  );
  const visibleKanRelations = expandedRelations.kan ? kanRelations : EMPTY_RELATIONS;
  const visibleShiRelations = expandedRelations.shi ? shiRelations : EMPTY_RELATIONS;

  const recomputeRelationLines = useCallback(() => {
    const gridNode = overviewGridRef.current;
    if (!gridNode) {
      setRelationLines([]);
      return;
    }

    const gridRect = gridNode.getBoundingClientRect();
    if (gridRect.width === 0 || gridRect.height === 0) return;

    setRelationSvgSize({
      width: gridNode.scrollWidth,
      height: gridNode.scrollHeight,
    });

    const nextLines = [];
    const collectLines = (relations, prefix) => {
      relations.forEach((relation, index) => {
        const relationId = `pd-relation-${prefix}-${index}`;
        const points = collectRelationPoints(gridNode, relationId, gridRect);
        if (points.length < 2) return;

        nextLines.push({
          key: relation.key,
          type: relation.type,
          label: formatRelationLabel(relation),
          points,
        });
      });
    };

    collectLines(visibleKanRelations, "kan");
    collectLines(visibleShiRelations, "shi");
    setRelationLines(nextLines);
  }, [visibleKanRelations, visibleShiRelations]);

  useEffect(() => {
    let raf2 = 0;
    const raf1 = window.requestAnimationFrame(() => {
      raf2 = window.requestAnimationFrame(recomputeRelationLines);
    });

    return () => {
      window.cancelAnimationFrame(raf1);
      window.cancelAnimationFrame(raf2);
    };
  }, [recomputeRelationLines]);

  useEffect(() => {
    const gridNode = overviewGridRef.current;
    if (!gridNode) return undefined;

    const observer = new ResizeObserver(recomputeRelationLines);
    observer.observe(gridNode);
    window.addEventListener("resize", recomputeRelationLines);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", recomputeRelationLines);
    };
  }, [recomputeRelationLines]);

  const renderRelationOverviewRows = (label, relations, prefix, expanded, onToggle) => {
    if (!expanded) return null;

    const displayRelations = expanded && relations.length
      ? relations
      : [{
          key: `${prefix}-empty`,
          type: "",
          element: [],
          index: [],
          labels: [],
          placeholder: true,
        }];

    return (
      <>
        {renderOverviewCell(
          <button
            type="button"
            className="pd-relation-toggle"
            onClick={onToggle}
            aria-expanded={expanded}
          >
            <span>{label}</span>
            <span className="pd-relation-toggle-arrow">{expanded ? "▲" : "▼"}</span>
          </button>,
          "pd-overview-side pd-overview-relation-side pd-overview-relation-side-merged",
          { gridRow: `span ${displayRelations.length}` }
        )}
        {displayRelations.map((relation, relationIndex) => {
          const relationCellClass = `pd-overview-relation${relationIndex === displayRelations.length - 1 ? " pd-overview-relation-end" : ""}`;
          return (
            <Fragment key={relation.key}>
              {overviewColumns.map((column, columnIndex) => {
                if (relation.placeholder) {
                  return renderOverviewCell(<span className="pd-relation-empty">-</span>, relationCellClass, undefined, column.key);
                }

                const relationColumnIndex = relation.index.indexOf(columnIndex);
                if (relationColumnIndex < 0) {
                  return renderOverviewCell(<span className="pd-relation-empty"> </span>, relationCellClass, undefined, column.key);
                }

                const markerSide = relationColumnIndex === 0
                  ? "start"
                  : (relationColumnIndex === relation.index.length - 1 ? "end" : "middle");
                const markerElement = relation.element[relationColumnIndex];
                const relationLabel = formatRelationLabel(relation);
                const relationTitle = relation.index
                  .map((_, itemIndex) => `${relation.labels[itemIndex]} ${relation.element[itemIndex]}`)
                  .join(" - ");
                return renderOverviewCell(
                  <div className="pd-relation-marker-stack">
                    <span
                      className={`pd-relation-marker pd-relation-${prefix}-${relationIndex}-${markerSide}`}
                      data-relation-id={`pd-relation-${prefix}-${relationIndex}`}
                      data-relation-column={columnIndex}
                      title={`${relationTitle} ${relationLabel}`}
                    >
                      {markerElement}
                    </span>
                  </div>,
                  relationCellClass, undefined, column.key
                );
              })}
            </Fragment>
          );
        })}
      </>
    );
  };

  const renderFlowBoard = (boardKey, sectionTitle, items) => (
    <section className="pd-flow-board" aria-label={sectionTitle}>
      <div className="pd-flow-board-side">
        <div className="pd-flow-board-side-main">{sectionTitle}</div>
      </div>
      <div
        className="pd-flow-board-scroll"
        ref={(node) => {
          flowBoardScrollRefs.current[boardKey] = node;
        }}
      >
        <div
          className="pd-flow-board-columns"
          style={{ gridTemplateColumns: `repeat(${Math.max(items.length, 1)}, var(--pd-flow-column-width))` }}
        >
          {items.map((item) => (
              <button
                key={item.key}
                type="button"
                className={`pd-flow-column ${item.active ? "is-active" : ""}`.trim()}
                onClick={item.onClick}
                aria-label={`${sectionTitle} ${item.topPrimary} ${item.topSecondary} ${item.stem || ""}${item.branch || ""}`}
                aria-pressed={item.active}
                title={`${sectionTitle} ${item.topPrimary} ${item.topSecondary} ${item.tsuhen || ""} / ${item.branchTsuhen || ""}`}
              >
                <div className="pd-flow-column-top">
                  <div className="pd-flow-column-top-primary">{item.topPrimary}</div>
                  {item.topSecondary && <div className="pd-flow-column-top-secondary">{item.topSecondary}</div>}
                </div>
                <div className="pd-flow-column-bottom">
                  {renderPillarStack(item.stem, item.branch, item.tsuhen, item.branchTsuhen)}
                </div>
              </button>
          ))}
          {!items.length && <div className="pd-compact-empty">データなし</div>}
        </div>
      </div>
    </section>
  );

  const daiunItems = daiunSnapshots.map((item) => ({
    key: `daiun-${item.index}`,
    topPrimary: item.start_year ?? "-",
    topSecondary: item.start_age != null ? `${item.start_age}歳` : "",
    stem: item.tenkan,
    branch: item.chishi,
    tsuhen: item.kan_tsuhen,
    branchTsuhen: item.shi_tsuhen,
    active: item.index === selectedDaiunIndex,
    onClick: async () => {
      const nextYear = yearGroups[item.index]?.list?.[0]?.year ?? null;
      if (nextYear != null) {
        await loadSelection({ year: nextYear, daiunIndex: item.index });
      }
    },
  }));

  const yearItems = selectedYearList.map((item) => ({
    key: `year-${item.year}`,
    topPrimary: item.year,
    topSecondary: "",
    stem: item.kan?.element,
    branch: item.shi?.element,
    tsuhen: item.kan?.tsuhen,
    branchTsuhen: item.shi?.tsuhen || "",
    active: item.year === selectedYear,
    onClick: async () => {
      await loadSelection({ year: item.year });
    },
  }));

  const monthItems = (selection?.flowMonths?.items || []).map((item, index) => ({
    key: `month-${item.term}-${item.date}`,
    topPrimary: item.term,
    topSecondary: `${item.month}/${item.day}`,
    stem: item.tenkan,
    branch: item.chishi,
    tsuhen: item.kan_tsuhen,
    branchTsuhen: item.shi_tsuhen,
    active: index === selectedMonthIndex,
    onClick: async () => {
      await loadSelection({ year: selectedYear, monthIndex: index });
    },
  }));

  const dayItems = flowDays.map((item, index) => ({
    key: `day-${item.date}`,
    topPrimary: item.display,
    topSecondary: "",
    stem: item.tenkan,
    branch: item.chishi,
    tsuhen: item.kan_tsuhen,
    branchTsuhen: item.shi_tsuhen,
    active: index === resolvedDayIndex,
    onClick: () => selectDay(index),
  }));

  const scrollActiveFlowColumnIntoView = (boardKey) => {
    const scrollNode = flowBoardScrollRefs.current[boardKey];
    if (!scrollNode) return;

    const activeNode = scrollNode.querySelector(".pd-flow-column.is-active");
    if (!(activeNode instanceof HTMLElement)) return;

    const containerRect = scrollNode.getBoundingClientRect();
    const activeRect = activeNode.getBoundingClientRect();
    if (activeRect.left >= containerRect.left && activeRect.right <= containerRect.right) return;
    scrollNode.scrollTo({
      left: scrollNode.scrollLeft + activeRect.left - containerRect.left - (containerRect.width - activeRect.width) / 2,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  };

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => scrollActiveFlowColumnIntoView("daiun"));
    return () => window.cancelAnimationFrame(frameId);
  }, [selectedDaiunIndex, daiunItems.length]);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => scrollActiveFlowColumnIntoView("year"));
    return () => window.cancelAnimationFrame(frameId);
  }, [selectedYear, yearItems.length]);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => scrollActiveFlowColumnIntoView("month"));
    return () => window.cancelAnimationFrame(frameId);
  }, [selectedYear, selectedMonthIndex, monthItems.length]);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => scrollActiveFlowColumnIntoView("day"));
    return () => window.cancelAnimationFrame(frameId);
  }, [selectedYear, selectedMonthIndex, resolvedDayIndex, dayItems.length]);

  return (
    <div className="pd-compact-board">
      <div className="pd-compact-toolbar" aria-label="命式表示設定">
        <button type="button" aria-expanded={expandedFlowColumns} onClick={() => setExpandedFlowColumns((value) => !value)}>
          {expandedFlowColumns ? "流月・流日を閉じる" : "流月・流日を表示"}
        </button>
        {[["kan", "天干関係"], ["shi", "地支関係"]].map(([key, label]) => (
          <button key={key} type="button" aria-expanded={expandedRelations[key]}
            onClick={() => setExpandedRelations((current) => ({ ...current, [key]: !current[key] }))}>
            {label} {expandedRelations[key] ? "▴" : "▾"}
          </button>
        ))}
      </div>
      <section className="pd-grid-panel">
        <div className="pd-overview-scroll">
          <div className="pd-overview-relation-wrap">
            <div
              ref={overviewGridRef}
              className="pd-overview-grid"
              style={{ gridTemplateColumns: `44px repeat(${overviewColumns.length}, minmax(48px, 1fr))` }}
            >
              {renderOverviewCell("日期", "pd-overview-head pd-overview-side")}
              {mapOverviewColumns((column) => renderOverviewCell(column.label, "pd-overview-head"))}

              {renderOverviewCell("主星", "pd-overview-side")}
              {mapOverviewColumns((column) => renderOverviewCell(renderTopStarText(column.topStar), "pd-overview-star"))}

              {renderRelationOverviewRows(
                "天干関係",
                kanRelations,
                "kan",
                expandedRelations.kan,
                () => setExpandedRelations((current) => ({ ...current, kan: !current.kan }))
              )}

              {renderOverviewCell("天干", "pd-overview-side")}
              {mapOverviewColumns((column) =>
                renderOverviewCell(
                  renderElementOrBlank(
                    column.stem,
                    column.topStar,
                    "pd-overview-element-ruby",
                    buildInsightClickConfig(column.key, "stem", column.stem, column.topStar)
                  ),
                  "pd-overview-main"
                )
              )}

              {renderOverviewCell("地支", "pd-overview-side")}
              {mapOverviewColumns((column) =>
                renderOverviewCell(
                  renderElementOrBlank(
                    column.branch,
                    column.shi_tsuhen,
                    "pd-overview-element-ruby",
                    buildInsightClickConfig(column.key, "branch", column.branch, column.shi_tsuhen)
                  ),
                  "pd-overview-main"
                )
              )}

              {renderRelationOverviewRows(
                "地支関係",
                shiRelations,
                "shi",
                expandedRelations.shi,
                () => setExpandedRelations((current) => ({ ...current, shi: !current.shi }))
              )}

              {renderOverviewCell("蔵干", "pd-overview-side pd-overview-side-top")}
              {mapOverviewColumns((column) =>
                renderOverviewCell(
                  renderZoukanLines(column.zoukan, (part, symbol, tsuhen) =>
                    buildInsightClickConfig(column.key, part, symbol, tsuhen)
                  ),
                  "pd-overview-zoukan"
                )
              )}

              {renderOverviewCell("星運", "pd-overview-side")}
              {mapOverviewColumns((column) => renderOverviewCell(column.seiun || " "))}

              {renderOverviewCell("自坐", "pd-overview-side")}
              {mapOverviewColumns((column) => renderOverviewCell(column.jizuo || " "))}

              {renderOverviewCell("空亡", "pd-overview-side")}
              {mapOverviewColumns((column) => renderOverviewCell(column.kubou || " "))}

              {renderOverviewCell("納音", "pd-overview-side")}
              {mapOverviewColumns((column) => renderOverviewCell(column.nayin || " "))}
            </div>

            <svg
              className="pd-overview-relation-svg"
              width={relationSvgSize.width}
              height={relationSvgSize.height}
              viewBox={`0 0 ${relationSvgSize.width || 1} ${relationSvgSize.height || 1}`}
              aria-hidden="true"
            >
              {relationLines.map((line) => {
                const firstPoint = line.points[0];
                const lastPoint = line.points[line.points.length - 1];
                const midX = (firstPoint.x + lastPoint.x) / 2;
                const midY = (firstPoint.y + lastPoint.y) / 2;
                const labelWidth = Math.max(36, String(line.label || "").length * 12 + 12);
                return (
                  <g key={line.key}>
                    {line.points.slice(0, -1).map((point, pointIndex) => {
                      const nextPoint = line.points[pointIndex + 1];
                      return (
                        <line
                          key={`${line.key}-segment-${pointIndex}`}
                          x1={point.x}
                          y1={point.y}
                          x2={nextPoint.x}
                          y2={nextPoint.y}
                          className="pd-overview-relation-line"
                        />
                      );
                    })}
                    <rect
                      x={midX - labelWidth / 2}
                      y={midY - 9}
                      width={labelWidth}
                      height="18"
                      rx="4"
                      className="pd-overview-relation-label-bg"
                    />
                    <text x={midX} y={midY} className="pd-overview-relation-label">
                      {line.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      </section>

      <div className="pd-compact-summary">
        <div className="pd-compact-start">
          起運: 出生後{data?.ritsun_time?.year ?? 0}年{data?.ritsun_time?.month ?? 0}ヶ月
          <span>{data?.ritsun_time?.unjun_type === 0 ? "逆行運" : "順行運"}</span>
        </div>
        <label className="pd-compact-date">
          選択日
          <select aria-label="選択日" value={currentFlowDay?.date || ""}
            disabled={!flowDays.length}
            onChange={(event) => {
              const index = flowDays.findIndex((item) => item.date === event.target.value);
              if (index >= 0) selectDay(index);
            }}>
            {flowDays.map((item) => <option key={item.date} value={item.date}>{formatDate(item.date)}</option>)}
          </select>
        </label>
        <button type="button" onClick={handleSelectToday}>今日</button>
        <span role="status">{loadingSelection ? "読込中…" : ""}</span>
      </div>
      {selectionError && <div className="pd-compact-error" role="alert">
        読み込めませんでした。選択は変更されていません。
        <button type="button" onClick={() => loadSelection(selectionError)}>再試行</button>
      </div>}
      {renderFlowBoard("daiun", "大運", daiunItems)}
      {renderFlowBoard("year", "流年", yearItems)}
      {renderFlowBoard("month", "流月", monthItems)}
      {renderFlowBoard("day", "流日", dayItems)}
    </div>
  );
}
