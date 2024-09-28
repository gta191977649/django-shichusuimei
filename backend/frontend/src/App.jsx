import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"

import Debug from "./page/Debug"
import NotFound from "./page/NotFound"
import Home from "./page/Home"
import Calendar from "./page/Calendar"

function App() {
  const [count, setCount] = useState(0)

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Debug />}/>
        <Route path="/app" element={<Calendar />}/>
        <Route path="*" element={<NotFound />}></Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App