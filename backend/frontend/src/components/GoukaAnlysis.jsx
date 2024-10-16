import React, { useEffect,useState } from 'react'
import Element from './Element'
import LineTo from './LineTo'

export default function GoukaAnlysis({tableWidth, response}) {
    const [renderLines, setRenderLines] = useState(false);

    useEffect(() => {
        // Delay rendering of LineTo components to ensure DOM elements are available
        const timer = setTimeout(() => {
            setRenderLines(true);
        }, 100);

        return () => clearTimeout(timer);
    }, []);
    const renderGouka = (data, prefix) => {
        if (data && renderLines) {
            return data.map((item, rowIdx) => {
                const [startIndex, endIndex] = item.index;
                const lineId = `gouka-${prefix}-${rowIdx}`;

                return (
                    <tr key={`gouka-${prefix}-row-${rowIdx}`}>
                        {[0, 1, 2, 3].map(colIdx => (
                            <td key={`gouka-${prefix}-col-${rowIdx}-${colIdx}`}>
                                {colIdx === startIndex && (
                                    <div className={`gouka-element ${lineId}-start`}>{item.element[0]}</div>
                                )}
                                {colIdx === endIndex && (
                                    <div className={`gouka-element ${lineId}-end`}>{item.element[1]}</div>
                                )}
                            </td>
                        ))}
                        <LineTo 
                            from={`${lineId}-start`} 
                            to={`${lineId}-end`} 
                            color="black" 
                            label={`${item.type}${item.to ? item.to: ""}`}
                            offset={10} 
                            thickness={1.2} 
                        />
                    </tr>
                );
            });
        }
        return null;
    }

    return (
        <>
            <table className='table-gouka' style={{width:tableWidth}}>
                {response ? renderGouka(response.gouka.kan, 'kan') : ""}
                {/* 上述天干干合情况 */}
                <tr>
                    <td>年柱</td>
                    <td>月柱</td>
                    <td>日柱</td>
                    <td>時柱</td>
                </tr>
                
                <tr> {/* 天干 */}
                    <td><Element name={response ? response.tenkan[0] : "･"} tsuhen={response ? response.junshi.tenkan[0] : ""}/></td>
                    <td><Element name={response ? response.tenkan[1] : "･"} tsuhen={response ? response.junshi.tenkan[1] : ""}/></td>
                    <td><Element name={response ? response.tenkan[2] : "･"} tsuhen={response ? response.junshi.tenkan[2] : ""}/></td>
                    <td><Element name={response ? response.tenkan[3] : "･"} tsuhen={response ? response.junshi.tenkan[3] : ""}/></td>
                </tr>
                <tr> {/* 地支 */}
                    <td><Element name={response ? response.chishi[0] : "･"} tsuhen={response ? response.junshi.zoukan_honki[0] : ""}/></td>
                    <td><Element name={response ? response.chishi[1] : "･"} tsuhen={response ? response.junshi.zoukan_honki[1] : ""}/></td>
                    <td><Element name={response ? response.chishi[2] : "･"} tsuhen={response ? response.junshi.zoukan_honki[2] : ""}/></td>
                    <td><Element name={response ? response.chishi[3] : "･"} tsuhen={response ? response.junshi.zoukan_honki[3] : ""}/></td>
                </tr>
                {/* 下述地支支合情况 */}
                {response ? renderGouka(response.gouka.shi, 'shi') : ""}
            </table>
        </>
    )
}