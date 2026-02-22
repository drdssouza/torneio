import * as matchService from '../services/matchService.js';
import * as tournamentService from '../services/tournamentService.js';

export const updateMatch = async (req, res) => {
  try {
    const { id } = req.params;
    const { score1, score2, isWo, woTeam } = req.body;
    const match = await matchService.updateMatch(parseInt(id), score1, score2, isWo, woTeam);
    res.json(match);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getMatches = async (req, res) => {
  try {
    const { category, gender } = req.params;
    const tournament = await tournamentService.getActiveTournament();
    if (!tournament) {
      return res.status(404).json({ error: 'Nenhum torneio ativo' });
    }
    const matches = await matchService.getMatches(category, gender, tournament.id);
    res.json(matches);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};