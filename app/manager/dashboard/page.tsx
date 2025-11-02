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
  rating?: number | null;
  position?: string | null;
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

  // Team swap state
  const [selectedBluePlayer, setSelectedBluePlayer] = useState<string | null>(null);
  const [selectedRedPlayer, setSelectedRedPlayer] = useState<string | null>(null);

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

  const handleUpdatePlayerRating = async (userId: string, rating: number | null) => {
    try {
      const response = await fetch(`/api/players/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'updateRating',
          rating,
        }),
      });

      if (response.ok) {
        await loadPlayers();
        showToast('Player rating updated');
      }
    } catch (error) {
      console.error('Update rating error:', error);
      showToast('Failed to update rating', 'error');
    }
  };

  const handleUpdatePlayerPosition = async (userId: string, position: string | null) => {
    try {
      const response = await fetch(`/api/players/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'updatePosition',
          position,
        }),
      });

      if (response.ok) {
        await loadPlayers();
        showToast('Player position updated');
      }
    } catch (error) {
      console.error('Update position error:', error);
      showToast('Failed to update position', 'error');
    }
  };

  const handleSelectPlayer = (playerId: string, team: 'blue' | 'red') => {
    if (team === 'blue') {
      // If clicking the same player, deselect
      if (selectedBluePlayer === playerId) {
        setSelectedBluePlayer(null);
      } else {
        setSelectedBluePlayer(playerId);
      }
    } else {
      // If clicking the same player, deselect
      if (selectedRedPlayer === playerId) {
        setSelectedRedPlayer(null);
      } else {
        setSelectedRedPlayer(playerId);
      }
    }
  };

  const handleSwapPlayers = async () => {
    if (!selectedMatch || !selectedBluePlayer || !selectedRedPlayer) return;

    try {
      // Get current teams
      const blueTeam = matchDetails.teams
        .filter((t: any) => t.team === 'blue')
        .map((t: any) => t.userId);
      const redTeam = matchDetails.teams
        .filter((t: any) => t.team === 'red')
        .map((t: any) => t.userId);

      // Swap the two selected players
      const newBlueTeam = blueTeam.map((id: string) =>
        id === selectedBluePlayer ? selectedRedPlayer : id
      );
      const newRedTeam = redTeam.map((id: string) =>
        id === selectedRedPlayer ? selectedBluePlayer : id
      );

      // Update teams in database
      const response = await fetch('/api/teams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          matchId: selectedMatch,
          blueTeam: newBlueTeam,
          redTeam: newRedTeam,
        }),
      });

      if (response.ok) {
        await loadMatchDetails(selectedMatch);
        setSelectedBluePlayer(null);
        setSelectedRedPlayer(null);
        showToast('Players swapped');
      }
    } catch (error) {
      console.error('Swap players error:', error);
      showToast('Failed to swap players', 'error');
    }
  };

  const handleRemovePlayer = async (userId: string, team: 'blue' | 'red') => {
    if (!selectedMatch || !confirm('Remove this player from the team? They will be marked as unavailable.')) {
      return;
    }

    try {
      const response = await fetch('/api/teams', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          matchId: selectedMatch,
          userId,
          team,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        await loadMatchDetails(selectedMatch);

        if (data.addedReserve) {
          showToast('Player removed and reserve added');
        } else {
          showToast('Player removed from team');
        }
      }
    } catch (error) {
      console.error('Remove player error:', error);
      showToast('Failed to remove player', 'error');
    }
  };

  const calculateTeamRating = (team: any[]) => {
    const total = team.reduce((sum, player) => sum + (player.rating || 0), 0);
    return total;
  };

  const getPositionCount = (team: any[], position: string | null) => {
    return team.filter(p => p.position === position).length;
  };

  const getBalanceIndicator = (blueTotal: number, redTotal: number) => {
    const diff = Math.abs(blueTotal - redTotal);
    if (diff <= 1) return { emoji: '✓', color: 'text-green-600' };
    if (diff <= 2) return { emoji: '⚠️', color: 'text-amber-600' };
    return { emoji: '🔴', color: 'text-red-600' };
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
    showToast('Teams copied to clipboard!');
  };

  const handleSeedPlayers = async (matchId?: string) => {
    try {
      const response = await fetch('/api/dev/seed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          numberOfPlayers: 20,
          matchId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        showToast(`Created ${data.playersCreated} test players!`);
        await loadPlayers();
        if (matchId) {
          await loadMatchDetails(matchId);
        }
      }
    } catch (error) {
      console.error('Seed players error:', error);
      showToast('Failed to seed players', 'error');
    }
  };

  const handleClearTestPlayers = async () => {
    if (!confirm('Delete all non-manager players? This cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch('/api/dev/seed', {
        method: 'DELETE',
      });

      if (response.ok) {
        showToast('All test players deleted');
        await loadPlayers();
      }
    } catch (error) {
      console.error('Delete players error:', error);
      showToast('Failed to delete players', 'error');
    }
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
              <div
                className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-y-auto"
                onClick={() => {
                  setSelectedMatch(null);
                  setMatchDetails(null);
                  setSelectedBluePlayer(null);
                  setSelectedRedPlayer(null);
                }}
              >
                <div
                  className="min-h-screen flex items-start justify-center p-4 py-8"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="bg-white rounded-2xl p-6 w-full max-w-4xl my-8 relative">
                    <div className="flex justify-between items-start mb-6 sticky top-0 bg-white pt-2 pb-4 -mx-6 px-6 z-10 rounded-t-2xl">
                      <h3 className="text-2xl font-bold">Manage Match</h3>
                      <button
                        onClick={() => {
                          setSelectedMatch(null);
                          setMatchDetails(null);
                          setSelectedBluePlayer(null);
                          setSelectedRedPlayer(null);
                        }}
                        className="text-gray-500 hover:text-gray-700 text-3xl leading-none min-h-[48px] min-w-[48px] flex items-center justify-center -mr-2 -mt-2"
                      >
                        ×
                      </button>
                    </div>

                  {/* Teams Section - Show first if generated */}
                  {matchDetails.teams.length > 0 && (() => {
                    const blueTeam = matchDetails.teams.filter((t: any) => t.team === 'blue');
                    const redTeam = matchDetails.teams.filter((t: any) => t.team === 'red');
                    const blueTotal = calculateTeamRating(blueTeam);
                    const redTotal = calculateTeamRating(redTeam);
                    const balance = getBalanceIndicator(blueTotal, redTotal);

                    // Position counts
                    const blueD = getPositionCount(blueTeam, 'D');
                    const blueM = getPositionCount(blueTeam, 'M');
                    const blueS = getPositionCount(blueTeam, 'S');
                    const redD = getPositionCount(redTeam, 'D');
                    const redM = getPositionCount(redTeam, 'M');
                    const redS = getPositionCount(redTeam, 'S');

                    // Group by position
                    const groupByPosition = (team: any[]) => {
                      return {
                        D: team.filter(p => p.position === 'D').sort((a, b) => (b.rating || 0) - (a.rating || 0)),
                        M: team.filter(p => p.position === 'M').sort((a, b) => (b.rating || 0) - (a.rating || 0)),
                        S: team.filter(p => p.position === 'S').sort((a, b) => (b.rating || 0) - (a.rating || 0)),
                        unassigned: team.filter(p => !p.position).sort((a, b) => (b.rating || 0) - (a.rating || 0)),
                      };
                    };

                    const blueGrouped = groupByPosition(blueTeam);
                    const redGrouped = groupByPosition(redTeam);

                    return (
                      <div className="mb-6">
                        {/* Compact team stats */}
                        <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-blue-700">Blue: {blueTotal.toFixed(1)}</span>
                              <span className="text-gray-400">|</span>
                              <span className="font-bold text-red-700">Red: {redTotal.toFixed(1)}</span>
                              <span className={`text-xl ${balance.color} ml-1`}>{balance.emoji}</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-xs text-gray-600">
                            <span>D:{blueD} M:{blueM} S:{blueS}</span>
                            <span className="text-gray-400">|</span>
                            <span>D:{redD} M:{redM} S:{redS}</span>
                          </div>
                        </div>

                        {/* Side-by-side compact teams */}
                        <div className="grid grid-cols-2 gap-0 border border-gray-200 rounded-lg overflow-hidden">
                          {/* Blue Team */}
                          <div className="bg-blue-50/30 p-2 border-r border-gray-200">
                            <div className="mb-2 pb-1 border-b border-blue-200">
                              <h5 className="font-bold text-xs uppercase text-blue-900">Blue Team</h5>
                            </div>

                            {/* Defence */}
                            {blueGrouped.D.length > 0 && (
                              <div className="mb-2">
                                <div className="text-[10px] font-bold text-blue-700 mb-1 uppercase tracking-wide">Defence</div>
                                {blueGrouped.D.map((player: any) => (
                                  <button
                                    key={player.id}
                                    onClick={() => handleSelectPlayer(player.userId, 'blue')}
                                    className={`w-full text-left py-1.5 px-2 text-sm min-h-[44px] flex items-center gap-2 transition-all border-l-2 ${
                                      selectedBluePlayer === player.userId
                                        ? 'border-blue-600 bg-blue-100 font-bold'
                                        : 'border-transparent hover:bg-blue-50'
                                    }`}
                                  >
                                    <span className="text-xs font-semibold text-blue-700 min-w-[28px]">
                                      {player.rating?.toFixed(1) || '-'}
                                    </span>
                                    <span className="truncate text-blue-900">
                                      {player.firstName}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            )}

                            {/* Midfield */}
                            {blueGrouped.M.length > 0 && (
                              <div className="mb-2">
                                <div className="text-[10px] font-bold text-blue-700 mb-1 uppercase tracking-wide">Midfield</div>
                                {blueGrouped.M.map((player: any) => (
                                  <button
                                    key={player.id}
                                    onClick={() => handleSelectPlayer(player.userId, 'blue')}
                                    className={`w-full text-left py-1.5 px-2 text-sm min-h-[44px] flex items-center gap-2 transition-all border-l-2 ${
                                      selectedBluePlayer === player.userId
                                        ? 'border-blue-600 bg-blue-100 font-bold'
                                        : 'border-transparent hover:bg-blue-50'
                                    }`}
                                  >
                                    <span className="text-xs font-semibold text-blue-700 min-w-[28px]">
                                      {player.rating?.toFixed(1) || '-'}
                                    </span>
                                    <span className="truncate text-blue-900">
                                      {player.firstName}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            )}

                            {/* Striker */}
                            {blueGrouped.S.length > 0 && (
                              <div className="mb-2">
                                <div className="text-[10px] font-bold text-blue-700 mb-1 uppercase tracking-wide">Striker</div>
                                {blueGrouped.S.map((player: any) => (
                                  <button
                                    key={player.id}
                                    onClick={() => handleSelectPlayer(player.userId, 'blue')}
                                    className={`w-full text-left py-1.5 px-2 text-sm min-h-[44px] flex items-center gap-2 transition-all border-l-2 ${
                                      selectedBluePlayer === player.userId
                                        ? 'border-blue-600 bg-blue-100 font-bold'
                                        : 'border-transparent hover:bg-blue-50'
                                    }`}
                                  >
                                    <span className="text-xs font-semibold text-blue-700 min-w-[28px]">
                                      {player.rating?.toFixed(1) || '-'}
                                    </span>
                                    <span className="truncate text-blue-900">
                                      {player.firstName}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            )}

                            {/* Unassigned */}
                            {blueGrouped.unassigned.length > 0 && (
                              <div>
                                <div className="text-[10px] font-bold text-blue-700 mb-1 uppercase tracking-wide">Other</div>
                                {blueGrouped.unassigned.map((player: any) => (
                                  <button
                                    key={player.id}
                                    onClick={() => handleSelectPlayer(player.userId, 'blue')}
                                    className={`w-full text-left py-1.5 px-2 text-sm min-h-[44px] flex items-center gap-2 transition-all border-l-2 ${
                                      selectedBluePlayer === player.userId
                                        ? 'border-blue-600 bg-blue-100 font-bold'
                                        : 'border-transparent hover:bg-blue-50'
                                    }`}
                                  >
                                    <span className="text-xs font-semibold text-blue-700 min-w-[28px]">
                                      {player.rating?.toFixed(1) || '-'}
                                    </span>
                                    <span className="truncate text-blue-900">
                                      {player.firstName}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Red Team */}
                          <div className="bg-red-50/30 p-2">
                            <div className="mb-2 pb-1 border-b border-red-200">
                              <h5 className="font-bold text-xs uppercase text-red-900">Red Team</h5>
                            </div>

                            {/* Defence */}
                            {redGrouped.D.length > 0 && (
                              <div className="mb-2">
                                <div className="text-[10px] font-bold text-red-700 mb-1 uppercase tracking-wide">Defence</div>
                                {redGrouped.D.map((player: any) => (
                                  <button
                                    key={player.id}
                                    onClick={() => handleSelectPlayer(player.userId, 'red')}
                                    className={`w-full text-left py-1.5 px-2 text-sm min-h-[44px] flex items-center gap-2 transition-all border-l-2 ${
                                      selectedRedPlayer === player.userId
                                        ? 'border-red-600 bg-red-100 font-bold'
                                        : 'border-transparent hover:bg-red-50'
                                    }`}
                                  >
                                    <span className="text-xs font-semibold text-red-700 min-w-[28px]">
                                      {player.rating?.toFixed(1) || '-'}
                                    </span>
                                    <span className="truncate text-red-900">
                                      {player.firstName}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            )}

                            {/* Midfield */}
                            {redGrouped.M.length > 0 && (
                              <div className="mb-2">
                                <div className="text-[10px] font-bold text-red-700 mb-1 uppercase tracking-wide">Midfield</div>
                                {redGrouped.M.map((player: any) => (
                                  <button
                                    key={player.id}
                                    onClick={() => handleSelectPlayer(player.userId, 'red')}
                                    className={`w-full text-left py-1.5 px-2 text-sm min-h-[44px] flex items-center gap-2 transition-all border-l-2 ${
                                      selectedRedPlayer === player.userId
                                        ? 'border-red-600 bg-red-100 font-bold'
                                        : 'border-transparent hover:bg-red-50'
                                    }`}
                                  >
                                    <span className="text-xs font-semibold text-red-700 min-w-[28px]">
                                      {player.rating?.toFixed(1) || '-'}
                                    </span>
                                    <span className="truncate text-red-900">
                                      {player.firstName}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            )}

                            {/* Striker */}
                            {redGrouped.S.length > 0 && (
                              <div className="mb-2">
                                <div className="text-[10px] font-bold text-red-700 mb-1 uppercase tracking-wide">Striker</div>
                                {redGrouped.S.map((player: any) => (
                                  <button
                                    key={player.id}
                                    onClick={() => handleSelectPlayer(player.userId, 'red')}
                                    className={`w-full text-left py-1.5 px-2 text-sm min-h-[44px] flex items-center gap-2 transition-all border-l-2 ${
                                      selectedRedPlayer === player.userId
                                        ? 'border-red-600 bg-red-100 font-bold'
                                        : 'border-transparent hover:bg-red-50'
                                    }`}
                                  >
                                    <span className="text-xs font-semibold text-red-700 min-w-[28px]">
                                      {player.rating?.toFixed(1) || '-'}
                                    </span>
                                    <span className="truncate text-red-900">
                                      {player.firstName}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            )}

                            {/* Unassigned */}
                            {redGrouped.unassigned.length > 0 && (
                              <div>
                                <div className="text-[10px] font-bold text-red-700 mb-1 uppercase tracking-wide">Other</div>
                                {redGrouped.unassigned.map((player: any) => (
                                  <button
                                    key={player.id}
                                    onClick={() => handleSelectPlayer(player.userId, 'red')}
                                    className={`w-full text-left py-1.5 px-2 text-sm min-h-[44px] flex items-center gap-2 transition-all border-l-2 ${
                                      selectedRedPlayer === player.userId
                                        ? 'border-red-600 bg-red-100 font-bold'
                                        : 'border-transparent hover:bg-red-50'
                                    }`}
                                  >
                                    <span className="text-xs font-semibold text-red-700 min-w-[28px]">
                                      {player.rating?.toFixed(1) || '-'}
                                    </span>
                                    <span className="truncate text-red-900">
                                      {player.firstName}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Reserves Section */}
                  {(() => {
                    const reserves = matchDetails.availability.filter((p: Player) => p.status === 'reserve');
                    if (reserves.length === 0) return null;

                    return (
                      <div className="mb-6">
                        <h4 className="font-bold text-lg mb-3">
                          Reserves ({reserves.length})
                        </h4>
                        <div className="space-y-2">
                          {reserves.map((player: Player, index: number) => (
                            <div
                              key={player.userId}
                              className="flex justify-between items-center p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
                            >
                              <div className="flex items-center gap-3">
                                <span className="text-yellow-700 font-mono">{index + 1}.</span>
                                <span className="font-medium">
                                  {player.firstName} {player.lastName}
                                </span>
                                {player.wasReserveLastMatch && (
                                  <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded">
                                    Priority
                                  </span>
                                )}
                              </div>
                              <span className="text-sm font-medium px-3 py-1 rounded bg-yellow-200 text-yellow-800">
                                reserve
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Availability - Only confirmed players not in teams */}
                  {(() => {
                    const teamPlayerIds = new Set(matchDetails.teams.map((t: any) => t.userId));
                    const availablePlayers = matchDetails.availability.filter(
                      (p: Player) => p.status === 'confirmed' && !teamPlayerIds.has(p.userId)
                    );

                    if (availablePlayers.length === 0) return null;

                    return (
                      <div className="mb-6">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="font-bold text-lg">
                            Available Players ({availablePlayers.length})
                          </h4>
                          <button
                            onClick={() => handleSeedPlayers(selectedMatch)}
                            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
                          >
                            + Seed 20 Players
                          </button>
                        </div>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {availablePlayers.map((player: Player, index: number) => (
                            <div
                              key={player.userId}
                              className="flex justify-between items-center p-3 bg-green-50 border border-green-200 rounded-lg"
                            >
                              <div className="flex items-center gap-3">
                                <span className="text-green-700 font-mono">{index + 1}.</span>
                                <span className="font-medium">
                                  {player.firstName} {player.lastName}
                                </span>
                                {player.wasReserveLastMatch && (
                                  <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                                    Priority
                                  </span>
                                )}
                              </div>
                              <span className="text-sm font-medium px-3 py-1 rounded bg-green-200 text-green-800">
                                confirmed
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Swap Players Button */}
                  {selectedBluePlayer && selectedRedPlayer && (
                    <div className="mb-4">
                      <button
                        onClick={handleSwapPlayers}
                        className="w-full bg-gradient-to-r from-blue-600 to-red-600 hover:from-blue-700 hover:to-red-700 text-white px-6 py-3 rounded-lg font-medium min-h-[48px] shadow-lg transition-all"
                      >
                        ⇄ Swap Selected Players
                      </button>
                    </div>
                  )}

                  <div className="flex gap-3 flex-wrap">
                    {matchDetails.teams.length === 0 && (
                      <button
                        onClick={() => handleGenerateTeams(selectedMatch)}
                        className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium min-h-[48px]"
                      >
                        Generate Teams
                      </button>
                    )}
                    {matchDetails.teams.length > 0 && (
                      <>
                        <button
                          onClick={() => handleGenerateTeams(selectedMatch)}
                          className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-3 rounded-lg font-medium min-h-[48px]"
                        >
                          Reset Teams
                        </button>
                        <button
                          onClick={shareTeams}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium min-h-[48px]"
                        >
                          Share Teams
                        </button>
                      </>
                    )}
                    {matchDetails.match.status === 'upcoming' && matchDetails.teams.length > 0 && (
                      <button
                        onClick={() => handleCompleteMatch(selectedMatch)}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium min-h-[48px]"
                      >
                        Mark as Completed
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
            )}
          </div>
        )}

        {activeTab === 'players' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Players</h2>
              <div className="flex gap-3">
                <button
                  onClick={() => handleSeedPlayers()}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
                >
                  + Seed 20 Players
                </button>
                <button
                  onClick={handleClearTestPlayers}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
                >
                  Clear All Players
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {players.map((player) => (
                <div key={player.userId} className="bg-white rounded-lg shadow p-5">
                  <div className="flex flex-col gap-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
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

                    {/* Rating and Position Controls */}
                    <div className="flex gap-3 flex-wrap">
                      <div className="flex items-center gap-2">
                        <label className="text-sm font-medium text-gray-700">Rating:</label>
                        <select
                          value={player.rating ?? ''}
                          onChange={(e) => handleUpdatePlayerRating(
                            player.userId,
                            e.target.value ? parseFloat(e.target.value) : null
                          )}
                          className="px-3 py-2 border border-gray-300 rounded-lg text-sm min-h-[48px] min-w-[80px]"
                        >
                          <option value="">None</option>
                          <option value="1.0">1.0</option>
                          <option value="1.5">1.5</option>
                          <option value="2.0">2.0</option>
                          <option value="2.5">2.5</option>
                          <option value="3.0">3.0</option>
                          <option value="3.5">3.5</option>
                          <option value="4.0">4.0</option>
                          <option value="4.5">4.5</option>
                          <option value="5.0">5.0</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="text-sm font-medium text-gray-700">Position:</label>
                        <select
                          value={player.position ?? ''}
                          onChange={(e) => handleUpdatePlayerPosition(
                            player.userId,
                            e.target.value || null
                          )}
                          className="px-3 py-2 border border-gray-300 rounded-lg text-sm min-h-[48px] min-w-[120px]"
                        >
                          <option value="">None</option>
                          <option value="D">D (Defence)</option>
                          <option value="M">M (Midfield)</option>
                          <option value="S">S (Striker)</option>
                        </select>
                      </div>
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
