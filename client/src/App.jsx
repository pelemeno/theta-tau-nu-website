import React from 'react'
import { Routes, Route, Link } from 'react-router-dom'
import Home from './pages/Home'
import Rush from './pages/Rush'
import Admin from './pages/Admin'

export default function App(){
  return (
    <div>
      <header className="header">
        <div className="navbar-container">
          <div className="navbar-logo">
            <a href="#home" className="logo-link"><img src="/images/ThetaTauLogo2.png" alt="Theta Tau Logo" className="logo"/></a>
          </div>
          <nav className="navbar-nav">
            <a href="#home">Home</a>
            <a href="#about">About</a>
            <a href="#contact">Contact Us</a>
          </nav>
        </div>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<Home/>} />
          <Route path="/rush" element={<Rush/>} />
          <Route path="/admin" element={<Admin/>} />
        </Routes>
      </main>
    </div>
  )
}
