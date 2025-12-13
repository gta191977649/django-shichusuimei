import React from "react";
import Element from "../compoment/Element";
import Zoukan from "../compoment/Zoukan";

export default function BasicMeishiki({ data }) {
  return (
    <div className="bazi-grid">
      <style>{`
        .bazi-grid.wii-ui {
          font-family: "Nunito", "Noto Sans JP", "Hiragino Kaku Gothic ProN", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          padding: 2rem;
          border-radius: 2rem;
          border: 1px solid #d4e4f8;
          background: linear-gradient(180deg, #ffffff 0%, #f2f4f7 100%);
          color: #0c2843;
        }

        .bazi-grid .wii-glass {
          background: linear-gradient(180deg, #ffffff 0%, #f7f8fb 100%);
          border-radius: 1.5rem;
          padding: 2rem;
          border: 1px solid #d5e4f8;
        }

        .bazi-grid .wii-hero {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          padding: 1.4rem 1.8rem;
          border-radius: 1rem;
          border: 1px solid #d9e7f9;
          background: linear-gradient(180deg, #ffffff 0%, #edf1f6 100%);
          color: #0a3772;
          margin-bottom: 1.5rem;
        }

        .bazi-grid .wii-hero-label {
          font-size: 0.9rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          opacity: 0.85;
          margin: 0;
        }

        .bazi-grid .wii-hero-title {
          font-size: 2rem;
          font-weight: 700;
          margin: 0.1rem 0;
        }

        .bazi-grid .wii-hero-desc {
          margin: 0;
          font-size: 0.95rem;
          opacity: 0.85;
        }

        .bazi-grid .wii-cta {
          border: none;
          border-radius: 999px;
          padding: 0.85rem 1.6rem;
          font-size: 1rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          background: linear-gradient(90deg, #ffffff 0%, #c7e6ff 100%);
          color: #0c4a8a;
          box-shadow: inset 0 2px 0 rgba(255, 255, 255, 0.9), 0 10px 18px rgba(12, 74, 150, 0.25);
          border: 1px solid rgba(255, 255, 255, 0.9);
        }

        .bazi-grid .wii-cta:focus-visible {
          outline: 3px solid rgba(41, 180, 255, 0.5);
          outline-offset: 3px;
        }

        .bazi-grid .wii-table {
          border-radius: 1.2rem;
          padding: 1.4rem;
          border: 1px solid #dbe7f7;
          background: linear-gradient(180deg, #ffffff 0%, #f7f8fb 100%);
        }

        .bazi-grid .wii-row {
          overflow: hidden;
          border: 1px solid #e1ecfb;
          background: linear-gradient(180deg, #ffffff 0%, #f2f5f9 100%);
        }

        .bazi-grid .wii-row:last-of-type {
          margin-bottom: 0;
        }

        .bazi-grid .cell {
          padding: 0.9rem 0.75rem;
          text-align: center;
          font-weight: 600;
          border-right: 1px solid #e0ebfa;
          color: #05325c;
          background: #ffffff;
        }

        .bazi-grid .row.g-0 > [class^="col"] {
          border-right: 0;
          border-bottom: 0;
        }

        .bazi-grid .row .cell:last-child {
          border-right: none;
        }

        .bazi-grid .head {
          background: #f7f9fc;
          font-weight: 700;
          color: #112843;
        }

        .bazi-grid .subhead {
          background: #edf2f7;
          color: #1e87d7;
          font-weight: 700;
        }

        .bazi-grid .title {
          width: 6.5rem;
          text-align: left;
          padding-left: 1rem;
          color: #0a3261;
        }

        .bazi-grid .band {
          background: #f1f4f8;
        }

        .bazi-grid .band-alt {
          background: #fbfcfd;
        }

        .bazi-grid .note {
          color: #5e6b7c;
          font-weight: 500;
        }

        .c-red { color: #e11d48; }
        .c-blue { color: #2563eb; }
        .c-green { color: #16a34a; }
        .c-amber { color: #d97706; }

        @media (max-width: 640px) {
          .bazi-grid.wii-ui {
            padding: 1.2rem;
          }

          .bazi-grid .wii-glass {
            padding: 1.2rem;
          }

          .bazi-grid .cell {
            font-size: 0.85rem;
            padding: 0.65rem;
          }

          .bazi-grid .title {
            width: auto;
          }
        }
      `}</style>

      <div className="content">
      
        <div className="tb">
          {/* Header */}
          <div className="row g-0 wii-row">
            <div className="col-auto cell head title">四柱</div>
            <div className="col cell head">年柱</div>
            <div className="col cell head">月柱</div>
            <div className="col cell head">日柱</div>
            <div className="col cell head">时柱</div>
          </div>

          {/* 十神 */}
          <div className="row g-0 wii-row">
            <div className="col-auto cell subhead title">十神</div>
            <div className="col cell band">{data?.junshi?.tenkan[0]}</div>
            <div className="col cell band">{data?.junshi?.tenkan[1]}</div>
            <div className="col cell band">{data?.gender === 1 ? "男" : "女"}</div>
            <div className="col cell band">{data?.junshi?.tenkan[3]}</div>
          </div>

          {/* 天干 */}
          <div className="row g-0 wii-row">
            <div className="col-auto cell subhead title">天干</div>
            <div className="col cell band-alt">
              <Element name={data?.tenkan?.[0] ?? "･"} />
            </div>
            <div className="col cell band-alt">
              <Element name={data?.tenkan?.[1] ?? "･"} />
            </div>
            <div className="col cell band-alt">
              <Element name={data?.tenkan?.[2] ?? "･"} />
            </div>
            <div className="col cell band-alt">
              <Element name={data?.tenkan?.[3] ?? "･"} />
            </div>
          </div>

          {/* 地支 */}
          <div className="row g-0 wii-row">
            <div className="col-auto cell subhead title">地支</div>

            <div className="col cell band">
              <Element name={data?.chishi?.[0] ?? "･"} />
            </div>
            <div className="col cell band">
              <Element name={data?.chishi?.[1] ?? "･"} />
            </div>
            <div className="col cell band">
              <Element name={data?.chishi?.[2] ?? "･"} />
            </div>
            <div className="col cell band">
              <Element name={data?.chishi?.[3] ?? "･"} />
            </div>
          </div>

          {/* 藏干 */}
          <div className="row g-0 wii-row">
            <div className="col-auto cell subhead title">藏干</div>
            <div className="col cell band-alt">
              <Zoukan name={data?.zoukan?.[0][2]} tsuhen={data?.junshi?.zoukan_honki?.[0]} />
              <br />
              <Zoukan name={data?.zoukan?.[0][1]} tsuhen={data?.junshi?.zoukan_chuki?.[0]} />
              <br />
              <Zoukan name={data?.zoukan?.[0][0]} tsuhen={data?.junshi?.zoukan_yoki?.[0]} />
            </div>
            <div className="col cell band-alt">
              <Zoukan name={data?.zoukan?.[1][2]} tsuhen={data?.junshi?.zoukan_honki?.[1]} />
              <br />
              <Zoukan name={data?.zoukan?.[1][1]} tsuhen={data?.junshi?.zoukan_chuki?.[1]} />
              <br />
              <Zoukan name={data?.zoukan?.[1][0]} tsuhen={data?.junshi?.zoukan_yoki?.[1]} />
            </div>
            <div className="col cell band-alt">
              <Zoukan name={data?.zoukan?.[2][2]} tsuhen={data?.junshi?.zoukan_honki?.[2]} />
              <br />
              <Zoukan name={data?.zoukan?.[2][1]} tsuhen={data?.junshi?.zoukan_chuki?.[2]} />
              <br />
              <Zoukan name={data?.zoukan?.[2][0]} tsuhen={data?.junshi?.zoukan_yoki?.[2]} />
            </div>
            <div className="col cell band-alt">
              <Zoukan name={data?.zoukan?.[3][2]} tsuhen={data?.junshi?.zoukan_honki?.[3]} />
              <br />
              <Zoukan name={data?.zoukan?.[3][1]} tsuhen={data?.junshi?.zoukan_chuki?.[3]} />
              <br />
              <Zoukan name={data?.zoukan?.[3][0]} tsuhen={data?.junshi?.zoukan_yoki?.[3]} />
            </div>
          </div>
{/*         
      纳音
      <div className="row g-0">
        <div className="col-auto cell subhead title">纳音</div>
        <div className="col cell band">涧下水</div>
        <div className="col cell band">金箔金</div>
        <div className="col cell band">涧下水</div>
        <div className="col cell band">覆灯火</div>
      </div> */}

      {/* 空亡 */}
      {/* <div className="row g-0">
        <div className="col-auto cell subhead title">空亡</div>
        <div className="col cell band-alt">申酉</div>
        <div className="col cell band-alt">辰巳</div>
        <div className="col cell band-alt">申酉</div>
        <div className="col cell band-alt">寅卯</div>
      </div> */}

      {/* 年支神煞 */}
      {/* <div className="row g-0">
        <div className="col-auto cell subhead title">年支神煞</div>
        <div className="col cell band">劫煞<br/>红鸾<br/>孤辰</div>
        <div className="col cell band"></div>
        <div className="col cell band">华盖</div>
        <div className="col cell band"></div>
      </div> */}

      {/* 月支神煞 */}
      {/* <div className="row g-0">
        <div className="col-auto cell subhead title">月支神煞</div>
        <div className="col cell band-alt">天德贵人</div>
        <div className="col cell band-alt">天德贵人</div>
        <div className="col cell band-alt"></div>
        <div className="col cell band-alt"></div>
      </div> */}

      {/* 日干神煞 */}
      {/* <div className="row g-0">
        <div className="col-auto cell subhead title">日干神煞</div>
        <div className="col cell band">华盖</div>
        <div className="col cell band"></div>
        <div className="col cell band">劫煞</div>
        <div className="col cell band"></div>
      </div> */}

      {/* 时支神煞 */}
      {/* <div className="row g-0 wii-row">
        <div className="col-auto cell subhead title">时支神煞</div>
        <div className="col cell band-alt"></div>
        <div className="col cell band-alt"></div>
        <div className="col cell band-alt"></div>
        <div className="col cell band-alt"></div>
      </div> */}
        </div>
      </div>
    </div>
  );
}
