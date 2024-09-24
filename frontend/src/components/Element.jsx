import React from 'react'

export default function Element(props) {
  return (
    <>
        <ruby className='text-element'>
            {props.name}<rt className='vt'>{props.tsuhen}</rt>
        </ruby>
    </>
  )
}
