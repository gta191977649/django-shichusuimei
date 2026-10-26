/* eslint-disable react/prop-types */
import {
  TbZodiacAquarius,
  TbZodiacAries,
  TbZodiacCancer,
  TbZodiacCapricorn,
  TbZodiacGemini,
  TbZodiacLeo,
  TbZodiacLibra,
  TbZodiacPisces,
  TbZodiacSagittarius,
  TbZodiacScorpio,
  TbZodiacTaurus,
  TbZodiacVirgo,
} from "react-icons/tb";
import { LuCircleHelp } from "react-icons/lu";
import { getBirthTimeDisplay } from "../lib/birthTime";

const ZODIAC_SIGNS = [
  ["水瓶座", "♒", 120, "air", TbZodiacAquarius],
  ["魚座", "♓", 219, "water", TbZodiacPisces],
  ["牡羊座", "♈", 321, "fire", TbZodiacAries],
  ["牡牛座", "♉", 420, "earth", TbZodiacTaurus],
  ["双子座", "♊", 521, "air", TbZodiacGemini],
  ["蟹座", "♋", 621, "water", TbZodiacCancer],
  ["獅子座", "♌", 723, "fire", TbZodiacLeo],
  ["乙女座", "♍", 823, "earth", TbZodiacVirgo],
  ["天秤座", "♎", 923, "air", TbZodiacLibra],
  ["蠍座", "♏", 1023, "water", TbZodiacScorpio],
  ["射手座", "♐", 1122, "fire", TbZodiacSagittarius],
  ["山羊座", "♑", 1222, "earth", TbZodiacCapricorn],
];

const ELEMENT_LABELS = { air: "風", water: "水", earth: "土", fire: "火", unknown: "" };
const FIVE_ELEMENT_BY_SYMBOL = {
  甲: "wood", 乙: "wood", 寅: "wood", 卯: "wood",
  丙: "fire", 丁: "fire", 巳: "fire", 午: "fire",
  戊: "earth", 己: "earth", 辰: "earth", 戌: "earth", 丑: "earth", 未: "earth",
  庚: "metal", 辛: "metal", 申: "metal", 酉: "metal",
  壬: "water", 癸: "water", 亥: "water", 子: "water",
};

const getFiveElementClass = (symbol) => FIVE_ELEMENT_BY_SYMBOL[symbol] || "unknown";

export const getZodiacSign = (birthDate) => {
  const match = String(birthDate || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return { name: "星座", symbol: "☆", element: "unknown", elementLabel: "", icon: LuCircleHelp };

  const monthDay = Number(match[2]) * 100 + Number(match[3]);
  const sign = ZODIAC_SIGNS.reduce(
    (current, candidate) => (monthDay >= candidate[2] ? candidate : current),
    ZODIAC_SIGNS[ZODIAC_SIGNS.length - 1]
  );
  return { name: sign[0], symbol: sign[1], element: sign[3], elementLabel: ELEMENT_LABELS[sign[3]], icon: sign[4] };
};

export const ZodiacIcon = ({ zodiac, className = "" }) => {
  const Icon = zodiac?.icon || LuCircleHelp;
  return <Icon className={className} aria-hidden="true" focusable="false" />;
};

export const formatProfileDate = (birthDate) => {
  const match = String(birthDate || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `陽暦${match[1]}年${match[2]}月${match[3]}日` : "誕生日未設定";
};

const getProfileTimeLabel = (profile) => {
  if (profile.birthTimeUnknown) return "出生時刻不明";
  const time = String(profile.birthDate || "").slice(11, 16);
  return time ? `${getBirthTimeDisplay(time, false)}（真太陽時）` : "出生時刻未設定";
};

export const ProfileList = ({
  profiles,
  activeProfileId,
  onSelect,
  loading = false,
  chartData = {},
  emptyText = "プロフィールがありません。",
}) => (
  <div className="profile-choice-list">
    {loading ? <div className="profile-choice-state">読み込み中...</div> : null}
    {!loading && profiles.length === 0 ? <div className="profile-choice-state">{emptyText}</div> : null}
    {profiles.map((item) => {
      const zodiac = getZodiacSign(item.birthDate);
      const chart = chartData[item.id];
      const pillars = chart?.tenkan?.map((stem, index) => ({
        stem: stem || "・",
        branch: chart.chishi?.[index] || "・",
      })) || [];
      return (
        <button
          key={item.id}
          type="button"
          className={`profile-choice-item${item.id === activeProfileId ? " is-active" : ""}`}
          onClick={() => onSelect(item)}
        >
          <span className="profile-choice-copy">
            <span className="profile-choice-name">
              {item.name || "名称未設定"}
              <span
                className={`profile-choice-gender-icon ${item.gender === "F" ? "is-female" : "is-male"}`}
                aria-label={item.gender === "F" ? "女性" : "男性"}
              >
                {item.gender === "F" ? "♀" : "♂"}
              </span>
            </span>
            <span className="profile-choice-date">{formatProfileDate(item.birthDate)}</span>
            <span className="profile-choice-time">{getProfileTimeLabel(item)}</span>
          </span>
          <span className="profile-choice-pillars" aria-label="四柱">
            {chart === null ? <span>命式を取得できませんでした</span> : pillars.length ? pillars.map((pillar, index) => (
              <span className="profile-choice-pillar" key={`${pillar.stem}${pillar.branch}-${index}`}>
                <span className={`is-${getFiveElementClass(pillar.stem)}`}>{pillar.stem}</span>
                <span className={`is-${getFiveElementClass(pillar.branch)}`}>{pillar.branch}</span>
              </span>
            )) : <span>命式を読み込み中…</span>}
          </span>
          <span className={`profile-choice-zodiac is-${zodiac.element}`} title={`${zodiac.name}${zodiac.elementLabel ? `（${zodiac.elementLabel}）` : ""}`} aria-label={zodiac.name}>
            <ZodiacIcon zodiac={zodiac} />
          </span>
        </button>
      );
    })}
  </div>
);

export default ProfileList;
