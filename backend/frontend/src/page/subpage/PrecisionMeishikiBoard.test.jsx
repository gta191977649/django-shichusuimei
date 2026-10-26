import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import api from "../../api";
import PrecisionMeishikiBoard from "./PrecisionMeishikiBoard";

vi.mock("../../api", () => ({ default: { post: vi.fn() } }));

const pillar = (tenkan = "甲", chishi = "子") => ({
  tenkan, chishi, kan_tsuhen: "偏財", shi_tsuhen: "正印",
  zoukan: [{ element: "癸", tsuhen: "傷官" }, {}, { element: "甲", tsuhen: "偏財" }],
  seiun: "長生", jizuo: "帝旺", kubou: "寅卯", nayin: "海中金",
});
const payload = (year = 2026, monthIndex = 0) => {
  const months = ["立春", "驚蟄"].map((term, index) => ({
    ...pillar(index ? "乙" : "甲", "寅"), term, month: index + 2, day: 4,
    date: `${year}-0${index + 2}-04`,
  }));
  const days = [4, 5, 6].map((day) => ({
    ...pillar("丙", "午"), date: `${year}-0${monthIndex + 2}-0${day}`, display: `${monthIndex + 2}/${day}`,
  }));
  return {
    flow_year_value: year, flow_year: pillar(year === 2027 ? "丁" : "丙", "午"),
    flow_months: { current_index: monthIndex, items: months }, flow_month: months[monthIndex],
    flow_days: { current_index: 0, items: days }, flow_day: days[0],
    selected_month_index: monthIndex, selected_day_index: 0,
  };
};
const fixture = () => ({
  tenkan: ["丁", "壬", "庚", "辛"], chishi: ["丑", "寅", "辰", "巳"],
  junshi: { tenkan: ["正官", "食神", "日元", "劫財"] }, juniunshi: ["墓", "絶", "養", "長生"],
  ritsun_time: { year: 1, month: 1, unjun_type: 0 },
  daiun_table: { year_table: [2026, 2036].map((start) => ({
    list: Array.from({ length: 10 }, (_, index) => ({
      year: start + index, age: start + index - 1997,
      kan: { element: "丙", tsuhen: "七殺" }, shi: { element: "午", tsuhen: "正官" },
    })),
  })) },
  precision_chart: {
    ...payload(), active_daiun: { index: 0 },
    daiun_snapshots: [2026, 2036].map((start_year, index) => ({
      ...pillar("己", "亥"), index, start_year, start_age: start_year - 1997,
    })),
    natal: Object.fromEntries(["year", "month", "day", "time"].map((key) => [key, pillar()])),
  },
});
const requestInput = { date: "1997-02-07", time: "09:47", gender: 1 };
const setup = (props = {}) => render(<PrecisionMeishikiBoard data={fixture()} requestInput={requestInput} {...props} />);
const region = (name) => within(screen.getByRole("region", { name }));
const selected = (name) => region(name).getByRole("button", { pressed: true }).getAttribute("aria-label");
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
};

describe("compact precision board", () => {
  beforeEach(() => vi.clearAllMocks());

  it("defaults to six pillars, expands to eight without clearing the selected day, and has no padded flow columns", () => {
    const { container } = setup();
    const headers = () => [...container.querySelectorAll(".pd-overview-head")].map((node) => node.textContent);
    expect(headers()).toEqual(["日期", "流年", "大運", "年柱", "月柱", "日柱", "時柱"]);
    expect(region("大運").getAllByRole("button")).toHaveLength(2);
    expect(region("流年").getAllByRole("button")).toHaveLength(10);
    expect(region("流月").getAllByRole("button")).toHaveLength(2);
    expect(region("流日").getAllByRole("button")).toHaveLength(3);
    fireEvent.click(region("流日").getByRole("button", { name: /2\/5/ }));
    fireEvent.click(screen.getByRole("button", { name: "流月・流日を表示" }));
    expect(headers().slice(1, 3)).toEqual(["流日", "流月"]);
    fireEvent.click(screen.getByRole("button", { name: "流月・流日を閉じる" }));
    expect(headers()).toHaveLength(7);
    expect(screen.getByLabelText("選択日").value).toBe("2026-02-05");
  });

  it("uses compact single-character flow stars, keeps their full names in tooltips and omits year ages", () => {
    setup();
    const daiun = screen.getByRole("region", { name: "大運" }).querySelector("button");
    expect([...daiun.querySelectorAll("rt")].map((node) => node.textContent)).toEqual(["才", "印"]);
    expect(daiun.title).toContain("偏財 / 正印");
    expect(daiun.querySelector(".pd-flow-column-top-secondary").textContent).toBe("29歳");
    const year = screen.getByRole("region", { name: "流年" }).querySelector("button");
    expect(year.querySelector(".pd-flow-column-top-secondary")).toBeNull();
    expect([...year.querySelectorAll("rt")].map((node) => node.textContent)).toEqual(["殺", "官"]);
  });

  it("commits daiun, year, month and day selection together and resets with today", async () => {
    setup();
    api.post.mockImplementation((_url, input) => Promise.resolve({ data: payload(input.year, input.month_index) }));
    fireEvent.click(region("大運").getByRole("button", { name: /2036/ }));
    await waitFor(() => expect(selected("大運")).toContain("2036"));
    expect(selected("流年")).toContain("2036");
    fireEvent.click(region("流年").getByRole("button", { name: /2037/ }));
    await waitFor(() => expect(selected("流年")).toContain("2037"));
    fireEvent.click(region("流月").getByRole("button", { name: /驚蟄/ }));
    await waitFor(() => expect(selected("流月")).toContain("驚蟄"));
    fireEvent.click(region("流日").getByRole("button", { name: /3\/6/ }));
    expect(screen.getByLabelText("選択日").value).toBe("2037-03-06");
    expect(api.post).toHaveBeenLastCalledWith("/api/precision-flow", expect.objectContaining({ year: 2037, month_index: 1, day_index: 0 }));
    fireEvent.click(screen.getByRole("button", { name: "今日" }));
    expect(selected("大運")).toContain("2026");
    expect(screen.getByLabelText("選択日").value).toBe("2026-02-04");
  });

  it("keeps the committed selection after failure and retries the requested daiun", async () => {
    setup();
    api.post.mockRejectedValueOnce(new Error("offline"));
    fireEvent.click(region("大運").getByRole("button", { name: /2036/ }));
    await screen.findByRole("alert");
    expect(selected("大運")).toContain("2026");
    expect(selected("流年")).toContain("2026");
    api.post.mockResolvedValueOnce({ data: payload(2036) });
    fireEvent.click(screen.getByRole("button", { name: "再試行" }));
    await waitFor(() => expect(selected("大運")).toContain("2036"));
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("ignores stale responses and failures after a newer request", async () => {
    setup();
    const first = deferred(), second = deferred();
    api.post.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    fireEvent.click(region("流年").getByRole("button", { name: /2027/ }));
    fireEvent.click(region("流年").getByRole("button", { name: /2028/ }));
    await act(async () => second.resolve({ data: payload(2028) }));
    expect(selected("流年")).toContain("2028");
    await act(async () => first.reject(new Error("stale failure")));
    expect(selected("流年")).toContain("2028");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it.each(["today", "day", "profile"])("invalidates pending requests on %s changes", async (action) => {
    const data = fixture();
    const view = setup({ data });
    const pending = deferred();
    api.post.mockReturnValueOnce(pending.promise);
    fireEvent.click(region("流年").getByRole("button", { name: /2027/ }));
    if (action === "today") fireEvent.click(screen.getByRole("button", { name: "今日" }));
    if (action === "day") fireEvent.change(screen.getByLabelText("選択日"), { target: { value: "2026-02-05" } });
    if (action === "profile") view.rerender(<PrecisionMeishikiBoard data={fixture()} requestInput={requestInput} />);
    await act(async () => pending.resolve({ data: payload(2027) }));
    expect(selected("流年")).toContain("2026");
    expect(screen.getByLabelText("選択日").value).toBe(action === "day" ? "2026-02-05" : "2026-02-04");
  });

  it("does not allow an older successful response to replace the latest selection", async () => {
    setup();
    const first = deferred(), second = deferred();
    api.post.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    fireEvent.click(region("流年").getByRole("button", { name: /2027/ }));
    fireEvent.click(region("流年").getByRole("button", { name: /2028/ }));
    await act(async () => second.resolve({ data: payload(2028) }));
    await act(async () => first.resolve({ data: payload(2027) }));
    expect(selected("流年")).toContain("2028");
    expect(screen.getByLabelText("選択日").value).toBe("2028-02-04");
  });

  it("scrolls only the selected strip without stealing keyboard focus", async () => {
    setup();
    api.post.mockResolvedValueOnce({ data: payload(2027) });
    const strip = screen.getByRole("region", { name: "流年" }).querySelector(".pd-flow-board-scroll");
    const button = region("流年").getByRole("button", { name: /2027/ });
    vi.spyOn(strip, "getBoundingClientRect").mockReturnValue({ left: 0, right: 100, width: 100 });
    vi.spyOn(button, "getBoundingClientRect").mockReturnValue({ left: 600, right: 672, width: 72 });
    button.focus();
    fireEvent.click(button);
    await waitFor(() => expect(strip.scrollTo).toHaveBeenCalledWith({ left: 586, behavior: "smooth" }));
    expect(document.activeElement).toBe(button);
  });

  it("preserves natal insight payloads and suppresses unknown time triggers", () => {
    const data = fixture();
    data.tenkan[3] = "不明";
    data.chishi[3] = "不明";
    data.precision_chart.natal.time = {};
    const onElementClick = vi.fn();
    const { container } = setup({ data, onElementClick, elementInsightsAvailable: true });
    fireEvent.click(screen.getByRole("button", { name: "AI 命式要素解読: year.stem" }));
    expect(onElementClick).toHaveBeenLastCalledWith(expect.objectContaining({ key: "year.stem", symbol: "丁", available: true }));
    fireEvent.click(screen.getByRole("button", { name: "AI 命式要素解読: year.hidden_primary" }));
    expect(onElementClick).toHaveBeenLastCalledWith(expect.objectContaining({ key: "year.hidden_primary", symbol: "甲" }));
    expect(screen.queryByRole("button", { name: "AI 命式要素解読: time.stem" })).toBeNull();
    expect(container.querySelectorAll(".pd-overview-main")[5].textContent).toContain("？");
  });

  it("recalculates expanded relations against visible columns and keeps keyboard focus", () => {
    const { container } = setup();
    const toggle = screen.getByRole("button", { name: /天干関係/ });
    toggle.focus();
    fireEvent.click(toggle);
    const before = container.querySelectorAll("[data-relation-column]").length;
    expect(before).toBeGreaterThan(0);
    expect(document.activeElement).toBe(toggle);
    fireEvent.click(screen.getByRole("button", { name: "流月・流日を表示" }));
    expect(container.querySelectorAll("[data-relation-column]").length).toBeGreaterThan(before);
  });
});
