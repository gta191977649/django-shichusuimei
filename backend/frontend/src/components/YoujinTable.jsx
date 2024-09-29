import React from 'react'

export default function YoujinTable({response,width,titleColWidth}) {
  return (
    <table style={{width:width}}>
        <tr>
            <th>格局鑑定</th>
            <td style={{width:titleColWidth}}>{response ? response.kakyoku.pattern : "-"}</td>
        </tr>
        <tr>
            <th>抽出方法</th>
            <td style={{width:titleColWidth}}>
                <select className='table-input' name="gender" id="gender">
                <option value={1}>扶抑法</option>
                </select>
            </td>
        </tr>
        <tr>
            <th>喜神五行</th>
            <td style={{width: titleColWidth}}>
                {
                    response ? (
                        response.younjin.younjin.element.map((elem, index) => (
                            <span key={index}> {elem} </span>  // Ensure you're returning JSX correctly
                        ))
                    ) : (
                        "-"  // Display a placeholder or some default content when response is undefined
                    )
                }
            </td>
        </tr>
        <tr>
            <th>忌神五行</th>
            <td style={{width:titleColWidth}}>
                {
                    response ? (
                        response.younjin.kishin.element.map((elem, index) => (
                            <span key={index}> {elem} </span>  // Ensure you're returning JSX correctly
                        ))
                    ) : (
                        "-"  // Display a placeholder or some default content when response is undefined
                    )
                }
            </td>
        </tr>
        <tr>
            <th>調候用神</th>
            <td style={{width:titleColWidth}}>-</td>
        </tr>
        <tr>
            <th>通関用神</th>
            <td style={{width:titleColWidth}}>-</td>
        </tr>
    </table>
  )
}
