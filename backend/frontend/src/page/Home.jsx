import React from 'react'
import 'bootstrap/dist/css/bootstrap.min.css';
import './../app.css'

export default function Home() {
  return (
    <div className='container'>
      <div class="row">
        {/* LEFT COLUM */}
        <div class="col-2">
          <h1 className='vt'>ねこのカレンダー</h1>
        </div>
        {/* RIGHT COLUM */}
        <div className="col-10">
          <div className='row'>
            <div className="col col-month">一月</div>
            <div className="col col-month">二月</div>
            <div className="col col-month">三月</div>
            <div className="col col-month">四月</div>
          </div>
          <div className='row'>
            <div className="col col-month">五月</div>
            <div className="col col-month">六月</div>
            <div className="col col-month">七月</div>
            <div className="col col-month">八月</div>
          </div>
          <div className='row'>
            <div className="col col-month">九月</div>
            <div className="col col-month">十月</div>
            <div className="col col-month">十一月</div>
            <div className="col col-month">十二月</div>
          </div>
        </div>
        
      </div>

    </div>
    
  )
}
