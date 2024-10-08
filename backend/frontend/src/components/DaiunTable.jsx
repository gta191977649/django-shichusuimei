import React, { useEffect, useState } from 'react'
import {Collapse} from 'react-collapse';
import Element from '../components/Element';

export default function DaiunTable({width,response,step}) {
    const [ritsnun_age,setRitsunAge] = useState(0)
    const [daiun_idx,setDaiun] = useState(0)
    const [event_type,setEventType] = useState(0)
    useEffect(()=>{
        if (response && response.ritsun_time) {  // Check if response and response.ritsun_time are defined
            let age = ritsuun_age_calculate(response.ritsun_time.year, response.ritsun_time.month);
            setRitsunAge(age);
        }
    },[response])

    const ritsuun_age_calculate = (year,month) => {
        year = year
        // 余りが出た場合は、余りに4ヶ月をかけて年数に加えます。例えば、余りが2だった場合は、8ヶ月を立運に加えます。
        // 四捨八入
        year = month <= 4 ? year : (year+1)
        console.log(year)
        return year
    }
    return (
        <>
        <table style={{width:width}}>
            <tr>
                <th colSpan={step+1}>
                <details className='display-linebreak'>
                    <summary>
                        大運表
                        {response ? `･${response.ritsun_time.year}年${response.ritsun_time.month}ｹ月立運` :""}
                        {response ? response.ritsun_time.unjun_type == 0 ? "「逆行運」" : "「順行運」" : ""}
                    </summary>
                    {response ? response.ritsun_time.note : ""}
                </details>
                   
                </th>
            </tr>
            <tr>
                <th style={{width:50}}>歳</th>
                {response ?  <td key={0}>0</td> : ""}
                { response ? //もしdataあり
                    // Array.from({ length: step }, (_, i) => (
                    //     <td key={i}>{i * 10}</td>
                    // ))
                   
                    response.daiun_table.daiun.kan.map ((_,i)=>{
                        return <td key={i}>{ ritsnun_age + (i*10) }</td>
                    })
                :
                    Array.from({ length: step }, (_, i) => (
                        <td key={i}>{i}</td>
                    ))
                }

            </tr>
            <tr>
                <th className='vt'>大運</th>
                {response ? <td key={0}><span className='vt'>･</span></td> : ""}
                {response ? (
                    response.daiun_table.daiun.kan.map((kan, i) => {
                        // 天干
                        const kanName = kan.element;
                        const kanTsuhen = kan.tsuhen;
                        // 地支
                        const shiName = response.daiun_table.daiun.shi[i].element
                        const shiTsuhen = response.daiun_table.daiun.shi[i].zoukan[2].tsuhen
                        // Access the last entry of the 'shi' array for the current index
                        // const shiEntries = response.daiun_table.daiun.shi[i][Object.keys(response.daiun_table.daiun.shi[i])[0]];
                        // const lastShiEntry = shiEntries[2]; // Picking the last entry (third element)
                        // const shiName = Object.keys(response.daiun_table.daiun.shi[i]); // Extract key (name) from the last 'shi' entry
                        // const shiHonkiName = Object.keys(lastShiEntry)[0];
                        // const shiTsuhen = lastShiEntry[shiHonkiName]; // Extract value (tsuhen) from the last 'shi' entry

                        return (
                            <td key={i} className='vt daiun-col'>
                                {/* Render Element for kan */}
                                <Element
                                    name={kanName}
                                    tsuhen={kanTsuhen}
                                />
                                {/* Render Element for shi */}
                                <Element
                                    name={shiName}
                                    tsuhen={shiTsuhen}
                                />
                            </td>
                        );
                    })
                ) : (
                    <td colSpan={step}>-</td>
                )}
            </tr>
            <tr>
                <th>運星</th>
                {response ? <td key={0}><span className='vt'>･</span></td> : ""}
                {response ? (
                    response.daiun_table.daiun.shi.map((shi, i) => {
                       
                        return (
                            <td key={i} className='vt daiun-col'>
                                {shi.seiun}
                            </td>
                        );
                    })
                ) : (
                    <td colSpan={step}>-</td>
                )}
            </tr> 
            <tr>
                <th colSpan={step+1}>
                   刑･冲･合
                </th>
            </tr>
            
            <tr>
                <th>年柱</th>
                <td>･</td>
                {response ? (
                    response.daiun_table.daiun.kan.map((kan, i) => {
                        return (
                            <td key={i} className='vt daiun-col'>
                                <li>
                                    { kan.relation.year["干合"] ? `${response.tenkan[1]}${kan.element}干合(${kan.relation.year["干合"]})` : ""}
                                </li>
                            {/* 地支 */}
                                <li>
                                    { response.daiun_table.daiun.shi[i].relation.year["支合"] ? `${response.chishi[0]}${response.daiun_table.daiun.shi[i].element}支合(${response.daiun_table.daiun.shi[i].relation.year["支合"]})` : ""}
                                </li>
                                <li>
                                    { response.daiun_table.daiun.shi[i].relation.year["七冲"] ? `${response.chishi[0]}${response.daiun_table.daiun.shi[i].element}七沖` : ""}
                                </li>
                            </td>
                        );
                    })
                ) : (
                    Array.from({ length: step-1}, (_, i) => (
                        <td key={i}>-</td>
                    ))
                )}
            
            
            </tr>
            <tr>
                <th>月柱</th>
                <td>･</td>
                {response ? (
                    response.daiun_table.daiun.kan.map((kan, i) => {
                        return (
                            <td key={i} className='vt daiun-col'>
                                <li>
                                    { kan.relation.month["干合"] ? `${response.tenkan[1]}${kan.element}干合(${kan.relation.month["干合"]})` : ""}
                                </li>
                            {/* 地支 */}
                                <li>
                                    { response.daiun_table.daiun.shi[i].relation.month["支合"] ? `${response.chishi[1]}${response.daiun_table.daiun.shi[i].element}支合(${response.daiun_table.daiun.shi[i].relation.month["支合"]})` : ""}
                                </li>
                                <li>
                                    { response.daiun_table.daiun.shi[i].relation.month["七冲"] ? `${response.chishi[1]}${response.daiun_table.daiun.shi[i].element}七沖` : ""}
                                </li>
                            </td>
                        );
                    })
                ) : (
                    Array.from({ length: step-1 }, (_, i) => (
                        <td key={i}>-</td>
                    ))
                )}
            
            </tr>
            <tr>
                <th>日柱</th>
                <td>･</td>
                {response ? (
                    response.daiun_table.daiun.kan.map((kan, i) => {
                        return (
                            <td key={i} className='vt daiun-col'>
                                <li>
                                    { kan.relation.day["干合"] ? `${response.tenkan[2]}${kan.element}干合(${kan.relation.day["干合"]})` : ""}
                                </li>
                            {/* 地支 */}
                                <li>
                                    { response.daiun_table.daiun.shi[i].relation.day["支合"] ? `${response.chishi[2]}${response.daiun_table.daiun.shi[i].element}支合(${response.daiun_table.daiun.shi[i].relation.day["支合"]})` : ""}
                                </li>
                                <li>
                                    { response.daiun_table.daiun.shi[i].relation.day["七冲"] ? `${response.chishi[2]}${response.daiun_table.daiun.shi[i].element}七沖` : ""}
                                </li>
                            </td>
                        );
                    })
                ) : (
                    Array.from({ length: step-1 }, (_, i) => (
                        <td key={i}>-</td>
                    ))
                )}
            </tr>
            <tr>
                <th>時柱</th>
                <td>･</td>
                {response ? (
                    response.daiun_table.daiun.kan.map((kan, i) => {
                        return (
                            <td key={i} className='vt daiun-col'>
                                <li>
                                    { kan.relation.time["干合"] ? `${response.tenkan[3]}${kan.element}干合(${kan.relation.time["干合"]})` : ""}
                                </li>
                            {/* 地支 */}
                                <li>
                                    { response.daiun_table.daiun.shi[i].relation.time["支合"] ? `${response.chishi[3]}${response.daiun_table.daiun.shi[i].element}支合(${response.daiun_table.daiun.shi[i].relation.time["支合"]})` : ""}
                                </li>
                                <li>
                                    { response.daiun_table.daiun.shi[i].relation.time["七冲"] ? `${response.chishi[3]}${response.daiun_table.daiun.shi[i].element}七沖` : ""}
                                </li>
                            </td>
                        );
                    })
                ) : (
                    Array.from({ length: step-1 }, (_, i) => (
                        <td key={i}>-</td>
                    ))
                )}
            </tr>
            
        </table>
        
        <br/>
        <table>
            <tr>
                <th colSpan={12}>流年</th>
            </tr>
            <tr>
                <th>鑑定分野</th>
                <td colSpan={11}>
                    <select className='table-input' name="gender" id="gender">
                        <option value="relationship">恋愛･結婚運</option>
                        <option value="work">仕事･金･運</option>
                    </select>
                </td>
            </tr>
            <tr>
                <th>大運</th>
                <td colSpan={11}>
                    <input className='table-input' type="number" min={0} max={10} onChange={e => setDaiun(e.target.value)} value={daiun_idx}/>
                </td>
            </tr>
           
            <tr>
                <th>年</th>
                {response ? (
                    // Assuming 'response' has an array 'years' that you want to map over
                    response.daiun_table.year_table[daiun_idx].list.map((ryo_nen, i) => (
                        <td key={i}>{ryo_nen.year}</td>  // Display data from the response
                    ))
                ) : (
                    // If no response, generate cells with indices
                    Array.from({ length: step-1 }, (_, i) => (
                        <td key={i}>{i}</td>
                    ))
                )}
            </tr>
            <tr>
                <th>流年</th>
                {response ? (
                    // Assuming 'response' has an array 'years' that you want to map over
                    response.daiun_table.year_table[daiun_idx].list.map((ryo_nen, i) => (
                        <td key={i} className='vt daiun-col'>
                            <Element
                                name={ryo_nen.kan.element}
                                tsuhen={ryo_nen.kan.tsuhen}
                            />
                            <Element
                                name={ryo_nen.shi.element}
                                tsuhen={ryo_nen.shi.tsuhen}
                            />
                        </td>  // Display data from the response
                    ))
                ) : (
                    // If no response, generate cells with indices
                    Array.from({ length: step-1 }, (_, i) => (
                        <td key={i}>{i}</td>
                    ))
                )}
            </tr>
            <tr>
                <th>イベント</th>
                {response ? (
                    response.daiun_table.year_table[daiun_idx].list.map((ryo_nen, i) => (
                        <td key={i} className='vt daiun-col'>
                            {ryo_nen.event.relationship.map((event, eventIndex) => (
                                <div key={eventIndex}>･ {event.name}</div>
                            ))}
                        </td>
                    ))
                ) : (
                    <td>No Events</td>  // Display a default message or cell when there is no response
                )}
            </tr>

        </table>
 
        </>
    )
}