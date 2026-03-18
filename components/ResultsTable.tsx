'use client';

import { useState } from 'react';
import { SubmissionData } from '@/lib/types';
import { ScoreBar } from './ScoreBar';
import { ChevronDown, ChevronUp, ExternalLink, Image as ImageIcon, MessageCircle, Repeat2, Heart, Bookmark, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';

interface ResultsTableProps {
  data: SubmissionData[];
  emptyMessage?: string;
  categoryName: string;
}

type SortField = 'finalScore' | 'overall' | 'engagement' | 'clarity' | 'creativity';
type SortOrder = 'asc' | 'desc';

export function ResultsTable({ data, emptyMessage = 'No submissions found.', categoryName }: ResultsTableProps) {
  const [sortField, setSortField] = useState<SortField>('finalScore');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ChevronDown className="w-4 h-4 opacity-20" />;
    return sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />;
  };

  const sortedData = [...data].sort((a, b) => {
    let valA = 0;
    let valB = 0;

    switch (sortField) {
      case 'finalScore':
        valA = a.finalScore || 0;
        valB = b.finalScore || 0;
        break;
      case 'overall':
      case 'clarity':
      case 'creativity':
      case 'engagement':
        valA = a.aiScores?.[sortField] || 0;
        valB = b.aiScores?.[sortField] || 0;
        break;
    }

    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const exportCSV = () => {
    const headers = [
      'Rank', 'Submitted By', 'X Handle', 'Tweet Link', 'Category',
      'Clarity (10)', 'Creativity (10)', 'Engagement Potential (10)',
      'AI Overall (100)', 'Real Engagement Score (100)', 'Final Weighted Score (100)'
    ].join(',');

    const rows = sortedData.map((row, index) => {
      return [
        index + 1,
        `"${row.submittedBy.replace(/"/g, '""')}"`,
        row.xHandle,
        row.tweetUrl,
        row.category || 'unknown',
        row.aiScores?.clarity || 0,
        row.aiScores?.creativity || 0,
        row.aiScores?.engagement || 0,
        row.aiScores?.overall || 0,
        row.engagementScore || 0,
        row.finalScore || 0
      ].join(',');
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `boundless_${categoryName.toLowerCase().replace(/\s+/g, '_')}_results.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-gray-400 bg-gray-800/50 rounded-xl border border-gray-700/50">
        <div className="text-4xl mb-4 opacity-50">📭</div>
        <p>{emptyMessage}</p>
      </div>
    );
  }

  const isAllSubmissions = categoryName === 'All Submissions';

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-4 items-center">
        {isAllSubmissions && (
          <span className="text-xs text-gray-500 bg-gray-900/50 px-3 py-2 rounded-lg border border-gray-700/30">
            Note: Profile-only submissions are listed but skip AI scoring.
          </span>
        )}
        <button
          onClick={exportCSV}
          className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-700 hover:text-white transition-colors flex items-center gap-2"
        >
          Download CSV
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-700/50 shadow-xl bg-gray-800/80 backdrop-blur-sm">
        <table className="w-full text-sm text-left">
          <thead className="text-xs uppercase bg-gray-900/80 text-gray-400 sticky top-0 z-10 border-b border-gray-700">
            <tr>
              <th className="px-4 py-4 w-12 text-center text-gray-500 font-bold">#</th>
              <th className="px-4 py-4 min-w-[200px]">Submission / Author</th>
              <th className="px-4 py-4 w-32">Real Metrics</th>
              
              {!isAllSubmissions && (
                <>
                  <th 
                    className="px-3 py-4 cursor-pointer hover:bg-gray-800/80 hover:text-blue-400 transition-colors group"
                    onClick={() => handleSort('creativity')}
                    title="Creativity (35% weight)"
                  >
                    <div className="flex items-center gap-1 justify-center">
                      <span>Cre</span>
                      {getSortIcon('creativity')}
                    </div>
                  </th>
                  <th 
                    className="px-3 py-4 cursor-pointer hover:bg-gray-800/80 hover:text-blue-400 transition-colors group"
                    onClick={() => handleSort('clarity')}
                    title="Clarity & Message (35% weight)"
                  >
                    <div className="flex items-center gap-1 justify-center">
                      <span>Cla</span>
                      {getSortIcon('clarity')}
                    </div>
                  </th>
                  <th 
                    className="px-3 py-4 cursor-pointer hover:bg-gray-800/80 hover:text-blue-400 transition-colors group"
                    onClick={() => handleSort('engagement')}
                    title="Engagement Potential (30% weight)"
                  >
                    <div className="flex items-center gap-1 justify-center">
                      <span>Eng</span>
                      {getSortIcon('engagement')}
                    </div>
                  </th>
                  
                  <th 
                    className="px-4 py-4 cursor-pointer hover:bg-gray-800/80 hover:text-indigo-400 transition-colors border-l border-gray-700/50 w-24"
                    onClick={() => handleSort('overall')}
                    title="Weighted AI Total (0-100)"
                  >
                    <div className="flex items-center gap-1 justify-center font-bold text-indigo-400/80 group-hover:text-indigo-400">
                      <span>AI Total</span>
                      {getSortIcon('overall')}
                    </div>
                  </th>

                  <th 
                    className="px-5 py-4 cursor-pointer hover:bg-gray-800/80 hover:text-emerald-400 transition-colors bg-gray-800/30 border-l border-gray-600/30 w-36"
                    onClick={() => handleSort('finalScore')}
                    title="70% AI Total + 30% Real Engagement"
                  >
                    <div className="flex items-center gap-2 justify-end font-bold text-emerald-400/90 text-sm">
                      <span>Final Score</span>
                      {getSortIcon('finalScore')}
                    </div>
                  </th>
                </>
              )}
              {isAllSubmissions && (
                <th className="px-5 py-4 text-right text-gray-500 font-bold border-l border-gray-600/30">Analysis Status</th>
              )}
            </tr>
          </thead>


          <tbody>
            {sortedData.map((row, index) => (
              <tr 
                key={row.id} 
                className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors"
                style={{ animationFillMode: 'both', animationDelay: `${index * 50}ms` }}
              >
                <td className="px-4 py-3 text-center text-gray-500 font-medium">
                  {index + 1}
                </td>
                
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1">
                    <div className="font-medium text-gray-200">{row.submittedBy}</div>
                    <div className="text-xs text-gray-400">@{row.xHandle}</div>
                    <a 
                      href={row.tweetUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 mt-1 truncate max-w-[250px]"
                      title={row.tweetUrl}
                    >
                      <ExternalLink className="w-3 h-3 shrink-0" />
                      <span className="truncate">{row.tweetUrl}</span>
                    </a>
                    {/* Hover tooltip for reasoning */}
                    {row.aiScores?.reasoning && (
                      <div className="group relative mt-2 inline-block">
                        <span className="text-[10px] bg-indigo-900/50 text-indigo-200 px-2 py-0.5 rounded border border-indigo-700/50 cursor-help">
                          AI Reasoning
                        </span>
                        <div className="absolute left-0 bottom-full mb-2 hidden w-64 p-3 bg-gray-900 border border-gray-600 rounded-lg shadow-xl text-xs text-gray-300 group-hover:block z-50 pointer-events-none">
                          {row.aiScores.reasoning}
                        </div>
                      </div>
                    )}
                  </div>
                </td>
                
                <td className="px-4 py-3 flex items-center justify-center">
                    <TweetEngagementMetrics row={row} />
                </td>

                {!isAllSubmissions && (
                  <>
                    <ScoreCell score={row.aiScores?.creativity} max={10} />
                    <ScoreCell score={row.aiScores?.clarity} max={10} />
                    <ScoreCell score={row.aiScores?.engagement} max={10} />
                    
                    <td className="px-4 py-3 text-center font-bold text-indigo-300 border-l border-gray-700/50">
                      {row.aiScores?.overall || 0} <span className="text-gray-600 font-normal text-xs">/100</span>
                    </td>

                    <td className="px-5 py-3 border-l border-gray-600/30 bg-gray-800/20">
                      <ScoreBar 
                        score={row.finalScore || 0} 
                        showValue={true} 
                        className="justify-end w-full"
                      />
                    </td>
                  </>
                )}


                {isAllSubmissions && (
                  <td className="px-5 py-3 text-right border-l border-gray-600/30">
                    {row.finalScore !== undefined ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium ring-1 ring-inset ring-emerald-500/20">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Analyzed
                      </span>
                    ) : row.isProfile ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-medium ring-1 ring-inset ring-blue-500/20">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        Profile Only
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-500 text-xs font-medium ring-1 ring-inset ring-amber-500/20">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        Queued / Failed
                      </span>
                    )}
                  </td>
                )}

              </tr>

            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ScoreCell({ score, max = 10 }: { score?: number, max?: number }) {
  const val = score || 0;
  // Color scale from deep red to bright green
  const hue = ((val / max) * 120).toString(10);
  
  return (
    <td className="px-2 py-3 text-center">
      <div 
        className="inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm"
        style={{ 
          backgroundColor: `hsl(${hue}, 80%, 15%)`,
          color: `hsl(${hue}, 80%, 80%)`,
          border: `1px solid hsl(${hue}, 80%, 30%)`
        }}
        title={`${val}/${max}`}
      >
        {val}
      </div>
    </td>
  );
}

function TweetEngagementMetrics({ row }: { row: SubmissionData }) {
   if (!row.tweetData?.metrics) return <span className="text-gray-600 text-xs">No metrics</span>;

   let totalMetrics = { ...row.tweetData.metrics };
   if (row.category === 'thread' && row.threadTweets && row.threadTweets.length > 0) {
      for (const t of row.threadTweets) {
          totalMetrics.retweets += t.metrics.retweets;
          totalMetrics.quotes += t.metrics.quotes;
          totalMetrics.bookmarks += t.metrics.bookmarks;
          totalMetrics.replies += t.metrics.replies;
          totalMetrics.likes += t.metrics.likes;
          totalMetrics.impressions += t.metrics.impressions;
      }
   }

   const m = totalMetrics;

   return (
       <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[10px] text-gray-400 w-full min-w-[90px]">
           <div className="flex items-center gap-1.5" title="Likes">
               <Heart className="w-3 h-3 text-rose-500/70" /> {m.likes.toLocaleString()}
           </div>
           <div className="flex items-center gap-1.5" title="Retweets">
               <Repeat2 className="w-3 h-3 text-emerald-500/70" /> {m.retweets.toLocaleString()}
           </div>
           <div className="flex items-center gap-1.5" title="Replies">
               <MessageCircle className="w-3 h-3 text-blue-500/70" /> {m.replies.toLocaleString()}
           </div>
           <div className="flex items-center gap-1.5" title="Bookmarks">
               <Bookmark className="w-3 h-3 text-indigo-500/70" /> {m.bookmarks.toLocaleString()}
           </div>
           
           {(row.tweetData.mediaUrls?.length > 0 || (row.threadTweets && row.threadTweets.some((t: any) => t.mediaUrls?.length > 0))) && (
              <div className="col-span-2 mt-1">
                 <div className="flex gap-1 overflow-x-auto pb-1 pb-scrollbar-hide">
                    {row.tweetData.mediaUrls.map((url, i) => (
                       <Image key={`${row.id}-main-img-${i}`} src={url} alt="Media preview" width={32} height={32} className="rounded object-cover h-8 w-8 shrink-0 border border-gray-700/50" unoptimized />
                    ))}
                    {row.threadTweets?.flatMap(t => t.mediaUrls).map((url, i) => (
                       <Image key={`${row.id}-thread-img-${i}`} src={url} alt="Media preview" width={32} height={32} className="rounded object-cover h-8 w-8 shrink-0 border border-gray-700/50" unoptimized />
                    ))}
                 </div>
              </div>
           )}
       </div>
   );
}
