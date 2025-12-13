import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Link  } from "react-router-dom"

import Debug from "./page/Debug"
import NotFound from "./page/NotFound"
import Home from "./page/Home"
import Calendar from "./page/Calendar"
import PercisionDebug from './page/PercisionDebug'
import Suimei from './page/Suimei'

import Sidebar from './components/Sidebar'

// Define a constant for the header height
const HEADER_HEIGHT = '30px'

function App() {
  // Side bar related function
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const sidebarWidth = sidebarVisible ? '150px' : '0px';

  // !! important !!: global select meishiki profile data
  const [meishiki,setSelectedProfile] = useState(false)


  useEffect(()=> {
    console.log(meishiki)
  },[meishiki])

  return (
    <BrowserRouter>
      {/* Fixed header */}
      <div
        className="header-debug"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: HEADER_HEIGHT,
          zIndex: 1000,
          display: 'flex',
          alignItems: 'left',
        }}
      >
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', width: '100%' }}>
          <li>
            <a onClick={()=>{setSidebarVisible(!sidebarVisible)}}>「檔案」</a>
          </li>
          <li>
            <Link to="/">「通常版」</Link>
          </li>
          <li>
            <Link to="/v2">「精密版」</Link>
          </li>
          <li>
            「ログイン」
          </li>
          <li>
            「使い方❓」
          </li>
          <li style={{ marginLeft: '0', color: 'lightblue' }}>
            ･ Developer: Nurupo | 三木照山法参考です、詳しくは『決定版 四柱推命学の完全独習』を見る
          </li>
        </ul>
      </div>

      {/* Content area below header */}
      <div
        style={{
          display: 'flex',
          marginTop: HEADER_HEIGHT,
          height: `calc(100vh - ${HEADER_HEIGHT})`
        }}
      >
        {/* Fixed sidebar on the left */}
        <div
          style={{
            position: 'fixed',
            top: HEADER_HEIGHT,
            left: 0,
            width: sidebarWidth,
            height: `calc(100vh - ${HEADER_HEIGHT})`,
            borderRight: '1px solid #ccc',
            padding: '10px',
            backgroundColor: '#fff',
            overflowY: 'auto',
            transition: 'width 0.3s ease',
            display: sidebarVisible ? 'block' : 'none'
          }}
        >
          <Sidebar isVisible={sidebarVisible} onToggle={() => setSidebarVisible(!sidebarVisible)} setSelectedProfile={setSelectedProfile}/>
        </div>

        {/* Main content, shifted to the right by sidebar width */}
        <div
          style={{
            marginLeft: sidebarVisible ? sidebarWidth : '0px',
            width: sidebarVisible ? `calc(100% - ${sidebarWidth})` : '100%',
            overflowY: 'auto',
            height: `calc(100vh - ${HEADER_HEIGHT})`,
            transition: 'margin-left 0.3s ease, width 0.3s ease'
          }}
        >
          <Routes>
            <Route path="/home" element={<Suimei />} />
            <Route path="/" element={<Debug />} />
            <Route path="/v2" element={<PercisionDebug profile={meishiki} setSelectedProfile={setSelectedProfile}/>} />
            <Route path="/app" element={<Calendar />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  )
}

export default App