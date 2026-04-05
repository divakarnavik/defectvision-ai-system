import React, { useState, useEffect } from 'react';
import logo from '../assets/logo.png';

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [phase, setPhase] = useState<'enter' | 'hold' | 'exit'>('enter');

  useEffect(() => {
    const enterTimer = setTimeout(() => setPhase('hold'), 800);
    const holdTimer = setTimeout(() => setPhase('exit'), 2000);
    const exitTimer = setTimeout(() => onComplete(), 2800);
    return () => {
      clearTimeout(enterTimer);
      clearTimeout(holdTimer);
      clearTimeout(exitTimer);
    };
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-white transition-opacity duration-700 ${
        phase === 'exit' ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(0,0,0,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.3) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Animated ring */}
      <div className={`absolute w-40 h-40 rounded-full border border-amber-500/20 transition-all duration-1000 ease-out ${
        phase === 'enter' ? 'scale-0 opacity-0' : 'scale-100 opacity-100'
      }`} />
      <div className={`absolute w-56 h-56 rounded-full border border-amber-500/10 transition-all duration-1000 ease-out delay-200 ${
        phase === 'enter' ? 'scale-0 opacity-0' : 'scale-100 opacity-100'
      }`} />

      <div className="relative z-10 text-center">
        {/* Logo icon */}
        <div className={`mx-auto mb-6 transition-all duration-700 ease-out ${
          phase === 'enter' ? 'scale-0 rotate-180 opacity-0' : 'scale-100 rotate-0 opacity-100'
        }`}>
          <div className="relative">
            <div className="flex items-center justify-center">
              <img src={logo} alt="DefectVision AI" className="w-32 h-32 object-contain" />
            </div>
          </div>
        </div>

        {/* Brand name */}
        <h1 className={`text-4xl sm:text-5xl font-black tracking-tight transition-all duration-700 delay-300 ease-out ${
          phase === 'enter' ? 'translate-y-8 opacity-0' : 'translate-y-0 opacity-100'
        }`}>
          <span className="text-gray-900">Defect</span>
          <span className="bg-gradient-to-r from-amber-500 to-orange-600 bg-clip-text text-transparent">Vision</span>
        </h1>

        {/* Subtitle */}
        <p className={`mt-3 text-gray-400 text-sm font-medium tracking-widest uppercase transition-all duration-700 delay-500 ease-out ${
          phase === 'enter' ? 'translate-y-6 opacity-0' : 'translate-y-0 opacity-100'
        }`}>
          AI-Powered Inspection
        </p>

        {/* Loading bar */}
        <div className={`mt-8 mx-auto w-48 h-0.5 bg-gray-100 rounded-full overflow-hidden transition-all duration-500 delay-500 ${
          phase === 'enter' ? 'opacity-0' : 'opacity-100'
        }`}>
          <div className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full animate-splash-bar" />
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
