import React, { useState, useEffect, useCallback } from 'react';
import { AppProvider } from './context/AppContext';
import SplashScreen from './components/SplashScreen';
import Navbar from './components/Navbar';
import HeroSection from './components/HeroSection';
import AboutSection from './components/AboutSection';
import DefectClassesSection from './components/DefectClassesSection';
import DemoSection from './components/DemoSection';
import TrainingPage from './components/TrainingPage';
import HistoryStatusSection from './components/HistoryStatusSection';
import DocumentationSection from './components/DocumentationSection';
import Footer from './components/Footer';

const AppContent: React.FC = () => {
  const [activeSection, setActiveSection] = useState('hero');
  const [currentPage, setCurrentPage] = useState<'main' | 'train'>('main');
  const [showSplash, setShowSplash] = useState(true);

  const handleNavigate = useCallback((sectionId: string) => {
    if (sectionId === 'train') {
      setCurrentPage('train');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (currentPage === 'train') {
      setCurrentPage('main');
      setTimeout(() => {
        const el = document.getElementById(sectionId);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      return;
    }
    const el = document.getElementById(sectionId);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  }, [currentPage]);

  useEffect(() => {
    if (currentPage === 'train') {
      setActiveSection('train');
      return;
    }
    const sectionIds = ['hero', 'about', 'defects', 'demo', 'history', 'docs'];
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting)
          .sort((a, b) => sectionIds.indexOf(a.target.id) - sectionIds.indexOf(b.target.id));
        if (visible.length > 0) setActiveSection(visible[0].target.id);
      },
      { threshold: 0.2, rootMargin: '-80px 0px 0px 0px' }
    );
    sectionIds.forEach((id) => { const el = document.getElementById(id); if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, [currentPage]);

  return (
    <div className="min-h-screen bg-white text-gray-900 antialiased">
      {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
      <Navbar activeSection={activeSection} onNavigate={handleNavigate} />
      <main>
        {currentPage === 'main' ? (
          <>
            <HeroSection onNavigate={handleNavigate} />
            <AboutSection />
            <DefectClassesSection />
            <DemoSection />
            <HistoryStatusSection />
            <DocumentationSection />
          </>
        ) : (
          <div className="pt-16">
            <TrainingPage />
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
};

export default App;
