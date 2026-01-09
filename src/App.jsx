import React from 'react'
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom'
import Home from './pages/Home'
import Rush from './pages/Rush'
import Admin from './pages/Admin'

export default function App(){
  const navigate = useNavigate();
  const location = useLocation();

  // Navigate to home route then scroll to target id. If already on home, scroll immediately.
  function goToSection(id){
    if (!id) { navigate('/'); return; }
    if (location.pathname === '/'){
      const el = document.getElementById(id);
      if (el) { el.scrollIntoView({ behavior: 'smooth' }); return; }
      // fallback to routing state so Home can handle the scroll if element not present yet
      navigate('/', { state: { scrollTo: id } });
      return;
    }
    navigate('/', { state: { scrollTo: id } });
  }

  return (
    <div>
      <header className="header">
        <div className="navbar-container">
          <div className="navbar-logo">
            <button onClick={() => goToSection('home')} className="logo-link">
              <img src="/images/ThetaTauLogo2.png" alt="Theta Tau Logo" className="logo"/>
            </button>
          </div>
          <nav className="navbar-nav">
            <button onClick={() => goToSection('home')} className="nav-button">Home</button>
            <button onClick={() => goToSection('about')} className="nav-button">About</button>
            <button onClick={() => goToSection('contact')} className="nav-button">Contact Us</button>
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
