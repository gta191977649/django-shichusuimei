import React from "react";
import Element from "../compoment/Element";
import Zoukan from "../compoment/Zoukan";

export default function BasicMeishiki({ data }) {
  const tenkan = data?.tenkan ?? [];
  const chishi = data?.chishi ?? [];
  const zoukan = data?.zoukan ?? [];
  const junshi = data?.junshi ?? {};
  const juniunshi = data?.juniunshi ?? [];

  const renderElement = (name, tsuhen = "") => <Element name={name ?? "･"} tsuhen={tsuhen ?? ""} />;

  const renderZoukanCell = (index) => (
    <>
      <Zoukan name={zoukan?.[index]?.[2]} tsuhen={junshi?.zoukan_honki?.[index]} />
      <br />
      <Zoukan name={zoukan?.[index]?.[1]} tsuhen={junshi?.zoukan_chuki?.[index]} />
      <br />
      <Zoukan name={zoukan?.[index]?.[0]} tsuhen={junshi?.zoukan_yoki?.[index]} />
    </>
  );

  return (
    <table style={{ width: "100%" }}>
      <tbody>
        <tr>
          <th>年柱</th>
          <th>月柱</th>
          <th>日柱</th>
          <th>時柱</th>
          <th>-</th>
        </tr>

        <tr>
          <td>{renderElement(tenkan[0], junshi?.tenkan?.[0])}</td>
          <td>{renderElement(tenkan[1], junshi?.tenkan?.[1])}</td>
          <td>{renderElement(tenkan[2], junshi?.tenkan?.[2])}</td>
          <td>{renderElement(tenkan[3], junshi?.tenkan?.[3])}</td>
          <th>天干</th>
        </tr>

        <tr>
          <td>{renderElement(chishi[0], junshi?.zoukan_honki?.[0])}</td>
          <td>{renderElement(chishi[1], junshi?.zoukan_honki?.[1])}</td>
          <td>{renderElement(chishi[2], junshi?.zoukan_honki?.[2])}</td>
          <td>{renderElement(chishi[3], junshi?.zoukan_honki?.[3])}</td>
          <th>地支</th>
        </tr>

        <tr>
          <td>{renderZoukanCell(0)}</td>
          <td>{renderZoukanCell(1)}</td>
          <td>{renderZoukanCell(2)}</td>
          <td>{renderZoukanCell(3)}</td>
          <th>蔵干</th>
        </tr>

        <tr>
          <td>{juniunshi[0] ?? "･"}</td>
          <td>{juniunshi[1] ?? "･"}</td>
          <td>{juniunshi[2] ?? "･"}</td>
          <td>{juniunshi[3] ?? "･"}</td>
          <th>十二運星</th>
        </tr>

        <tr>
          <td colSpan="4">{data?.kubou ?? "･"}</td>
          <th>空亡</th>
        </tr>
      </tbody>
    </table>
  );
}
