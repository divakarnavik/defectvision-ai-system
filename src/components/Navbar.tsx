import React, { useState } from 'react';
import { Scan, Menu, X, Brain } from 'lucide-react';
import { cn } from '../utils/cn';

interface NavbarProps {
  activeSection: string;
  onNavigate: (section: string) => void;
}

const navItems = [
  { id: 'hero', label: 'Home' },
  { id: 'about', label: 'About' },
  { id: 'defects', label: 'Defect Classes' },
  { id: 'demo', label: 'Inspect' },
  { id: 'train', label: 'Train Model', special: true },
  { id: 'history', label: 'History' },
  { id: 'docs', label: 'Docs' },
];

const Navbar: React.FC<NavbarProps> = ({ activeSection, onNavigate }) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => onNavigate('hero')}>
            <div className="relative">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                <Scan className="w-5 h-5 text-white" />
              </div>
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
              DefectVision AI
            </span>
          </div>

          <div className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={cn(
                  'px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 flex items-center gap-1.5',
                  activeSection === item.id
                    ? item.special ? 'text-amber-600 bg-amber-50' : 'text-amber-600 bg-amber-50'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                )}
              >
                {item.special && <Brain className="w-3.5 h-3.5" />}
                {item.label}
              </button>
            ))}
          </div>

          <button className="lg:hidden text-gray-500 hover:text-gray-900" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      <div className={`lg:hidden overflow-hidden transition-all duration-300 ease-in-out ${mobileOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="bg-white/95 backdrop-blur-xl border-t border-gray-100">
          <div className="px-4 py-4 space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => { onNavigate(item.id); setMobileOpen(false); }}
                className={cn(
                  'block w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2',
                  activeSection === item.id
                    ? 'text-amber-600 bg-amber-50'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                )}
              >
                {item.special && <Brain className="w-3.5 h-3.5" />}
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
