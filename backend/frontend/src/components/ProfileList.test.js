import { describe, expect, it } from "vitest";
import { getZodiacSign } from "./ProfileList";

describe("getZodiacSign", () => {
  it("判定8月6日为獅子座", () => {
    expect(getZodiacSign("2025-08-06")).toMatchObject({ name: "獅子座", symbol: "♌", element: "fire" });
  });

  it("在12个星座的通常切替日正确切换", () => {
    const boundaries = [
      ["2025-01-20", "水瓶座"],
      ["2025-02-19", "魚座"],
      ["2025-03-21", "牡羊座"],
      ["2025-04-20", "牡牛座"],
      ["2025-05-21", "双子座"],
      ["2025-06-21", "蟹座"],
      ["2025-07-23", "獅子座"],
      ["2025-08-23", "乙女座"],
      ["2025-09-23", "天秤座"],
      ["2025-10-23", "蠍座"],
      ["2025-11-22", "射手座"],
      ["2025-12-22", "山羊座"],
      ["2025-01-19", "山羊座"],
    ];

    boundaries.forEach(([date, expected]) => {
      expect(getZodiacSign(date).name).toBe(expected);
    });
  });

  it("12个星座的名称、符号和四元素映射一致", () => {
    const cases = [
      ["2025-01-10", "山羊座", "♑", "earth"],
      ["2025-01-25", "水瓶座", "♒", "air"],
      ["2025-02-25", "魚座", "♓", "water"],
      ["2025-03-25", "牡羊座", "♈", "fire"],
      ["2025-04-25", "牡牛座", "♉", "earth"],
      ["2025-05-25", "双子座", "♊", "air"],
      ["2025-06-25", "蟹座", "♋", "water"],
      ["2025-07-25", "獅子座", "♌", "fire"],
      ["2025-08-25", "乙女座", "♍", "earth"],
      ["2025-09-25", "天秤座", "♎", "air"],
      ["2025-10-25", "蠍座", "♏", "water"],
      ["2025-11-25", "射手座", "♐", "fire"],
    ];

    cases.forEach(([date, name, symbol, element]) => {
      const zodiac = getZodiacSign(date);
      expect(zodiac).toMatchObject({ name, symbol, element });
      expect(zodiac.icon).toBeTypeOf("function");
    });
  });
});
