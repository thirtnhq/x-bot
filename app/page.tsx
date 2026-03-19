'use client';

import { useState, useRef, useEffect } from 'react';
import { CategoryTabs, TabId, TABS } from '@/components/CategoryTabs';
import { ResultsTable } from '@/components/ResultsTable';
import { CompareView } from '@/components/CompareView';

import { SubmissionData } from '@/lib/types';
import { Play, Loader2, Sparkles, Terminal, AlertCircle, Database, RefreshCw, Layers, History } from 'lucide-react';


interface AnalysisResult {
  threads: SubmissionData[];
  singleTweets: SubmissionData[];
  memesVisuals: SubmissionData[];
  /** Top 8 with rank, prize, and scoreSnapshot */
  prizeWinners: SubmissionData[];
  /** All scored submissions sorted by finalScore */
  allRanked: SubmissionData[];
  allSubmissions: SubmissionData[];
  analyzedAt: string;
  totalSubmissions: number;
  successfullyAnalyzed: number;
  rawSubmissions?: SubmissionData[];
  fullRawPayload?: Record<string, unknown>;
}


export default function Home() {
  const [view, setView] = useState<'results' | 'compare'>('results');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [progress, setProgress] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<AnalysisResult | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('prizeWinners');
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<string>('');
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isFullProcess, setIsFullProcess] = useState(false);


  
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load initial results on mount
  useEffect(() => {
    const fetchInitialResults = async () => {
      try {
        const response = await fetch('/api/results');
        if (response.ok) {
          const data = await response.json();
          setResults(data);
        }
      } catch (err) {
        console.error('Failed to fetch initial results:', err);
      } finally {
        setIsInitialLoading(false);
      }
    };
    fetchInitialResults();
  }, []);

  const syncData = async (isPartOfFull = false) => {
    setIsSyncing(true);
    if (!isPartOfFull) setIsFullProcess(false);
    setError(null);
    setSyncProgress('Starting sync...');


    try {
      const response = await fetch('/api/submissions/sync');
      if (!response.ok) throw new Error('Sync failed');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      if (!reader) throw new Error('Failed to start sync stream');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine || !trimmedLine.startsWith('data: ')) continue;
          
          try {
            const data = JSON.parse(trimmedLine.substring(6));
            if (data.type === 'progress') {
              setSyncProgress(data.message);
            } else if (data.type === 'complete') {
              setSyncProgress('Sync complete!');
              setIsSyncing(false);
            } else if (data.type === 'error') {
              setError(data.message);
              setIsSyncing(false);
            }
          } catch (e) {
            console.error('Failed to parse SSE line:', trimmedLine, e);
          }
        }
      }
      setIsSyncing(false);
      return true; // Success
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred during sync');
      setIsSyncing(false);
      return false; // Failed
    }
  };

  const runFullAnalysis = async () => {
    setIsFullProcess(true);
    const syncSuccess = await syncData(true);
    if (syncSuccess) {
      await runAnalysis();
    }
    setIsFullProcess(false);
  };



  const runAnalysis = async () => {

    setIsAnalyzing(true);
    setError(null);
    setProgress('Connecting to server...');
    setResults(null);

    try {
      const response = await fetch('/api/analyze');
      
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      if (!reader) throw new Error('Failed to start stream');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        
        // Keep the last partial line in the buffer
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine || !trimmedLine.startsWith('data: ')) continue;
          
          try {
            const data = JSON.parse(trimmedLine.substring(6));
            
            if (data.type === 'progress') {
              setProgress(data.message);
            } else if (data.type === 'complete') {
              console.log('--- FULL RAW API RESPONSE ---');
              console.log(data.data.fullRawPayload);
              console.log('-----------------------------');
              setResults(data.data);
              setIsAnalyzing(false);
            } else if (data.type === 'error') {
              setError(data.message);
              setIsAnalyzing(false);
            }
          } catch (e) {
            console.error('Failed to parse SSE line:', trimmedLine, e);
          }
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred during analysis');
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    if (results && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [results]);

  const getActiveData = (): SubmissionData[] => {
    if (!results) return [];
    switch (activeTab) {
      case 'all_urls':      return results.allSubmissions   ?? [];
      case 'prizeWinners':  return results.prizeWinners     ?? [];
      case 'threads':       return results.threads          ?? [];
      case 'singleTweets':  return results.singleTweets     ?? [];
      case 'memesVisuals':  return results.memesVisuals     ?? [];
      default: return [];
    }
  };


  const getCounts = () => {
    if (!results) return undefined;
    return {
      all_urls:      results.allSubmissions.length,
      prizeWinners:  results.prizeWinners?.length ?? 0,
      threads:       results.threads.length,
      singleTweets:  results.singleTweets.length,
      memesVisuals:  results.memesVisuals.length,
    };
  };


  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 selection:bg-blue-500/30">
      {/* Header and Hero Section */}
      <div className="relative overflow-hidden border-b border-gray-800 bg-gray-900/50">
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center mask-[linear-gradient(180deg,white,rgba(255,255,255,0))]" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 pb-24 text-center z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-sm font-medium mb-6 ring-1 ring-inset ring-blue-500/20">
            <Sparkles className="w-4 h-4" />
            AI-Powered Analysis
          </div>
          
          <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl text-transparent bg-clip-text bg-linear-to-r from-blue-400 via-indigo-400 to-purple-400 mb-6">
            Boundless X Challenge
          </h1>
          <p className="mt-4 text-xl text-gray-400 max-w-3xl mx-auto mb-10 leading-relaxed">
            Cached leaderboard and engagement scoring using <span className="text-gray-200">Replicate (Gemini 3.1 Pro)</span>. 
            <br/><span className="text-sm text-gray-500">Click "Run Full Analysis" to sync data from X and run AI scoring.</span>
          </p>

          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <button
              onClick={runFullAnalysis}
              disabled={isSyncing || isAnalyzing}
              className={`
                group relative inline-flex items-center gap-4 px-10 py-5 text-xl font-bold rounded-2xl overflow-hidden shadow-2xl transition-all duration-500 scale-110 mb-4 sm:mb-0
                ${isFullProcess 
                  ? 'bg-linear-to-r from-blue-500/20 to-indigo-500/20 text-blue-400 cursor-not-allowed border border-blue-500/30' 
                  : (isSyncing || isAnalyzing ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-linear-to-r from-blue-600 via-indigo-600 to-purple-600 text-white hover:scale-115 hover:shadow-indigo-500/50 hover:brightness-110')
                }
              `}
            >
              {isFullProcess ? <Loader2 className="w-7 h-7 animate-spin" /> : <Sparkles className="w-7 h-7 animate-pulse" />}
              <span>{isFullProcess ? 'Processing Everything...' : '🚀 Run Full Analysis'}</span>
              {!isFullProcess && !isSyncing && !isAnalyzing && (
                <div className="absolute inset-x-0 bottom-0 h-1 bg-white/20 animate-progress" />
              )}
            </button>

            <div className="flex flex-col sm:flex-row gap-3 opacity-60 hover:opacity-100 transition-opacity">
              <button
                onClick={() => syncData()}
                disabled={isSyncing || isAnalyzing}
                className={`
                  group inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold rounded-xl transition-all
                  ${isSyncing 
                    ? 'bg-emerald-500/10 text-emerald-400' 
                    : 'bg-gray-900/50 text-gray-400 hover:bg-gray-800 hover:text-white border border-gray-800'
                  }
                `}
              >

                <Database className="w-4 h-4" />
                Sync
              </button>

              <button
                onClick={runAnalysis}
                disabled={isAnalyzing || isSyncing}
                className={`
                  group inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold rounded-xl transition-all
                  ${isAnalyzing 
                    ? 'bg-blue-500/10 text-blue-400' 
                    : 'bg-gray-900/50 text-gray-400 hover:bg-gray-800 hover:text-white border border-gray-800'
                  }
                `}
              >
                <Play className="w-4 h-4" />
                Analyze
              </button>
            </div>
          </div>


          {(isSyncing || isAnalyzing) && (
            <div className="mt-8 max-w-lg mx-auto bg-gray-900/80 backdrop-blur rounded-xl p-4 border border-gray-800 shadow-xl flex items-center gap-4 text-left animate-in fade-in slide-in-from-bottom-4">
              <div className={isSyncing ? "bg-emerald-500/20 p-2 rounded-lg" : "bg-blue-500/20 p-2 rounded-lg"}>
                {isSyncing ? <Database className="w-5 h-5 text-emerald-400" /> : <Terminal className="w-5 h-5 text-blue-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-200 truncate">{isSyncing ? syncProgress : progress}</p>
                <div className="w-full h-1 bg-gray-800 rounded-full mt-2 overflow-hidden">
                  <div className={`h-full rounded-full animate-pulse ${isSyncing ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: '100%' }} />
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Results / Navigation Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pb-32 animate-in fade-in duration-700" id="content">
        
        <div className="flex items-center justify-center gap-4 mb-10 p-1.5 bg-gray-900/80 backdrop-blur rounded-2xl border border-gray-800 w-fit mx-auto">
          <button 
            onClick={() => setView('results')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${view === 'results' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-gray-400 hover:text-gray-200'}`}
          >
            <Layers className="w-4 h-4" />
            Current Results
          </button>
          <button 
            onClick={() => setView('compare')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${view === 'compare' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-gray-400 hover:text-gray-200'}`}
          >
            <History className="w-4 h-4" />
            Compare Runs
          </button>
        </div>

        {view === 'results' ? (
          <>
            {results ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                   <div className="bg-gray-900/50 rounded-2xl p-6 border border-gray-800 flex flex-col justify-center items-center h-full text-center">
                      <h3 className="text-gray-400 text-sm font-medium mb-1">Total Submissions</h3>
                      <p className="text-4xl font-bold bg-clip-text text-transparent bg-linear-to-br from-white to-gray-500">{results.totalSubmissions}</p>
                   </div>
                   
                   <div className="bg-gray-900/50 rounded-2xl p-6 border border-gray-800 flex flex-col justify-center items-center h-full text-center">
                      <h3 className="text-gray-400 text-sm font-medium mb-1">Successfully Analyzed</h3>
                      <div className="flex items-center justify-center gap-3">
                         <p className="text-4xl font-bold bg-clip-text text-transparent bg-linear-to-br from-emerald-400 to-teal-500">{results.successfullyAnalyzed}</p>
                         {results.totalSubmissions > 0 && (
                            <span className="text-sm font-medium px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 ring-1 ring-inset ring-emerald-500/20">
                               {Math.round((results.successfullyAnalyzed / results.totalSubmissions) * 100)}%
                            </span>
                         )}
                      </div>
                   </div>
                   
                   <div className="bg-gray-900/50 rounded-2xl p-6 border border-gray-800 flex flex-col justify-center items-center h-full text-center">
                      <h3 className="text-gray-400 text-sm font-medium mb-1">Analysis Completed</h3>
                      <p className="text-xl font-semibold text-gray-200">
                         {new Date(results.analyzedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                          {new Date(results.analyzedAt).toLocaleDateString()}
                      </p>
                   </div>
                </div>

                <div className="bg-gray-900 rounded-3xl p-2 pb-6 border border-gray-800 shadow-2xl relative">
                  <div className="p-4 sm:p-6 pb-0 mb-6 sticky top-0 bg-gray-900/90 backdrop-blur-xl z-20 rounded-t-3xl border-b border-gray-800">
                    <CategoryTabs 
                      activeTab={activeTab} 
                      onTabChange={setActiveTab} 
                      counts={getCounts()}
                      className="max-w-4xl mx-auto"
                    />
                  </div>
                  
                  <div className="px-2 sm:px-6">
                    <ResultsTable 
                      data={getActiveData()} 
                      emptyMessage={`No submissions found in ${TABS.find(t => t.id === activeTab)?.label}`}
                      categoryName={TABS.find(t => t.id === activeTab)?.label || 'Category'}
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-24 bg-gray-900/20 rounded-3xl border border-dashed border-gray-800">
                <Database className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-300 mb-2">Ready to Start Analysis</h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  To get started, first Sync Data from X to cache all submissions, then run the AI Analysis.
                </p>
              </div>
            )}
          </>
        ) : (
          <CompareView />
        )}
        <div ref={bottomRef} />
      </section>


      <style dangerouslySetInnerHTML={{__html: `
        @keyframes progress {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(0); }
          100% { transform: translateX(100%); }
        }
        .animate-progress {
          animation: progress 2s infinite linear;
        }
        /* Hide scrollbar for images container but allow scrolling */
        .pb-scrollbar-hide::-webkit-scrollbar {
            display: none;
        }
        .pb-scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
        }
      `}} />

    </main>
  );
}
