// Sidebar.jsx
import React, { useEffect, useState } from 'react'
import api from '../api'

const Sidebar = ({ isVisible, onToggle,setSelectedProfile }) => {

  const [profile,setProfiles] = useState([])

  const fetchProfileData = () => {
    api.get("/api/meishiki/").then((res) => res.data)
    .then((data) => {
        console.log(data)
        setProfiles(data)
    })
    .catch((err) => alert(err));
  }

  
  useEffect(()=>{
    if (isVisible == true) {
      fetchProfileData()

    }
  },[isVisible])

  return (
    <div style={{ display: isVisible ? 'block' : 'none' }}>
      <button 
        onClick={onToggle}
        style={{
          width: '100%',
          padding: '8px',
          marginBottom: '10px',
          border: '1px solid #ccc',
          borderRadius: '4px',
          backgroundColor: '#f8f9fa',
          cursor: 'pointer'
        }}
      >
        {isVisible ? '◀' : '▶'}
      </button>
      <div>
        <h1>Profiles</h1><br/>
        {profile && (
            <ul className="nav flex-column">
                {profile.map((item, index) => ( 
                    <li className="nav-item" onClick={() => setSelectedProfile(item)}> 
                      {item.name}
                    </li>

                ))}
            </ul>
        )}
        
        
      </div>
    </div>
  )
}

export default Sidebar