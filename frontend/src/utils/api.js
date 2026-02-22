const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export const api = {
  login: async (username, password) => {
    const res = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    return res.json();
  },

  // ===== TORNEIOS =====
  getActiveTournament: async () => {
    const res = await fetch(`${API_URL}/tournaments/active`);
    return res.json();
  },

  getAllTournaments: async () => {
    const res = await fetch(`${API_URL}/tournaments`);
    return res.json();
  },

  createTournament: async (name, date) => {
    const res = await fetch(`${API_URL}/tournaments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, date })
    });
    return res.json();
  },

  setActiveTournament: async (tournamentId) => {
    const res = await fetch(`${API_URL}/tournaments/${tournamentId}/activate`, {
      method: 'PATCH'
    });
    return res.json();
  },

  deleteTournament: async (tournamentId) => {
    const res = await fetch(`${API_URL}/tournaments/${tournamentId}`, {
      method: 'DELETE'
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error);
    }
    return res.json();
  },

  // ===== CLUBES =====
  getClubs: async () => {
    const res = await fetch(`${API_URL}/clubs`);
    return res.json();
  },

  // ===== RANKING =====
  calculateRanking: async () => {
    const res = await fetch(`${API_URL}/ranking/calculate`, {
      method: 'POST'
    });
    return res.json();
  },

  getRanking: async () => {
    const res = await fetch(`${API_URL}/ranking`);
    return res.json();
  },

  getDetailedRanking: async (clubName) => {
    const res = await fetch(`${API_URL}/ranking/${encodeURIComponent(clubName)}`);
    return res.json();
  },

  // ===== DUPLAS =====
  createTeam: async (player1, player2, clubId, category, gender) => {
    const res = await fetch(`${API_URL}/teams`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ player1, player2, clubId, category, gender })
    });
    return res.json();
  },

  getTeams: async (category, gender) => {
    const res = await fetch(`${API_URL}/teams/${category}/${gender}`);
    return res.json();
  },

  deleteTeam: async (id) => {
    const res = await fetch(`${API_URL}/teams/${id}`, {
      method: 'DELETE'
    });
    return res.json();
  },

  updateTeam: async (id, player1, player2, clubId) => {
    const res = await fetch(`${API_URL}/teams/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ player1, player2, clubId })
    });
    return res.json();
  },

  // ===== GRUPOS =====
  generateGroups: async (category, gender) => {
    const res = await fetch(`${API_URL}/groups/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category, gender })
    });
    return res.json();
  },

  getGroups: async (category, gender) => {
    const res = await fetch(`${API_URL}/groups/${category}/${gender}`);
    return res.json();
  },

  // ===== PARTIDAS =====
  getMatches: async (category, gender) => {
    const res = await fetch(`${API_URL}/matches/${category}/${gender}`);
    return res.json();
  },

  updateMatch: async (matchId, score1, score2, isWo = false, woTeam = null) => {
    const res = await fetch(`${API_URL}/matches/${matchId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ score1, score2, isWo, woTeam })
    });
    return res.json();
  },

  // ===== ELIMINATÓRIAS =====
  generateElimination: async (category, gender) => {
    const res = await fetch(`${API_URL}/elimination/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category, gender })
    });
    return res.json();
  },

  getElimination: async (category, gender) => {
    const res = await fetch(`${API_URL}/elimination/${category}/${gender}`);
    return res.json();
  },

  advanceWinner: async (matchId, score1, score2, isWo = false, woTeam = null) => {
    const res = await fetch(`${API_URL}/elimination/${matchId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ score1, score2, isWo, woTeam })
    });
    return res.json();
  },

  updateEliminationTeams: async (matchId, team1Id, team2Id) => {
    const res = await fetch(`${API_URL}/elimination/${matchId}/teams`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ team1Id, team2Id })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error);
    }
    return res.json();
  }
};