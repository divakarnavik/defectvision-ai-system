import React from 'react';
import { Scan, Github, Heart } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="py-12 border-t border-gray-200 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <Scan className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
              DefectVision AI
            </span>
          </div>

          <div className="flex items-center gap-1 text-gray-400 text-sm">
            <span>Built with</span>
            <Heart className="w-4 h-4 text-red-400 fill-red-400" />
            <span>using YOLOv8 + Luckfox Pico Plus</span>
          </div>

          <div className="flex items-center gap-4">
            <a
              href="#"
              className="text-gray-400 hover:text-gray-700 transition-colors"
              onClick={(e) => e.preventDefault()}
            >
              <Github className="w-5 h-5" />
            </a>
            <span className="text-gray-400 text-sm">© 2025 DefectVision AI</span>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-100 text-center">
          <p className="text-gray-400 text-xs">
            AI-Powered Visual Inspection System for Industrial Surface Defect Detection | 
            Powered by YOLOv8 • OpenCV • Streamlit • Luckfox Pico Plus Linux Board
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
