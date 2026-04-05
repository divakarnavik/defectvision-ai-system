import React, { useState } from 'react';
import { Eye, ChevronRight, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { cn } from '../utils/cn';
import { defectClasses } from '../data/defectClasses';
import { DefectType } from '../types';

const defectVisuals: Record<DefectType, (ctx: CanvasRenderingContext2D) => void> = {
  crack: (ctx: CanvasRenderingContext2D) => {
    ctx.strokeStyle = '#DC2626'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(20, 15); ctx.lineTo(40, 35); ctx.lineTo(35, 55); ctx.lineTo(50, 75); ctx.stroke();
    ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(40, 35); ctx.lineTo(60, 28); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(35, 55); ctx.lineTo(18, 62); ctx.stroke();
  },
  damage: (ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = '#F9731640'; ctx.beginPath(); ctx.ellipse(40, 40, 25, 18, 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#F97316'; ctx.lineWidth = 2; ctx.stroke();
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 5; i++) { const angle = (i / 5) * Math.PI * 2; ctx.beginPath(); ctx.moveTo(40 + Math.cos(angle) * 20, 40 + Math.sin(angle) * 14); ctx.lineTo(40 + Math.cos(angle) * 30, 40 + Math.sin(angle) * 22); ctx.stroke(); }
  },
  broken: (ctx: CanvasRenderingContext2D) => {
    ctx.strokeStyle = '#B91C1C'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(10, 30); ctx.lineTo(30, 35); ctx.lineTo(50, 25); ctx.lineTo(70, 32); ctx.stroke();
    ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(30, 35); ctx.lineTo(25, 60); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(50, 25); ctx.lineTo(55, 55); ctx.stroke();
    ctx.fillStyle = '#B91C1C30'; ctx.fillRect(15, 40, 50, 35);
  },
  scratches: (ctx: CanvasRenderingContext2D) => {
    ctx.strokeStyle = '#10B981'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(10, 20); ctx.lineTo(70, 30); ctx.stroke();
    ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(15, 45); ctx.lineTo(65, 50); ctx.stroke();
    ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(12, 65); ctx.lineTo(68, 62); ctx.stroke();
  },
};

const severityConfig: Record<string, { icon: React.ElementType; colorClass: string; bgClass: string }> = {
  Critical: { icon: AlertTriangle, colorClass: 'text-red-500', bgClass: 'bg-red-50 border-red-200' },
  High: { icon: AlertCircle, colorClass: 'text-orange-500', bgClass: 'bg-orange-50 border-orange-200' },
  Low: { icon: Info, colorClass: 'text-green-500', bgClass: 'bg-green-50 border-green-200' },
};

const DefectClassesSection: React.FC = () => {
  const [selected, setSelected] = useState<DefectType>('crack');
  const defectKeys = Object.keys(defectClasses) as DefectType[];
  const current = defectClasses[selected];
  const severity = severityConfig[current.severity];

  const renderVisual = (type: DefectType) => {
    const canvas = document.createElement('canvas'); canvas.width = 80; canvas.height = 80;
    const ctx = canvas.getContext('2d');
    if (ctx) { ctx.fillStyle = '#1a1a2e'; ctx.fillRect(0, 0, 80, 80); defectVisuals[type](ctx); }
    return canvas.toDataURL();
  };

  return (
    <section id="defects" className="py-24 relative bg-gray-50">
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 mb-4">
            <Eye className="w-3.5 h-3.5 text-amber-600" />
            <span className="text-amber-700 text-xs font-semibold uppercase tracking-wider">Detection Classes</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            4 Defect <span className="bg-gradient-to-r from-amber-500 to-orange-600 bg-clip-text text-transparent">Categories</span>
          </h2>
          <p className="text-gray-500 max-w-2xl mx-auto text-lg">
            Our model detects and classifies 4 types of surface defects with shape-aware analysis for accurate identification.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          <div className="space-y-2">
            {defectKeys.map((key) => {
              const cls = defectClasses[key];
              return (
                <button key={key} onClick={() => setSelected(key)}
                  className={cn('w-full flex items-center gap-4 p-4 rounded-xl border transition-all duration-300 text-left group',
                    selected === key ? 'bg-white border-amber-300 shadow-md' : 'bg-white border-gray-100 hover:border-gray-200 hover:shadow-sm')}>
                  <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 border border-gray-200">
                    <img src={renderVisual(key)} alt={cls.name} className="w-full h-full" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-900 font-semibold text-sm">{cls.name}</span>
                      <span className={cn('text-[10px] px-1.5 py-0.5 rounded border font-bold',
                        cls.severity === 'Critical' ? 'bg-red-50 border-red-200 text-red-500' :
                        cls.severity === 'High' ? 'bg-orange-50 border-orange-200 text-orange-500' :
                        'bg-green-50 border-green-200 text-green-500')}>{cls.severity}</span>
                    </div>
                    <p className="text-gray-400 text-xs mt-0.5 truncate">{cls.description.slice(0, 60)}...</p>
                  </div>
                  <ChevronRight className={cn('w-4 h-4 flex-shrink-0 transition-all', selected === key ? 'text-amber-500' : 'text-gray-300 group-hover:text-gray-400')} />
                </button>
              );
            })}
          </div>

          <div className="lg:col-span-2">
            <div className="p-6 sm:p-8 rounded-2xl bg-white border border-gray-100 shadow-sm h-full">
              <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6 mb-6">
                <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-xl overflow-hidden border-2 flex-shrink-0" style={{ borderColor: current.color + '60' }}>
                  <img src={renderVisual(selected)} alt={current.name} className="w-full h-full" />
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">{current.name}</h3>
                  <div className="flex items-center gap-2 mb-3">
                    <div className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold', severity.bgClass)}>
                      <severity.icon className={cn('w-3.5 h-3.5', severity.colorClass)} />
                      <span className={severity.colorClass}>{current.severity} Severity</span>
                    </div>
                    <div className="w-4 h-4 rounded-full border-2" style={{ borderColor: current.color, backgroundColor: current.color + '40' }} />
                  </div>
                  <p className="text-gray-500 text-sm leading-relaxed">{current.description}</p>
                </div>
              </div>
              <div className="mt-6 p-4 rounded-xl bg-gray-50 border border-gray-100">
                <h4 className="text-gray-900 text-sm font-semibold mb-3">Shape Analysis Parameters</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { label: 'Contour', value: selected === 'scratches' ? 'Linear' : selected === 'crack' ? 'Branching' : selected === 'broken' ? 'Irregular' : 'Compact' },
                    { label: 'Dimension', value: selected === 'damage' || selected === 'broken' || selected === 'crack' ? '3D Depth' : '2D Flat' },
                    { label: 'Aspect Ratio', value: selected === 'scratches' ? 'High (>3.0)' : selected === 'crack' ? 'Variable' : 'Low (~1.0)' },
                    { label: 'Circularity', value: selected === 'damage' ? 'Medium' : selected === 'scratches' ? 'Very Low' : 'Low-Medium' },
                    { label: 'Elongation', value: selected === 'scratches' ? 'High' : selected === 'broken' ? 'Low' : 'Medium' },
                    { label: 'Compactness', value: selected === 'damage' || selected === 'broken' ? 'High' : selected === 'scratches' ? 'Low' : 'Medium' },
                  ].map((param) => (
                    <div key={param.label} className="p-2.5 rounded-lg bg-white border border-gray-100">
                      <div className="text-gray-400 text-[10px] mb-0.5">{param.label}</div>
                      <div className="text-gray-900 text-xs font-semibold">{param.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DefectClassesSection;
