import React, { useState, useEffect } from 'react';
import { SubmissionData } from '@/lib/types';
import { History, ArrowRight, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface AnalysisResult {
  id: string;
  analyzedAt: string;
  allSubmissions: SubmissionData[];
}

export function CompareView() {
  const [history, setHistory] = useState<AnalysisResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedA, setSelectedA] = useState<string>('');
  const [selectedB, setSelectedB] = useState<string>('');

  useEffect(() => {
    fetch('/api/analysis/history')
      .then(res => res.json())
      .then(data => {
        setHistory(data);
        if (data.length >= 2) {
          setSelectedA(data[0].id);
          setSelectedB(data[1].id);
        } else if (data.length === 1) {
          setSelectedA(data[0].id);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-center text-gray-400">Loading history...</div>;
  if (history.length === 0) return <div className="p-8 text-center text-gray-400">No analysis history found. Run an analysis first.</div>;

  const runA = history.find(h => h.id === selectedA);
  const runB = history.find(h => h.id === selectedB);

  const getComparison = () => {
    if (!runA || !runB) return [];
    
    return runA.allSubmissions.map(subA => {
      const subB = runB.allSubmissions.find(s => s.id === subA.id);
      return {
        id: subA.id,
        name: subA.submittedBy,
        handle: subA.xHandle,
        scoreA: subA.finalScore || 0,
        scoreB: subB?.finalScore || 0,
        diff: (subA.finalScore || 0) - (subB?.finalScore || 0)
      };
    }).sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff)); // Sort by largest change
  };

  const comparison = getComparison();

  return (
    <div className="space-y-8 py-6">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-gray-900/50 p-6 rounded-2xl border border-gray-800">
        <div className="flex items-center gap-4 flex-1">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">Analysis A (Main)</label>
            <select 
              value={selectedA} 
              onChange={(e) => setSelectedA(e.target.value)}
              className="w-full bg-gray-950 border border-gray-700 rounded-xl px-4 py-2 text-sm text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            >
              {history.map(h => (
                <option key={h.id} value={h.id}>
                  {new Date(h.analyzedAt).toLocaleString()} ({h.id.slice(-8)})
                </option>
              ))}
            </select>
          </div>
          <ArrowRight className="w-5 h-5 text-gray-600 mt-6" />
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">Analysis B (Baseline)</label>
            <select 
              value={selectedB} 
              onChange={(e) => setSelectedB(e.target.value)}
              className="w-full bg-gray-950 border border-gray-700 rounded-xl px-4 py-2 text-sm text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            >
              <option value="">Select baseline...</option>
              {history.map(h => (
                <option key={h.id} value={h.id} disabled={h.id === selectedA}>
                  {new Date(h.analyzedAt).toLocaleString()} ({h.id.slice(-8)})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {runA && runB ? (
        <div className="overflow-hidden rounded-2xl border border-gray-800 bg-gray-900/30">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-900/80 border-b border-gray-800">
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Participant</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Score A</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Score B</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Variance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {comparison.map(item => (
                <tr key={item.id} className="hover:bg-gray-800/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-200">{item.name}</div>
                    <div className="text-xs text-gray-500">@{item.handle}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-sm font-medium">
                      {item.scoreA.toFixed(1)}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-400">
                    {item.scoreB.toFixed(1)}
                  </td>
                  <td className="px-6 py-4">
                    <div className={`flex items-center gap-1.5 text-sm font-bold ${
                      item.diff > 0 ? 'text-emerald-400' : item.diff < 0 ? 'text-rose-400' : 'text-gray-500'
                    }`}>
                      {item.diff > 0 ? <TrendingUp className="w-4 h-4" /> : item.diff < 0 ? <TrendingDown className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                      {item.diff === 0 ? 'Stable' : `${item.diff > 0 ? '+' : ''}${item.diff.toFixed(1)}`}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-20 bg-gray-900/20 rounded-2xl border border-dashed border-gray-800">
          <History className="w-12 h-12 text-gray-700 mx-auto mb-4" />
          <p className="text-gray-500">Select two analysis runs to see score consistency.</p>
        </div>
      )}
    </div>
  );
}
