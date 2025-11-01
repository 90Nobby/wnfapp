'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';
import { Share2 } from 'lucide-react';

interface User {
  userId: string;
  firstName: string;
  lastName: string;
  username: string;
  isManager: boolean;
  balance: number;
  gamesPlayed: number;
}

interface Match {
  matchId: string;
  date: string;
  time: string;
  location: string;
  status: string;
}

interface Player {
  userId: string;
  firstName: string;
  lastName: string;
  username: string;
  status: string;
  wasReserveLastMatch: boolean;
}

type Tab = 'matches' | 'players';

export default function ManagerDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('matches');
  const [loading, setLoading] = useState(true);

  // Match management
  const [matches, setMatches] = useState<Match[]>([]);
  const [showCreateMatch, setShowCreateMatch] = useState(false);
  const [matchForm, setMatchForm] = useState({
    date: '',
    time: '',
    location: '',
  });
  const [selectedMatch, setSelectedMatch] = useState<string | null>(null);
  const [matchDetails, setMatchDetails] = useState<any>(null);

  // Player management
  const [players, setPlayers] = useState<User[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<User | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');

  // Toast notifications
  const { showToast, ToastComponent } = useToast();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me');

      if (!response.ok) {
        router.push('/join');
        return;
      }

      const userData = await response.json();

      if (!userData.isManager) {
        router.push('/');
        return;
      }

      setUser(userData);
      await loadMatches();
      await loadPlayers();
    } catch (error) {
      console.error('Auth check error:', error);
      router.push('/join');
    } finally {
      setLoading(false);
    }
  };

  const loadMatches = async () => {
    try {
      const response = await fetch('/api/matches');
      if (response.ok) {
        const data = await response.json();
        setMatches(data);
      }
    } catch (error) {
      console.error('Load matches error:', error);
    }
  };

  const loadPlayers = async () => {
    try {
      const response = await fetch('/api/players');
      if (response.ok) {
        const data = await response.json();
        setPlayers(data);
      }
    } catch (error) {
      console.error('Load players error:', error);
    }
  };

  const loadMatchDetails = async (matchId: string) => {
    try {
      const response = await fetch(`/api/matches/${matchId}`);
      if (response.ok) {
        const data = await response.json();
        setMatchDetails(data);
      }
    } catch (error) {
      console.error('Load match details error:', error);
    }
  };

  const handleCreateMatch = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch('/api/matches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(matchForm),
      });

      if (response.ok) {
        const data = await response.json();
        setShowCreateMatch(false);
        setMatchForm({ date: '', time: '', location: '' });
        await loadMatches();

        // Share the match
        await shareMatch(data);
      }
    } catch (error) {
      console.error('Create match error:', error);
    }
  };

  const shareMatch = async (matchData: any) => {
    const { shareText, shareUrl } = matchData;
    const fullShareText = `${shareText}\n${shareUrl}`;

    const shareData = {
      title: 'WNF Match',
      text: fullShareText,
      url: shareUrl,
    };

    try {
      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        // Mobile: use native share
        await navigator.share(shareData);
        showToast('Match shared successfully!');
      } else {
        // Desktop: copy to clipboard
        await navigator.clipboard.writeText(fullShareText);
        showToast('Match link copied to clipboard!');
      }
    } catch (err: any) {
      // User cancelled or error occurred
      if (err.name !== 'AbortError') {
        // Fallback to clipboard
        try {
          await navigator.clipboard.writeText(fullShareText);
          showToast('Match link copied to clipboard!');
        } catch (clipboardErr) {
          showToast('Failed to share match', 'error');
        }
      }
    }
  };

  const handleGenerateTeams = async (matchId: string) => {
    try {
      const response = await fetch('/api/teams', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ matchId }),
      });

      if (response.ok) {
        await loadMatchDetails(matchId);
        alert('Teams generated!');
      }
    } catch (error) {
      console.error('Generate teams error:', error);
    }
  };

  const handleCompleteMatch = async (matchId: string) => {
    if (!confirm('Mark this match as completed? This will charge all players £4.')) {
      return;
    }

    try {
      const response = await fetch(`/api/matches/${matchId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'completed' }),
      });

      if (response.ok) {
        await loadMatches();
        await loadPlayers();
        setSelectedMatch(null);
        setMatchDetails(null);
        alert('Match marked as completed and players charged!');
      }
    } catch (error) {
      console.error('Complete match error:', error);
    }
  };

  const handleRecordPayment = async () => {
    if (!selectedPlayer || !paymentAmount) return;

    try {
      const response = await fetch(`/api/players/${selectedPlayer.userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'payment',
          amount: parseFloat(paymentAmount),
        }),
      });

      if (response.ok) {
        await loadPlayers();
        setSelectedPlayer(null);
        setPaymentAmount('');
        alert('Payment recorded!');
      }
    } catch (error) {
      console.error('Record payment error:', error);
    }
  };

  const shareTeams = () => {
    if (!matchDetails || !matchDetails.teams.length) return;

    const blueTeam = matchDetails.teams
      .filter((t: any) => t.team === 'blue')
      .map((t: any) => t.firstName)
      .join(', ');

    const redTeam = matchDetails.teams
      .filter((t: any) => t.team === 'red')
      .map((t: any) => t.firstName)
      .join(', ');

    const shareText = `Teams for tonight:\n\n🔵 Blue: ${blueTeam}\n\n🔴 Red: ${redTeam}`;

    navigator.clipboard.writeText(shareText);
    alert('Teams copied to clipboard!');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-blue-600 text-white shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">🎯 Manager Dashboard</h1>
              <p className="text-blue-100">@{user?.username}</p>
            </div>
            <button
              onClick={() => router.push('/')}
              className="bg-blue-700 hover:bg-blue-800 px-4 py-2 rounded-lg font-medium"
            >
              Player View
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex gap-6">
            <button
              onClick={() => setActiveTab('matches')}
              className={`py-4 px-2 border-b-2 font-medium transition-colors ${
                activeTab === 'matches'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Matches
            </button>
            <button
              onClick={() => setActiveTab('players')}
              className={`py-4 px-2 border-b-2 font-medium transition-colors ${
                activeTab === 'players'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Players
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {activeTab === 'matches' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Matches</h2>
              <button
                onClick={() => setShowCreateMatch(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg"
              >
                + Create Match
              </button>
            </div>

            {showCreateMatch && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-2xl p-6 w-full max-w-md">
                  <h3 className="text-xl font-bold mb-4">Create New Match</h3>
                  <form onSubmit={handleCreateMatch} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Date
                      </label>
                      <input
                        type="date"
                        required
                        value={matchForm.date}
                        onChange={(e) => setMatchForm({ ...matchForm, date: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Time
                      </label>
                      <input
                        type="time"
                        required
                        value={matchForm.time}
                        onChange={(e) => setMatchForm({ ...matchForm, time: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Location
                      </label>
                      <input
                        type="text"
                        required
                        value={matchForm.location}
                        onChange={(e) => setMatchForm({ ...matchForm, location: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                        placeholder="Powerleague Arena"
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        type="submit"
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg"
                      >
                        Create
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowCreateMatch(false)}
                        className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 rounded-lg"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {matches.map((match) => (
                <div key={match.matchId} className="bg-white rounded-lg shadow p-5">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-lg">
                        {new Date(match.date).toLocaleDateString('en-GB', { weekday: 'long' })} -{' '}
                        {match.time}
                      </h3>
                      <p className="text-gray-600">{match.location}</p>
                      <p className="text-sm text-gray-500 mt-1">
                        Status: <span className="font-medium">{match.status}</span>
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedMatch(match.matchId);
                        loadMatchDetails(match.matchId);
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
                    >
                      Manage
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {selectedMatch && matchDetails && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
                <div className="bg-white rounded-2xl p-6 w-full max-w-4xl my-8">
                  <div className="flex justify-between items-start mb-6">
                    <h3 className="text-2xl font-bold">Manage Match</h3>
                    <button
                      onClick={() => {
                        setSelectedMatch(null);
                        setMatchDetails(null);
                      }}
                      className="text-gray-500 hover:text-gray-700 text-2xl"
                    >
                      ×
                    </button>
                  </div>

                  <div className="mb-6">
                    <h4 className="font-bold text-lg mb-3">
                      Availability ({matchDetails.availability.length} players)
                    </h4>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {matchDetails.availability.map((player: Player, index: number) => (
                        <div
                          key={player.userId}
                          className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-gray-600 font-mono">{index + 1}.</span>
                            <span className="font-medium">
                              {player.firstName} {player.lastName}
                            </span>
                            {player.wasReserveLastMatch && (
                              <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                                Priority
                              </span>
                            )}
                          </div>
                          <span
                            className={`text-sm font-medium px-3 py-1 rounded ${
                              player.status === 'confirmed'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {player.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {matchDetails.teams.length > 0 && (
                    <div className="mb-6">
                      <h4 className="font-bold text-lg mb-3">Teams</h4>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="bg-blue-50 rounded-lg p-4">
                          <h5 className="font-bold text-blue-900 mb-2">🔵 Blue Team</h5>
                          <div className="space-y-1">
                            {matchDetails.teams
                              .filter((t: any) => t.team === 'blue')
                              .map((t: any) => (
                                <div key={t.id} className="text-blue-800">
                                  {t.firstName} {t.lastName}
                                </div>
                              ))}
                          </div>
                        </div>
                        <div className="bg-red-50 rounded-lg p-4">
                          <h5 className="font-bold text-red-900 mb-2">🔴 Red Team</h5>
                          <div className="space-y-1">
                            {matchDetails.teams
                              .filter((t: any) => t.team === 'red')
                              .map((t: any) => (
                                <div key={t.id} className="text-red-800">
                                  {t.firstName} {t.lastName}
                                </div>
                              ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3 flex-wrap">
                    {matchDetails.teams.length === 0 && (
                      <button
                        onClick={() => handleGenerateTeams(selectedMatch)}
                        className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium"
                      >
                        Generate Teams
                      </button>
                    )}
                    {matchDetails.teams.length > 0 && (
                      <button
                        onClick={shareTeams}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium"
                      >
                        Copy Teams
                      </button>
                    )}
                    {matchDetails.match.status === 'upcoming' && matchDetails.teams.length > 0 && (
                      <button
                        onClick={() => handleCompleteMatch(selectedMatch)}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium"
                      >
                        Mark as Completed
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'players' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Players</h2>

            <div className="space-y-3">
              {players.map((player) => (
                <div key={player.userId} className="bg-white rounded-lg shadow p-5">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-bold text-lg">
                        {player.firstName} {player.lastName}
                      </h3>
                      <p className="text-sm text-gray-600">@{player.username}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        Games played: {player.gamesPlayed}
                      </p>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-2xl font-bold ${
                          player.balance > 0 ? 'text-red-600' : 'text-green-600'
                        }`}
                      >
                        {player.balance > 0 ? '+' : ''}
                        {formatCurrency(player.balance)}
                      </p>
                      <button
                        onClick={() => setSelectedPlayer(player)}
                        className="mt-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
                      >
                        Record Payment
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {selectedPlayer && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-2xl p-6 w-full max-w-md">
                  <h3 className="text-xl font-bold mb-4">Record Payment</h3>
                  <p className="text-gray-600 mb-4">
                    {selectedPlayer.firstName} {selectedPlayer.lastName}
                  </p>
                  <p className="text-gray-600 mb-4">
                    Current balance:{' '}
                    <span
                      className={`font-bold ${
                        selectedPlayer.balance > 0 ? 'text-red-600' : 'text-green-600'
                      }`}
                    >
                      {formatCurrency(selectedPlayer.balance)}
                    </span>
                  </p>

                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Amount (£)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                      placeholder="10.00"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={handleRecordPayment}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg"
                    >
                      Record Payment
                    </button>
                    <button
                      onClick={() => {
                        setSelectedPlayer(null);
                        setPaymentAmount('');
                      }}
                      className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 rounded-lg"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Toast notifications */}
      <ToastComponent />
    </div>
  );
}
