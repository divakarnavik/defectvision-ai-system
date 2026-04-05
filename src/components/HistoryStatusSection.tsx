import React, { useState } from 'react';
import {
  Clock, CheckCircle, XCircle, Activity, BarChart3,
  Trash2, Filter, X, Image as ImageIcon
} from 'lucide-react';
import { cn } from '../utils/cn';
import { useAppContext } from '../context/AppContext';

const HistoryStatusSection: React.FC = () => {
  const { history, clearHistory } = useAppContext();
  const [filter, setFilter] = useState<'all' | 'defect' | 'pass'>('all');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const filtered = history.filter(h => {
    if (filter === 'defect') return h.verdict === 'DEFECT';
    if (filter === 'pass') return h.verdict === 'PASS';
    return true;
  });

  const totalInspections = history.length;
  const defectCount = history.filter(h => h.verdict === 'DEFECT').length;
  const passCount = history.filter(h => h.verdict === 'PASS').length;
  const detectionRate = totalInspections > 0 ? ((defectCount / totalInspections) * 100).toFixed(1) : '0.0';
  const avgConfidence = totalInspections > 0
    ? (history.reduce((s, h) => s + h.confidence, 0) / totalInspections * 100).toFixed(1) : '0.0';
  const avgLatency = totalInspections > 0
    ? (history.reduce((s, h) => s + h.processingTime, 0) / totalInspections).toFixed(0) : '0';

  return (
    <section id="history" className="py-24 relative bg-gray-50">
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 mb-4">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span className="text-amber-700 text-xs font-semibold uppercase tracking-wider">History & Status</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Inspection <span className="bg-gradient-to-r from-amber-500 to-orange-600 bg-clip-text text-transparent">History</span>
          </h2>
          <p className="text-gray-500 max-w-2xl mx-auto text-lg">
            View past inspections with saved images, filter results, and monitor system metrics.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-6 gap-2 sm:gap-3 mb-8">
          {[
            { label: 'Total', value: totalInspections, color: 'text-gray-900', bg: 'bg-white', border: 'border-gray-100' },
            { label: 'Defects', value: defectCount, color: 'text-red-500', bg: 'bg-white', border: 'border-red-100' },
            { label: 'Passed', value: passCount, color: 'text-green-500', bg: 'bg-white', border: 'border-green-100' },
            { label: 'Det. Rate', value: detectionRate + '%', color: 'text-orange-500', bg: 'bg-white', border: 'border-orange-100' },
            { label: 'Avg Conf', value: avgConfidence + '%', color: 'text-amber-600', bg: 'bg-white', border: 'border-amber-100' },
            { label: 'Avg Latency', value: avgLatency + 'ms', color: 'text-gray-600', bg: 'bg-white', border: 'border-gray-100' },
          ].map(s => (
            <div key={s.label} className={cn('p-4 rounded-xl border text-center shadow-sm', s.bg, s.border)}>
              <div className="text-gray-400 text-xs mb-1">{s.label}</div>
              <div className={cn('font-bold text-2xl', s.color)}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            {(['all', 'defect', 'pass'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={cn('px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border',
                  filter === f ? 'bg-amber-50 border-amber-300 text-amber-700' : 'bg-white border-gray-200 text-gray-500 hover:text-gray-900')}>
                {f === 'all' ? 'All' : f === 'defect' ? 'Defects Only' : 'Passed Only'}
              </button>
            ))}
          </div>
          {history.length > 0 && (
            <button onClick={clearHistory}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 border border-red-200 text-red-500 text-xs font-semibold hover:bg-red-100 transition-all">
              <Trash2 className="w-3 h-3" /> Clear
            </button>
          )}
        </div>

        {/* History Table */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Activity className="w-12 h-12 mb-4 opacity-30" />
            <p className="text-lg font-medium mb-1 text-gray-500">No inspections yet</p>
            <p className="text-sm">Go to the Inspect page to analyze images, videos, or webcam feeds. Results appear here automatically.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-gray-200 shadow-sm bg-white -mx-4 sm:mx-0">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left text-gray-500 font-medium px-4 py-3 text-xs">Image</th>
                  <th className="text-left text-gray-500 font-medium px-4 py-3 text-xs">Time</th>
                  <th className="text-left text-gray-500 font-medium px-4 py-3 text-xs">Mode</th>
                  <th className="text-left text-gray-500 font-medium px-4 py-3 text-xs">Verdict</th>
                  <th className="text-left text-gray-500 font-medium px-4 py-3 text-xs">Defects</th>
                  <th className="text-left text-gray-500 font-medium px-4 py-3 text-xs">Types</th>
                  <th className="text-left text-gray-500 font-medium px-4 py-3 text-xs">Confidence</th>
                  <th className="text-left text-gray-500 font-medium px-4 py-3 text-xs">Time (ms)</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(h => (
                  <tr key={h.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      {h.image ? (
                        <img
                          src={h.image}
                          alt="inspection"
                          className="w-14 h-10 rounded object-cover border border-gray-200 cursor-pointer hover:border-amber-400 transition-all hover:scale-110"
                          onClick={() => setSelectedImage(h.image!)}
                        />
                      ) : (
                        <div className="w-14 h-10 rounded bg-gray-100 border border-gray-200 flex items-center justify-center">
                          <ImageIcon className="w-4 h-4 text-gray-400" />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{h.timestamp}</td>
                    <td className="px-4 py-3">
                      <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium border',
                        h.mode === 'image' ? 'bg-gray-50 border-gray-200 text-gray-600' :
                        h.mode === 'video' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                        h.mode === 'esp32' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                        'bg-green-50 border-green-200 text-green-700')}>
                        {h.mode}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('flex items-center gap-1.5 text-xs font-bold',
                        h.verdict === 'DEFECT' ? 'text-red-500' : 'text-green-500')}>
                        {h.verdict === 'DEFECT' ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                        {h.verdict}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-900 font-bold">{h.defectCount}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {h.defectTypes.length > 0 ? h.defectTypes.slice(0, 3).map((t, i) => (
                          <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 border border-gray-200 text-gray-600">{t}</span>
                        )) : <span className="text-gray-400 text-xs">-</span>}
                        {h.defectTypes.length > 3 && <span className="text-gray-400 text-[10px]">+{h.defectTypes.length - 3}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-amber-600 font-mono text-xs">{h.confidence > 0 ? (h.confidence * 100).toFixed(1) + '%' : '-'}</td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{h.processingTime}ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Summary bar */}
        {history.length > 0 && (
          <div className="mt-6 p-4 rounded-xl bg-white border border-gray-200 shadow-sm flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-amber-500" />
              <span className="text-gray-500 text-sm">{totalInspections} total inspections</span>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="text-green-500 font-medium">{passCount} passed</span>
              <span className="text-red-500 font-medium">{defectCount} defects found</span>
              <span className="text-amber-600 font-medium">avg {avgConfidence}% confidence</span>
            </div>
          </div>
        )}
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setSelectedImage(null)}>
          <div className="relative max-w-3xl max-h-[80vh] mx-4" onClick={e => e.stopPropagation()}>
            <button onClick={() => setSelectedImage(null)}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white border border-gray-200 shadow-md flex items-center justify-center text-gray-400 hover:text-gray-900 transition-all z-10">
              <X className="w-4 h-4" />
            </button>
            <img src={selectedImage} alt="Inspection detail" className="rounded-xl border border-gray-200 shadow-xl max-h-[75vh] object-contain" />
          </div>
        </div>
      )}
    </section>
  );
};

export default HistoryStatusSection;
