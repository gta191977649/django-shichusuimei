import React, { useEffect, useState } from 'react'
import Element from '../components/Element';

export default function DaiunTable({width,response,step}) {
    const [ritsnun_age,setRitsunAge] = useState(0)

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
                <th>年</th>
                {
                    Array.from({ length: step }, (_, i) => (
                        <td key={i}>-</td>
                    ))
                }
            </tr>
            <tr>
                <th>月</th>
                {
                    Array.from({ length: step }, (_, i) => (
                        <td key={i}>-</td>
                    ))
                }
            </tr>
            <tr>
                <th>日</th>
                {
                    Array.from({ length: step }, (_, i) => (
                        <td key={i}>-</td>
                    ))
                }
            </tr>

          
        </table>
    )
}
