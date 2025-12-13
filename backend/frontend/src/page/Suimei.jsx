import React, { Component } from 'react'

export default class Suimei extends Component {
  render() {
    return (
      <div className='app max-w-4xl mx-auto p-6 shadow-lg'>
        <h1 className='text-center'> 「解读」</h1>
        <hr/>
        <h2>人格特征</h2>
        <div className='row mt-3'>
            <div className='col-12'>
                <div className='card'>
                    <div className='card-body'>
                        <div className='card-title'>外在</div>
                        ...
                    </div>
                </div>
            </div>
            <div className='col-12 mt-3'>
                <div className='card'>
                    <div className='card-body'>
                        <div className='card-title'>内在</div>
                        ...
                    </div>
                </div>
            </div>
            <h2>思维与沟通</h2>
            <div className='col-12'>
                <div className='card mt-3'>
                    <div className='card-body'>
                        <div className='card-title'>思维方式</div>
                        ...
                    </div>
                </div>
            </div>
            <div className='col-12'>
                <div className='card mt-3'>
                    <div className='card-body'>
                        <div className='card-title'>沟通风格</div>
                        ...
                    </div>
                </div>
            </div>
        </div>
      </div>
    )
  }
}
