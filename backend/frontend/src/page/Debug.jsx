import React, { useEffect,useState } from 'react'
import api from "../api";
import Element from '../components/Element';
import ShinTypeChart from '../components/ShinTypeChart';
import DaiunTable from '../components/DaiunTable'
import YoujinTable from '../components/YoujinTable'
import CustomProgressBar from '../components/CustomProgressBar';
import FiveElementChart from '../components/FiveElementChart';
import { getFiveElementEnergy } from '../common';
import GoukaAnlysis from '../components/GoukaAnlysis';
import ProgressBar from 'react-bootstrap/ProgressBar';
import Tab from 'react-bootstrap/Tab';
import Tabs from 'react-bootstrap/Tabs';
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import DaiunTrend from '../components/DaiunTrend';
import Badge from 'react-bootstrap/Badge';


export default function Debug() {
  const tableWidth = "350px"
  const titleColWidth = "250px"
  const daiun_step = 12
  const [date,setDate] = useState("1997-01-01")
  const [time,setTime] = useState("00:00")
  const [gender,setGender] = useState(1)
  const [response,setResponse] = useState()
  const [elementRatio,setElementRatio] = useState()
  const [activeTab, setActiveTab] = useState('meishiki');
  const [showWiki, setShowWiki] = useState(false);
  const [wikiKey, setWikiKey] = useState(false);

  function renderModal() {
    const [content, setWikiContent] = useState("N/A");
    const [tag, setWikiTag] = useState("");
    const handleClose = () => setShowWiki(false);
    const handleShow = () => {
      setShowWiki(true)
    };

    useEffect(()=>{
      if(showWiki){
        setWikiContent("")
        query()
      }
    },[showWiki])
    const query = () => {
      api
      .get(`/api/wiki/search/?key=${wikiKey}`)
      .then((res) => res.data)
      .then((data) => {
          setWikiTag(data.tag)
          setWikiContent(data.description)
          console.log(data)
      })
      .catch((err) => {
        setWikiTag("")
        setWikiContent("ERROR:未記録用語")
      });
    }

    return (
      <>
        {/* <Button variant="primary" onClick={handleShow}>
          Launch demo modal
        </Button>
   */}
        <Modal className='modal-lg' show={showWiki} onHide={handleClose}>
          <Modal.Header closeButton>
            <Modal.Title>📖{wikiKey}{tag ? <small>({tag})</small> : ""}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div className='wikibody' style={{writingMode:"vertical-lr"}} dangerouslySetInnerHTML={{ __html: content }} />
          </Modal.Body>
          <Modal.Footer>
            <Button variant="primary" onClick={handleClose}>
              OK
            </Button>
          </Modal.Footer>
        </Modal>
      </>
    );
  }

  const setShowWikiModel = (show,key) => {
    setShowWiki(show)
    setWikiKey(key)
  }
  const handleTabSelect = (key) => {
    setActiveTab(key);
  };

  const calculateRadio = () => {
    if(response && response.element_energy) {
      let friendly = 0
      let enemy = 0

      for(const element in response.element_energy.relation){
        let relation = response.element_energy.relation[element]
        if(["比劫", "印綬"].includes(relation)) {
          //friendly.add(element)
          let score = getFiveElementEnergy(response,element)
          friendly += score
        }else{
          let score = getFiveElementEnergy(response,element)
          enemy += score
        }
      }
      setElementRatio([friendly *100,enemy*100])
      console.log(friendly,enemy)
    }
  }

  useEffect(()=>{
    calculateRadio()
  },[response])

  const handleSubmit = () => {
    if (date && time && gender) {
      console.log(date,time,gender)
      query()
    }else{
      alert("必須項目を確認してください")
    }
  }

  const query = () => {
    api
    .post("/api/query",{
      date:date,
      time:time,
      gender:gender,
    })
    .then((res) => res.data)
    .then((data) => {
        console.log(data)
        setResponse(data)
        setActiveTab("meishiki")
    })
    .catch((err) => alert(err));
  }


  
  return (
    <div className='debug-container'>
      {renderModal()}
      <div>
        NURUPOの四柱推命分析 (専門家用DEBUG PAGE)
        <br/>三木照山法参考です、詳しくは『決定版 四柱推命学の完全独習』を見る。
      </div>
      {/* 名前入力 */}
      <table style={{width:tableWidth}}>
        <tr>
          <th>名前</th>
          <td><input className='table-input'/></td>
        </tr>
        <tr>
          <th>誕生日<span className='text-required'>*</span></th>
          <td className='require'><input value={date} onChange={e => setDate(e.target.value)} className='table-input' type="date"/></td>
        </tr>
        <tr>
          <th>誕生時間<span className='text-required'>*</span></th>
          <td className='require'><input value={time} onChange={e => setTime(e.target.value)} className='table-input' type="time"/></td>
        </tr>
        <tr>
          <th>性別<span className='text-required'>*</span></th>
          <td className='require'>
            <select onChange={e => setGender(e.target.value)} value={gender} className='table-input' name="gender" id="gender">
              <option value={1}>男</option>
              <option value={0}>女</option>
            </select>
          </td>
        </tr>
        <tr>
          <td colSpan="2" className='td-buttom'><input onClick={handleSubmit} className='table-input' style={{width:tableWidth}} type='submit' value="鑑定"/></td>
        </tr>
      </table>
      <br/>
      {/* 命式表 */}
      <Tabs
      activeKey={activeTab} onSelect={handleTabSelect}
      defaultActiveKey="meishiki"
      id="uncontrolled-tab-example"
      className="meishiki-tab" style={{width:tableWidth}}
      >
        <Tab eventKey="meishiki" title="命式">
            <table style={{width:tableWidth}}>
            <tr>
              <th>年柱</th>
              <th>月柱</th>
              <th>日柱</th>
              <th>時柱</th>
              <th>-</th>
            </tr>
            
            <tr> {/* 天干 */}
              <td><Element name={response ? response.tenkan[0] : "･"} tsuhen={response ? response.junshi.tenkan[0] : ""} onClick={()=>setShowWikiModel(true,response.tenkan[0])} /></td>
              <td><Element name={response ? response.tenkan[1] : "･"} tsuhen={response ? response.junshi.tenkan[1] : ""} onClick={()=>setShowWikiModel(true,response.tenkan[1])}/></td>
              <td><Element name={response ? response.tenkan[2] : "･"} tsuhen={response ? response.junshi.tenkan[2] : ""} onClick={()=>setShowWikiModel(true,response.tenkan[2])}/></td>
              <td><Element name={response ? response.tenkan[3] : "･"} tsuhen={response ? response.junshi.tenkan[3] : ""} onClick={()=>setShowWikiModel(true,response.tenkan[3])}/></td>
              <th>天干</th>
            </tr>
            <tr> {/* 地支 */}
              <td><Element name={response ? response.chishi[0] : "･"} tsuhen={response ? response.junshi.zoukan_honki[0] : ""} onClick={()=>setShowWikiModel(true,response.chishi[0])}/></td>
              <td><Element name={response ? response.chishi[1] : "･"} tsuhen={response ? response.junshi.zoukan_honki[1] : ""} onClick={()=>setShowWikiModel(true,response.chishi[1])}/></td>
              <td><Element name={response ? response.chishi[2] : "･"} tsuhen={response ? response.junshi.zoukan_honki[2] : ""} onClick={()=>setShowWikiModel(true,response.chishi[2])}/></td>
              <td><Element name={response ? response.chishi[3] : "･"} tsuhen={response ? response.junshi.zoukan_honki[3] : ""} onClick={()=>setShowWikiModel(true,response.chishi[3])}/></td>

              <th>地支</th>
            </tr>
            <tr> {/* 蔵干(本気) */}
              <td><Element name={response ? response.zoukan[0][2] : "･"} tsuhen="同上" onClick={()=>setShowWikiModel(true,response.zoukan[0][2])}/></td>
              <td><Element name={response ? response.zoukan[1][2] : "･"} tsuhen="同上" onClick={()=>setShowWikiModel(true,response.zoukan[1][2])}/></td>
              <td><Element name={response ? response.zoukan[2][2] : "･"} tsuhen="同上" onClick={()=>setShowWikiModel(true,response.zoukan[2][2])}/></td>
              <td><Element name={response ? response.zoukan[3][2] : "･"} tsuhen="同上" onClick={()=>setShowWikiModel(true,response.zoukan[3][2])}/></td>   
              <th>蔵干</th>
            </tr>
            <tr> {/* 蔵干中気 */}
              <td><Element name={response ? response.zoukan[0][1] : "･"} tsuhen={response ? response.junshi.zoukan_chuki[0] : ""} onClick={()=>setShowWikiModel(true,response.zoukan[0][1])}/></td>
              <td><Element name={response ? response.zoukan[1][1] : "･"} tsuhen={response ? response.junshi.zoukan_chuki[1] : ""} onClick={()=>setShowWikiModel(true,response.zoukan[1][1])}/></td>
              <td><Element name={response ? response.zoukan[2][1] : "･"} tsuhen={response ? response.junshi.zoukan_chuki[2] : ""} onClick={()=>setShowWikiModel(true,response.zoukan[2][1])}/></td>
              <td><Element name={response ? response.zoukan[3][1] : "･"} tsuhen={response ? response.junshi.zoukan_chuki[3] : ""} onClick={()=>setShowWikiModel(true,response.zoukan[3][1])}/></td>
              <th>中気</th>
            </tr>
            <tr> {/* 蔵干余気 */}
              <td><Element name={response ? response.zoukan[0][0] : "･"} tsuhen={response ? response.junshi.zoukan_yoki[0] : ""} onClick={()=>setShowWikiModel(true,response.zoukan[0][0])}/></td>
              <td><Element name={response ? response.zoukan[1][0] : "･"} tsuhen={response ? response.junshi.zoukan_yoki[1] : ""} onClick={()=>setShowWikiModel(true,response.zoukan[1][0])}/></td>
              <td><Element name={response ? response.zoukan[2][0] : "･"} tsuhen={response ? response.junshi.zoukan_yoki[2] : ""} onClick={()=>setShowWikiModel(true,response.zoukan[2][0])}/></td>
              <td><Element name={response ? response.zoukan[3][0] : "･"} tsuhen={response ? response.junshi.zoukan_yoki[3] : ""} onClick={()=>setShowWikiModel(true,response.zoukan[3][0])}/></td>
              <th>余気</th>
            </tr>
            <tr> {/* 十二運星 */}
              <td>{response ? response.juniunshi[0] : "･"}</td>
              <td>{response ? response.juniunshi[1] : "･"}</td>
              <td>{response ? response.juniunshi[2] : "･"}</td>
              <td>{response ? response.juniunshi[3] : "･"}</td>
              <th>十二運星</th>
            </tr>
            <tr>
              <td colSpan="4">{response ? response.kubou : "･"}</td>
              <th>空亡</th>

            </tr>
          </table>
        </Tab>
        <Tab eventKey="kanshi" title="刑・沖・破・害">
          {activeTab === 'kanshi' && response ? (
            <GoukaAnlysis tableWidth={tableWidth} response={response} />
          ) : null}
        </Tab>
        <Tab eventKey="liutong" title="流通">
          In Development
        </Tab>
      </Tabs>
      
      <table style={{width:tableWidth}}>
        <tr>
          <td colSpan={2} style={{width:titleColWidth}}>
            {/* Five Element Radar Chart */}
            {response ? <FiveElementChart response={response} /> : "-"}
            
          </td>
        </tr>
        <tr>
          <td colSpan={2}>
            {response ? 
              `木:(${response.element_energy.season_energy["木"]}) 
              火:(${response.element_energy.season_energy["火"]})
              土:(${response.element_energy.season_energy["土"]})
              金:(${response.element_energy.season_energy["金"]})
              水:(${response.element_energy.season_energy["水"]})`
            
            :""}
          </td>
         
        </tr>
        <tr>
          <th>木</th>
          <td style={{width:titleColWidth}}>
            {response ? <CustomProgressBar color="forestgreen" min={0} max={1} value={getFiveElementEnergy(response,"木")} /> : "-"}
          </td>
        </tr>
        <tr>
          <th>火</th>
          <td style={{width:titleColWidth}}>
            {response ? <CustomProgressBar min={0} max={1} color="#E64841" value={getFiveElementEnergy(response,"火")} /> : "-"}
          </td>
        </tr>
        <tr>
          <th>土</th>
          <td style={{width:titleColWidth}}>
            {response ? <CustomProgressBar min={0} max={1} color="saddlebrown" value={getFiveElementEnergy(response,"土")} /> : "-"}
          </td>
        </tr>
        <tr>
          <th>金</th>
          <td style={{width:titleColWidth}}>
            {response ? <CustomProgressBar min={0} max={1} color="darkorange" value={getFiveElementEnergy(response,"金")} /> : "-"}
          </td>
        </tr>
        <tr>
          <th>水</th>
          <td style={{width:titleColWidth}}>
            {response ? <CustomProgressBar min={0} max={1} color="royalblue" value={getFiveElementEnergy(response,"水")} /> : "-"}
          </td>
        </tr>
        <tr>
          <th>割合</th>
          <td style={{width:titleColWidth}}>
            {elementRatio ? <CustomProgressBar
              bars={[
                { color: 'black', value: elementRatio[0], max: 1 ,label:"同",labelColor: 'white' },
                { color: '#e9ecef', value: elementRatio[1], max: 1,label:"異",labelColor: 'black' },
              ]}
            /> : "-"}
            
          </td>
        </tr>
        <tr>
          <th>注記</th>
          <td style={{width:titleColWidth,textAlign:'center'}} className='display-linebreak'>
            <details>
              <summary>展開</summary>
              ⚠「五行生剋」と「刑・沖・破・害」の関係については考えていません！
            </details>
          </td>
        </tr>
      </table>
      <br/>
       {/* 命式 */}
       <table style={{width:tableWidth}}>
        <tr>
          <th>身旺弱鑑定</th>
          <td style={{width:titleColWidth}}>{response ? response.shi_type : "-"}</td>
        </tr>
        <tr>
          <td colSpan="2" className='td-diagram'>
            <ShinTypeChart width={tableWidth} value={response ? (response.tsukirei_point + response.gogyu_point + response.juniun_point) : 0}/>
          </td>
        </tr>
        <tr>
          <th>月令点</th>
          <td style={{width:titleColWidth}}>{response ? response.tsukirei_point : "-"}</td>
        </tr>
        <tr>
          <th>五行点</th>
          <td style={{width:titleColWidth}}>{response ? response.gogyu_point : "-"}</td>
        </tr>
        <tr>
          <th>十二運星点</th>
          <td style={{width:titleColWidth}}>{response ? response.juniun_point : "-"}</td>
        </tr>
        <tr>
          <th>三方合状況</th>
          <td style={{width:titleColWidth}}>-</td>
        </tr>
        <tr>
          <th>合計</th>
          <td style={{width:titleColWidth}}>{response ? (response.tsukirei_point + response.gogyu_point + response.juniun_point) : "N/A"}</td>
        </tr>
        <tr>
          <th>注記</th>
          <td style={{width:titleColWidth,textAlign:'center'}} className='display-linebreak'>
            <details>
              <summary>展開</summary>
              {response ? response.shi_type_note : "-"}
            </details>
          </td>
        </tr>
      </table>
      <br/>
      <YoujinTable response={response} width={tableWidth} titleColWidth={titleColWidth}/>
      <br/>
      {/* 大運線 */}
      <DaiunTrend response={response} chartWidth={"100%"}/>
      <br/>
      {/* 大運表 */}
      <DaiunTable width={tableWidth} response={response} step={daiun_step}/>
    </div>
  )
}