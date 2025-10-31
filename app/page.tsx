'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatCurrency, formatDate, formatTime } from '@/lib/utils';

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

interface AvailabilityInfo {
  userId: string;
  status: string;
}

interface MatchWithAvailability extends Match {
  availability?: AvailabilityInfo[];
  userAvailability?: AvailabilityInfo;
  confirmedCount: number;
}

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [matches, setMatches] = useState<MatchWithAvailability[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me');

      if (!response.ok) {
        // Not authenticated, redirect to join
        router.push('/join');
        return;
      }

      const userData = await response.json();
      setUser(userData);

      // Load matches
      await loadMatches(userData.userId);
    } catch (error) {
      console.error('Auth check error:', error);
      router.push('/join');
    } finally {
      setLoading(false);
    }
  };

  const loadMatches = async (userId: string) => {
    try {
      const response = await fetch('/api/matches?status=upcoming');
      if (!response.ok) return;

      const matchesData: Match[] = await response.json();

      // Get availability for each match
      const matchesWithAvailability = await Promise.all(
        matchesData.map(async (match) => {
          const detailsResponse = await fetch(`/api/matches/${match.matchId}`);
          if (!detailsResponse.ok) return { ...match, confirmedCount: 0 };

          const details = await detailsResponse.json();
          const userAvailability = details.availability.find(
            (a: any) => a.userId === userId
          );
          const confirmedCount = details.availability.filter(
            (a: any) => a.status === 'confirmed'
          ).length;

          return {
            ...match,
            availability: details.availability,
            userAvailability,
            confirmedCount,
          };
        })
      );

      setMatches(matchesWithAvailability);
    } catch (error) {
      console.error('Load matches error:', error);
    }
  };

  const handleAvailability = async (matchId: string, available: boolean) => {
    try {
      const response = await fetch('/api/availability', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ matchId, available }),
      });

      if (response.ok && user) {
        // Reload matches
        await loadMatches(user.userId);
      }
    } catch (error) {
      console.error('Mark availability error:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      localStorage.removeItem('football_user_id');
      localStorage.removeItem('football_username');
      router.push('/join');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">⚽ Football Squad</h1>
              <p className="text-sm text-gray-600">
                Logged in as <span className="font-medium">@{user.username}</span>
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Switch account
            </button>
          </div>

          {/* Stats */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-600">Balance</p>
              <p className={`text-lg font-bold ${user.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {user.balance > 0 ? '+' : ''}{formatCurrency(user.balance)}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-600">Games Played</p>
              <p className="text-lg font-bold text-gray-900">{user.gamesPlayed}</p>
            </div>
          </div>

          {user.isManager && (
            <div className="mt-3">
              <button
                onClick={() => router.push('/manager/dashboard')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors"
              >
                Manager Dashboard
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Matches List */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Upcoming Matches</h2>

        {matches.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <p className="text-gray-600">No upcoming matches</p>
          </div>
        ) : (
          <div className="space-y-4">
            {matches.map((match) => (
              <div key={match.matchId} className="bg-white rounded-lg shadow p-5">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-lg text-gray-900">
                      {new Date(match.date).toLocaleDateString('en-GB', { weekday: 'long' })}
                    </h3>
                    <p className="text-gray-600">
                      {new Date(match.date).toLocaleDateString('en-GB')} • {match.time}
                    </p>
                    <p className="text-gray-600">{match.location}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Players</p>
                    <p className="text-xl font-bold text-gray-900">
                      {match.confirmedCount}/18
                    </p>
                  </div>
                </div>

                {/* User status */}
                {match.userAvailability && (
                  <div className="mb-3">
                    {match.userAvailability.status === 'confirmed' ? (
                      <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                        <p className="text-sm text-green-800 font-medium">
                          ✓ You're in! (Confirmed)
                        </p>
                      </div>
                    ) : (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
                        <p className="text-sm text-yellow-800 font-medium">
                          On reserve list
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Availability buttons */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleAvailability(match.matchId, true)}
                    disabled={!!match.userAvailability}
                    className={`py-3 rounded-lg font-semibold transition-colors ${
                      match.userAvailability
                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        : 'bg-green-600 hover:bg-green-700 text-white'
                    }`}
                  >
                    {match.userAvailability ? "I'm in ✓" : "I'm in"}
                  </button>
                  <button
                    onClick={() => handleAvailability(match.matchId, false)}
                    disabled={!match.userAvailability}
                    className={`py-3 rounded-lg font-semibold transition-colors ${
                      !match.userAvailability
                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        : 'bg-red-600 hover:bg-red-700 text-white'
                    }`}
                  >
                    I'm out
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
