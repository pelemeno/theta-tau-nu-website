import React, { useEffect } from 'react'

export default function Home(){
  useEffect(()=>{
    // smooth scrolling for anchor links
    const anchors = Array.from(document.querySelectorAll('a[href^="#"]'));
    function onClick(e){
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) target.scrollIntoView({ behavior: 'smooth' });
    }
    anchors.forEach(a=>a.addEventListener('click', onClick));
    return ()=>anchors.forEach(a=>a.removeEventListener('click', onClick));
  },[])

  return (
    <div>
      <section className="hero" id="home">
        <h1>NUTT Interest Group</h1>
        <a href="/rush" className="rush-btn">Rush Application</a>
      </section>

      <section className="about" id="about">
        <div className="about-center">
          <h2>About Us</h2>
          <p>
            Theta Tau is the nation's oldest, largest, and foremost professional engineering fraternity.
            Our Northwestern University chapter is committed to fostering lifelong bonds of brotherhood,
            advancing professional development, and serving the community through engineering and service.
          </p>
        </div>
      </section>

      <footer id="contact">
        <div className="socials">
          <a href="mailto:thetataunwu@gmail.com" target="_blank" rel="noreferrer"><img src="/images/gmailicon.png" alt="Email"/></a>
          <a href="https://instagram.com/thetataunu/" target="_blank" rel="noreferrer"><img src="/images/instagramicon.png" alt="Instagram"/></a>
        </div>
        <p className="copyright">© 2025 Theta Tau - Northwestern University</p>
      </footer>
    </div>
  )
}
