import React, { useEffect, useMemo, useRef, useState } from "react";
import api from "../../api";
import Element from "../../components/Element";

const EMPTY_FLOW_ITEMS = { current_index: 0, items: [] };

const formatDate = (value) => {
  if (!value) return "-";
  return value.replace(/-/g, "/");
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

const renderElementRuby = (value, tsuhen = "", className = "") => (
  <div className={`pd-element-slot ${className}`.trim()}>
    <Element name={value || "・"} tsuhen={tsuhen || ""} />
  </div>
);

const renderTsuhenOnlyRuby = (value, className = "") =>
  value ? (
    <ruby className={`text-element pd-tsuhen-only-ruby ${className}`.trim()}>
      <span>・</span>
      <rt className="vt">{value}</rt>
    </ruby>
  ) : (
    " "
  );

const renderZoukanLines = (zoukan = []) => (
  <div className="pd-board-zoukan">
    {[2, 1, 0].map((index) => {
      const item = zoukan[index] || {};
      return (
        <div key={`zoukan-${index}`} className="pd-board-zoukan-line">
          {renderElementOrBlank(item.element, item.tsuhen, "pd-zoukan-element-ruby")}
        </div>
      );
    })}
  </div>
);

const renderPillarStack = (stem, branch, tsuhen, branchTsuhen) => (
  <div className="pd-flow-column-stack">
    <div className="pd-flow-column-main">{renderElementOrBlank(stem, tsuhen, "pd-flow-element-ruby")}</div>
    <div className="pd-flow-column-main">{renderElementOrBlank(branch, branchTsuhen, "pd-flow-element-ruby")}</div>
  </div>
);

const renderOverviewCell = (content, className = "") => (
  <div className={`pd-overview-cell ${className}`.trim()}>{content}</div>
);

const renderElementOrBlank = (value, tsuhen = "", className = "") =>
  value ? (
    renderElementRuby(value, tsuhen, className)
  ) : (
    <div className={`pd-element-slot ${className}`.trim()}>
      <span className="pd-element-empty" aria-hidden="true" />
    </div>
  );

const renderTopStarText = (value, className = "") => (
  <div className={`pd-top-star-text ${className}`.trim()}>{value || " "}</div>
);

const padFlowItems = (items, targetLength, prefix) => {
  const padded = [...items];
  while (padded.length < targetLength) {
    padded.push({
      key: `${prefix}-placeholder-${padded.length}`,
      topPrimary: "",
      topSecondary: "",
      stem: "",
      branch: "",
      tsuhen: "",
      branchTsuhen: "",
      active: false,
      placeholder: true,
    });
  }
  return padded;
};

export default function PrecisionMeishikiBoard({ data, requestInput }) {
  const precision = data?.precision_chart;
  const natal = precision?.natal || {};
  const yearGroups = data?.daiun_table?.year_table || [];
  const daiunSnapshots = precision?.daiun_snapshots || [];
  const initialSelection = useMemo(() => normalizeSelectionPayload(precision), [precision]);

  const [selectedDaiunIndex, setSelectedDaiunIndex] = useState(precision?.active_daiun?.index ?? 0);
  const [selectedYear, setSelectedYear] = useState(initialSelection.flowYearValue);
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(initialSelection.selectedMonthIndex);
  const [selectedDayIndex, setSelectedDayIndex] = useState(initialSelection.selectedDayIndex);
  const [selection, setSelection] = useState(initialSelection);
  const [loadingSelection, setLoadingSelection] = useState(false);
  const flowBoardScrollRefs = useRef({});

  useEffect(() => {
    const nextSelection = normalizeSelectionPayload(precision);
    setSelection(nextSelection);
    setSelectedDaiunIndex(precision?.active_daiun?.index ?? 0);
    setSelectedYear(nextSelection.flowYearValue);
    setSelectedMonthIndex(nextSelection.selectedMonthIndex);
    setSelectedDayIndex(nextSelection.selectedDayIndex);
  }, [precision]);

  const selectedYearList = useMemo(
    () => yearGroups[selectedDaiunIndex]?.list || [],
    [selectedDaiunIndex, yearGroups]
  );

  useEffect(() => {
    if (!precision) return;
    if (selectedYear == null) return;
    if (!selectedYearList.length) return;
    if (selectedYearList.some((item) => item.year === selectedYear)) return;
    const fallbackYear = selectedYearList[0].year;
    void loadYearSelection(fallbackYear);
  }, [precision, selectedYear, selectedYearList]);

  const fetchPrecisionSelection = async ({ year, monthIndex, dayIndex }) => {
    if (!requestInput?.date || !requestInput?.time || year == null) return null;

    setLoadingSelection(true);
    try {
      const res = await api.post("/api/precision-flow", {
        date: requestInput.date,
        time: requestInput.time,
        gender: requestInput.gender,
        year,
        month_index: monthIndex,
        day_index: dayIndex,
      });
      return normalizeSelectionPayload(res.data || {});
    } catch (err) {
      console.error(err);
      return null;
    } finally {
      setLoadingSelection(false);
    }
  };

  const loadYearSelection = async (year) => {
    const payload = await fetchPrecisionSelection({ year, monthIndex: 0, dayIndex: 0 });
    if (!payload) return;

    setSelection((current) => ({
      ...current,
      flowYearValue: payload.flowYearValue,
      flowYear: payload.flowYear,
      flowMonths: payload.flowMonths,
      flowMonth: payload.flowMonth,
      flowDays: EMPTY_FLOW_ITEMS,
      flowDay: null,
      selectedMonthIndex: payload.selectedMonthIndex ?? 0,
      selectedDayIndex: 0,
    }));
    setSelectedYear(payload.flowYearValue);
    setSelectedMonthIndex(payload.selectedMonthIndex ?? 0);
    setSelectedDayIndex(0);
  };

  const loadMonthSelection = async (year, monthIndex) => {
    const payload = await fetchPrecisionSelection({ year, monthIndex, dayIndex: 0 });
    if (!payload) return;

    setSelection((current) => ({
      ...current,
      flowYearValue: payload.flowYearValue,
      flowYear: payload.flowYear,
      flowMonths: payload.flowMonths,
      flowMonth: payload.flowMonth,
      flowDays: payload.flowDays,
      flowDay: payload.flowDay,
      selectedMonthIndex: payload.selectedMonthIndex ?? monthIndex ?? 0,
      selectedDayIndex: payload.selectedDayIndex ?? 0,
    }));
    setSelectedYear(payload.flowYearValue);
    setSelectedMonthIndex(payload.selectedMonthIndex ?? monthIndex ?? 0);
    setSelectedDayIndex(payload.selectedDayIndex ?? 0);
  };

  const currentDaiun = daiunSnapshots[selectedDaiunIndex] || precision?.active_daiun || null;
  const selectedYearInfo = selectedYearList.find((item) => item.year === selectedYear) || null;
  const flowDays = selection?.flowDays?.items || [];
  const resolvedDayIndex = flowDays.length ? Math.min(selectedDayIndex, flowDays.length - 1) : 0;
  const currentFlowDay = flowDays[resolvedDayIndex] || selection?.flowDay || null;
  const currentSelectionSnapshot = normalizeSelectionPayload(precision);

  const handleSelectToday = () => {
    setSelection(currentSelectionSnapshot);
    setSelectedDaiunIndex(precision?.active_daiun?.index ?? 0);
    setSelectedYear(currentSelectionSnapshot.flowYearValue);
    setSelectedMonthIndex(currentSelectionSnapshot.selectedMonthIndex);
    setSelectedDayIndex(currentSelectionSnapshot.selectedDayIndex);
  };

  const daiunTitle = `大運表・${data?.ritsun_time?.year ?? 0}年${data?.ritsun_time?.month ?? 0}ヶ月立運「${
    data?.ritsun_time?.unjun_type === 0 ? "逆行運" : "順行運"
  }」`;

  const overviewColumns = [
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
  ];

  const renderFlowBoard = (boardKey, sectionTitle, topLabel, sideLabel, items, extraClass = "") => (
    <section className={`pd-flow-board ${extraClass}`.trim()}>
      <div className="pd-flow-board-side">
        <div className="pd-flow-board-side-top">{topLabel}</div>
        <div className="pd-flow-board-side-main">{sideLabel}</div>
      </div>
      <div
        className="pd-flow-board-scroll"
        ref={(node) => {
          flowBoardScrollRefs.current[boardKey] = node;
        }}
      >
        <div
          className="pd-flow-board-columns"
          style={{
            gridTemplateColumns: `repeat(${flowBoardColumnCount}, minmax(0, 1fr))`,
            width: `${(Math.max(flowBoardColumnCount, 10) / 10) * 76}%`,
          }}
        >
          {items.map((item) => (
            item.placeholder ? (
              <div key={item.key} className="pd-flow-column pd-flow-column-placeholder" aria-hidden="true">
                <div className="pd-flow-column-top">
                  <div className="pd-flow-column-top-primary">&nbsp;</div>
                  <div className="pd-flow-column-top-secondary">&nbsp;</div>
                </div>
                <div className="pd-flow-column-bottom">
                  <div className="pd-flow-column-stack pd-flow-column-stack-placeholder">&nbsp;</div>
                </div>
              </div>
            ) : (
              <button
                key={item.key}
                type="button"
                className={`pd-flow-column ${item.active ? "is-active" : ""}`.trim()}
                onClick={item.onClick}
                title={sectionTitle}
              >
                <div className="pd-flow-column-top">
                  <div className="pd-flow-column-top-primary">{item.topPrimary}</div>
                  <div className="pd-flow-column-top-secondary">{item.topSecondary || " "}</div>
                </div>
                <div className="pd-flow-column-bottom">
                  {renderPillarStack(item.stem, item.branch, item.tsuhen, item.branchTsuhen)}
                </div>
              </button>
            )
          ))}
        </div>
      </div>
    </section>
  );

  const daiunItems = daiunSnapshots.map((item) => ({
    key: `daiun-${item.index}`,
    topPrimary: item.start_age ?? "-",
    topSecondary: item.start_year ?? "-",
    stem: item.tenkan,
    branch: item.chishi,
    tsuhen: item.kan_tsuhen,
    branchTsuhen: item.shi_tsuhen,
    active: item.index === selectedDaiunIndex,
    onClick: async () => {
      const nextYear = yearGroups[item.index]?.list?.[0]?.year ?? null;
      setSelectedDaiunIndex(item.index);
      if (nextYear != null) {
        await loadYearSelection(nextYear);
      }
    },
  }));

  const yearItems = selectedYearList.map((item) => ({
    key: `year-${item.year}`,
    topPrimary: item.year,
    topSecondary: item.age != null ? `${item.age}歳` : "",
    stem: item.kan?.element,
    branch: item.shi?.element,
    tsuhen: item.kan?.tsuhen,
    branchTsuhen: item.shi?.tsuhen || "",
    active: item.year === selectedYear,
    onClick: async () => {
      await loadYearSelection(item.year);
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
      await loadMonthSelection(selectedYear, index);
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
    onClick: () => {
      setSelectedDayIndex(index);
      setSelection((current) => ({
        ...current,
        flowDay: item,
        selectedDayIndex: index,
      }));
    },
  }));

  const flowBoardColumnCount = Math.max(
    daiunItems.length,
    yearItems.length,
    monthItems.length,
    dayItems.length,
    1
  );

  const alignedDaiunItems = padFlowItems(daiunItems, flowBoardColumnCount, "daiun");
  const alignedYearItems = padFlowItems(yearItems, flowBoardColumnCount, "year");
  const alignedMonthItems = padFlowItems(monthItems, flowBoardColumnCount, "month");
  const alignedDayItems = padFlowItems(dayItems, flowBoardColumnCount, "day");

  const scrollActiveFlowColumnIntoView = (boardKey) => {
    const scrollNode = flowBoardScrollRefs.current[boardKey];
    if (!scrollNode) return;

    const activeNode = scrollNode.querySelector(".pd-flow-column.is-active");
    if (!(activeNode instanceof HTMLElement)) return;

    activeNode.focus({ preventScroll: true });
    activeNode.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  };

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => scrollActiveFlowColumnIntoView("daiun"));
    return () => window.cancelAnimationFrame(frameId);
  }, [selectedDaiunIndex, alignedDaiunItems.length]);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => scrollActiveFlowColumnIntoView("year"));
    return () => window.cancelAnimationFrame(frameId);
  }, [selectedYear, alignedYearItems.length]);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => scrollActiveFlowColumnIntoView("month"));
    return () => window.cancelAnimationFrame(frameId);
  }, [selectedMonthIndex, alignedMonthItems.length]);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => scrollActiveFlowColumnIntoView("day"));
    return () => window.cancelAnimationFrame(frameId);
  }, [resolvedDayIndex, alignedDayItems.length]);

  return (
    <>
      <section className="pd-grid-panel">
        <div className="pd-overview-scroll">
          <div
            className="pd-overview-grid"
            style={{ gridTemplateColumns: `78px repeat(${overviewColumns.length}, minmax(82px, 1fr))` }}
          >
            {renderOverviewCell("項目", "pd-overview-head")}
            {overviewColumns.map((column) => renderOverviewCell(column.label, "pd-overview-head"))}

            {renderOverviewCell("主星", "pd-overview-side")}
            {overviewColumns.map((column) => renderOverviewCell(renderTopStarText(column.topStar), "pd-overview-star"))}

            {renderOverviewCell("天干", "pd-overview-side")}
            {overviewColumns.map((column) =>
              renderOverviewCell(
                renderElementOrBlank(column.stem, column.topStar, "pd-overview-element-ruby"),
                "pd-overview-main"
              )
            )}

            {renderOverviewCell("地支", "pd-overview-side")}
            {overviewColumns.map((column) =>
              renderOverviewCell(
                renderElementOrBlank(column.branch, column.shi_tsuhen, "pd-overview-element-ruby"),
                "pd-overview-main"
              )
            )}

            {renderOverviewCell("蔵干", "pd-overview-side pd-overview-side-top")}
            {overviewColumns.map((column) => renderOverviewCell(renderZoukanLines(column.zoukan), "pd-overview-zoukan"))}

            {renderOverviewCell("星運", "pd-overview-side")}
            {overviewColumns.map((column) => renderOverviewCell(column.seiun || " "))}

            {renderOverviewCell("自坐", "pd-overview-side")}
            {overviewColumns.map((column) => renderOverviewCell(column.jizuo || " "))}

            {renderOverviewCell("空亡", "pd-overview-side")}
            {overviewColumns.map((column) => renderOverviewCell(column.kubou || " "))}

            {renderOverviewCell("納音", "pd-overview-side")}
            {overviewColumns.map((column) => renderOverviewCell(column.nayin || " "))}
          </div>
        </div>
      </section>

      <section className="pd-flow-cluster">
        <div className="pd-grid-head">
          <div className="pd-grid-head-main">
            <div className="pd-grid-title">{daiunTitle}</div>
            <div className="pd-meishiki-summary">
              <div className="pd-meishiki-current pd-meishiki-date-wrap">
                <span className="pd-meishiki-date-label">日期:</span>
                <select
                  className="pd-meishiki-date-select"
                  value={currentFlowDay?.date || ""}
                  onChange={(e) => {
                    const nextIndex = flowDays.findIndex((item) => item.date === e.target.value);
                    if (nextIndex >= 0) {
                      setSelectedDayIndex(nextIndex);
                      setSelection((current) => ({
                        ...current,
                        flowDay: flowDays[nextIndex],
                        selectedDayIndex: nextIndex,
                      }));
                    }
                  }}
                  disabled={!flowDays.length}
                >
                  {flowDays.map((item) => (
                    <option key={item.date} value={item.date}>
                      {formatDate(item.date)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="pd-meishiki-current">
                起運: 出生後{data?.ritsun_time?.year ?? 0}年{data?.ritsun_time?.month ?? 0}ヶ月
              </div>
              <div className="pd-meishiki-current">
                選択: {selectedYear || "-"}年 / {selection?.flowMonth?.term || "-"} / {currentFlowDay?.display || "-"}
              </div>
              {loadingSelection ? <div className="pd-meishiki-current">読込中…</div> : null}
            </div>
          </div>
          <button type="button" className="pd-action-button pd-meishiki-today" onClick={handleSelectToday}>
            今日
          </button>
        </div>
        {renderFlowBoard("daiun", "大運", "歳", "大運", alignedDaiunItems, "pd-flow-board-first")}
      </section>
      {renderFlowBoard("year", "流年", "年", "流年", alignedYearItems)}
      {renderFlowBoard("month", "流月", "節", "流月", alignedMonthItems)}
      {renderFlowBoard("day", "流日", "日", "流日", alignedDayItems)}

      <div className="pd-flow-footnote">
        {currentDaiun ? `現在大運: ${currentDaiun.kanshi} / ${currentDaiun.start_year ?? "-"}年開始` : null}
        {selectedYearInfo ? ` / 選択流年: ${selectedYearInfo.year}年` : null}
        {selection?.flowMonth ? ` / 選択流月: ${selection.flowMonth.term} (${formatDate(selection.flowMonth.date)})` : null}
      </div>
    </>
  );
}
