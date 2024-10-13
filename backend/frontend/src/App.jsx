import { useState } from 'react'
import { BrowserRouter, Routes, Route, Link  } from "react-router-dom"

import Debug from "./page/Debug"
import NotFound from "./page/NotFound"
import Home from "./page/Home"
import Calendar from "./page/Calendar"
import PercisionDebug from './page/PercisionDebug'

function App() {
  const [count, setCount] = useState(0)

  return (
    <BrowserRouter>
      <div className='header-debug'>
        <li><Link to="">「通常版」</Link></li>
        <li><Link to="/debug">「精密版」</Link></li>
        <li><Link to="/app">「APP」</Link></li>
        <li style={{color:"lightblue"}}>･ Developer: Nurupo | 三木照山法参考です、詳しくは『決定版 四柱推命学の完全独習』を見る</li>
      </div>
    <hr/>
      <Routes>
        <Route path="/" element={<Debug />}/>
        <Route path="/debug" element={<PercisionDebug />}/>
        <Route path="/app" element={<Calendar />}/>
        <Route path="*" element={<NotFound />}></Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App