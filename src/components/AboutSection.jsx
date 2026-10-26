import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { site } from '../data/site';

gsap.registerPlugin(ScrollTrigger);

// Teks muncul kata demi kata mengikuti scroll (scrub)
const ScrollRevealText = ({ text, className }) => {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const words = el.querySelectorAll('.reveal-word');
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      gsap.set(words, { opacity: 1 });
      return;
    }
    const ctx = gsap.context(() => {
      gsap.fromTo(
        words,
        { opacity: 0.12, y: 6 },
        {
          opacity: 1,
          y: 0,
          ease: 'none',
          stagger: 0.1,
          scrollTrigger: {
            trigger: el,
            start: 'top 85%',
            end: 'bottom 45%',
            scrub: true,
            // Setelah seluruh kata menyala, kunci: tidak meredup lagi saat scroll ke atas
            onUpdate: (self) => {
              if (self.progress >= 0.999) {
                const anim = self.animation;
                self.kill();
                if (anim) anim.progress(1).kill();
                gsap.set(words, { opacity: 1, y: 0, clearProps: 'transform' });
              }
            },
          },
        }
      );
    }, el);
    ScrollTrigger.refresh();
    return () => ctx.revert();
  }, [text]);

  return (
    <p ref={ref} className={className}>
      {(text || '').split(/\s+/).filter(Boolean).map((w, i) => (
        <span key={i} className="reveal-word" style={{ display: 'inline-block', opacity: 0.12, marginRight: '0.3em' }}>
          {w}
        </span>
      ))}
    </p>
  );
};

const CountUp = ({ to }) => {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { el.textContent = to; return; }
    const io = new IntersectionObserver(([en]) => {
      if (!en.isIntersecting) return;
      io.disconnect();
      const obj = { v: 0 };
      gsap.to(obj, { v: to, duration: 1.6, ease: 'power2.out', onUpdate: () => { el.textContent = Math.round(obj.v); } });
    }, { threshold: 0.6 });
    io.observe(el);
    return () => io.disconnect();
  }, [to]);
  return <span ref={ref}>0</span>;
};

const AboutSection = ({ content }) => {
  const { about, cvs } = content;
  const stats = { projects: content.projects.length, certs: content.certificates.length, skills: content.skills.length };

  return (
    <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10">
      <div className="about-image flex justify-center items-center order-first md:order-last">
        <div className="avatar-ring mb-8 md:mb-0">
          <div className="w-56 h-56 md:w-64 md:h-64 rounded-full bg-card shadow-card overflow-hidden border-4">
            <img src={about.image} alt={`Foto ${site.fullName}`} className="w-full h-full object-cover" />
          </div>
        </div>
      </div>

      <div className="about-card order-last md:order-first mt-4 md:mt-0">
        <span className="section-eyebrow">01 · Tentang</span>
        <h2 className="text-3xl sm:text-4xl font-bold text-ink mb-6 md:mb-8 text-center md:text-left">
          <span className="animated-underline active">Tentang Saya</span>
        </h2>
        <ScrollRevealText text={about.description} className="text-muted text-lg mb-6 leading-relaxed" />

        {cvs.length > 0 && (
          <div className="flex flex-col sm:flex-row justify-center md:justify-start gap-4 mt-2">
            <button
              type="button"
              onClick={() => window.openCVModal?.()}
              className="btn-ink py-3 px-6 rounded-xl text-base font-medium hover:scale-105 flex items-center justify-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Lihat CV Saya</span>
            </button>
          </div>
        )}

        <div className="stat-grid">
          <div className="stat-card"><div className="stat-num"><CountUp to={stats.projects} /></div><div className="stat-label">Proyek</div></div>
          <div className="stat-card"><div className="stat-num"><CountUp to={stats.certs} /></div><div className="stat-label">Sertifikat</div></div>
          <div className="stat-card"><div className="stat-num"><CountUp to={stats.skills} /></div><div className="stat-label">Tech Stack</div></div>
        </div>
      </div>
    </div>
  );
};

export default AboutSection;
