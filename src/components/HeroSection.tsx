import React from 'react';
import { Scan, ArrowDown, Cpu, Eye, Zap } from 'lucide-react';

interface HeroSectionProps {
  onNavigate: (section: string) => void;
}

const HeroSection: React.FC<HeroSectionProps> = ({ onNavigate }) => {
  return (
    <section id="hero" className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gray-50">
      <div className="absolute inset-0">
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `linear-gradient(rgba(0,0,0,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.2) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/[0.06] rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-500/[0.05] rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-amber-400/[0.04] rounded-full blur-[100px]" />
        <div className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent animate-scan" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-amber-50 border border-amber-200 mb-6 sm:mb-8">
          <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <span className="text-amber-700 text-sm font-medium">AI-Powered Quality Control</span>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-black mb-4 sm:mb-6 leading-tight px-2">
          <span className="text-gray-900">Defect</span>
          <span className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400 bg-clip-text text-transparent">Vision</span>
          <br />
          <span className="text-gray-900 text-3xl sm:text-5xl md:text-6xl lg:text-7xl">AI Inspector</span>
        </h1>

        <p className="text-base sm:text-lg md:text-xl text-gray-500 max-w-3xl mx-auto mb-8 sm:mb-10 leading-relaxed px-2">
          Real-time surface defect detection for industrial manufacturing.
          Powered by <span className="text-amber-600 font-semibold">YOLOv8</span> deep learning
          and deployed on <span className="text-gray-800 font-semibold">Luckfox Pico Plus</span> &mdash;
          detecting cracks, damage, scratches and broken surfaces in real time.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-10 sm:mb-16 px-4 sm:px-0">
          <button
            onClick={() => onNavigate('demo')}
            className="group px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl text-white font-semibold text-lg shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 transition-all duration-300 hover:scale-105"
          >
            <span className="flex items-center justify-center gap-2">
              <Eye className="w-5 h-5" />
              Try Live Demo
            </span>
          </button>
          <button
            onClick={() => onNavigate('train')}
            className="px-8 py-4 bg-white border border-gray-200 rounded-xl text-gray-700 font-semibold text-lg hover:bg-gray-50 hover:border-amber-300 transition-all duration-300 shadow-sm"
          >
            <span className="flex items-center justify-center gap-2">
              <Cpu className="w-5 h-5" />
              Train Model
            </span>
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 max-w-4xl mx-auto px-2 sm:px-0">
          {[
            { value: '95.4%', label: 'Detection Accuracy', icon: Scan },
            { value: '4', label: 'Defect Classes', icon: Eye },
            { value: '<50ms', label: 'Inference Time', icon: Zap },
            { value: '2400+', label: 'Training Images', icon: Cpu },
          ].map((stat) => (
            <div
              key={stat.label}
              className="p-4 rounded-xl bg-white border border-gray-100 shadow-sm hover:border-amber-200 hover:shadow-md transition-all duration-500"
            >
              <stat.icon className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 mx-auto mb-1.5 sm:mb-2" />
              <div className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">{stat.value}</div>
              <div className="text-xs sm:text-sm text-gray-400">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={() => onNavigate('about')}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-gray-400 hover:text-amber-500 transition-colors animate-bounce"
      >
        <ArrowDown className="w-6 h-6" />
      </button>
    </section>
  );
};

export default HeroSection;
