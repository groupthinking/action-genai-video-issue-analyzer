'use client';

import { useState } from 'react';

interface Contract {
  id: string;
  title: string;
  agency: string;
  postedDate: string;
  analysis?: {
    relevanceScore: number;
    recommendedAction: string;
    estimatedValue: string;
  };
}

export default function HomePage() {
  const [loading, setLoading] = useState(false);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [summary, setSummary] = useState<any>(null);

  const runAgents = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/run-agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          searchTerms: ['IT services', 'cybersecurity', 'cloud computing'],
        }),
      });

      const data = await response.json();
      setContracts(data.contracts || []);
      setSummary(data.summary);
    } catch (error) {
      console.error('Error running agents:', error);
      alert('Failed to run agents. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-6xl font-bold bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent mb-4">
            Government Bidding AI Agent
          </h1>
          <p className="text-xl text-gray-300">
            Vertical AI Agent that replaces your government bidding team
          </p>
        </div>

        {/* Control Panel */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 mb-8 border border-white/20">
          <button
            onClick={runAgents}
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 disabled:from-gray-500 disabled:to-gray-600 text-white font-bold py-4 px-8 rounded-xl transition-all transform hover:scale-105 disabled:scale-100"
          >
            {loading ? '🤖 Agents Working...' : '🚀 Run AI Agents'}
          </button>

          {summary && (
            <div className="mt-6 grid grid-cols-3 gap-4">
              <div className="bg-blue-500/20 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-blue-300">{summary.contractsFound}</div>
                <div className="text-sm text-gray-300">Contracts Found</div>
              </div>
              <div className="bg-purple-500/20 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-purple-300">{summary.contractsAnalyzed}</div>
                <div className="text-sm text-gray-300">Analyzed</div>
              </div>
              <div className="bg-green-500/20 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-green-300">{summary.bidsGenerated}</div>
                <div className="text-sm text-gray-300">Bids Generated</div>
              </div>
            </div>
          )}
        </div>

        {/* Contracts List */}
        {contracts.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-white mb-4">📋 Discovered Contracts</h2>
            {contracts.map((contract) => (
              <div
                key={contract.id}
                className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 hover:border-cyan-400/50 transition-all"
              >
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-xl font-semibold text-white flex-1">{contract.title}</h3>
                  {contract.analysis && (
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                        contract.analysis.relevanceScore >= 70
                          ? 'bg-green-500/20 text-green-300'
                          : contract.analysis.relevanceScore >= 50
                          ? 'bg-yellow-500/20 text-yellow-300'
                          : 'bg-red-500/20 text-red-300'
                      }`}>
                        Score: {contract.analysis.relevanceScore}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                        contract.analysis.recommendedAction === 'Bid'
                          ? 'bg-blue-500/20 text-blue-300'
                          : 'bg-gray-500/20 text-gray-300'
                      }`}>
                        {contract.analysis.recommendedAction}
                      </span>
                    </div>
                  )}
                </div>
                <div className="text-gray-300 text-sm space-y-1">
                  <p>🏛️ Agency: {contract.agency}</p>
                  <p>📅 Posted: {new Date(contract.postedDate).toLocaleDateString()}</p>
                  {contract.analysis?.estimatedValue && (
                    <p>💰 Value: {contract.analysis.estimatedValue}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && contracts.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-xl">Click "Run AI Agents" to discover government contracts</p>
          </div>
        )}
      </div>
    </main>
  );
}
