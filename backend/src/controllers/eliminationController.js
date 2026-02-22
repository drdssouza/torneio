import * as eliminationService from '../services/eliminationService.js';
import * as tournamentService from '../services/tournamentService.js';

export const generateElimination = async (req, res) => {
  try {
    const { category, gender } = req.body;
    const tournament = await tournamentService.getActiveTournament();
    if (!tournament) {
      return res.status(404).json({ error: 'Nenhum torneio ativo' });
    }
    const matches = await eliminationService.generateElimination(category, gender, tournament.id);
    res.json(matches);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getElimination = async (req, res) => {
  try {
    const { category, gender } = req.params;
    const tournament = await tournamentService.getActiveTournament();
    if (!tournament) {
      return res.status(404).json({ error: 'Nenhum torneio ativo' });
    }
    const matches = await eliminationService.getElimination(category, gender, tournament.id);
    res.json(matches);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const advanceWinner = async (req, res) => {
  try {
    const { id } = req.params;
    const { score1, score2, isWo, woTeam } = req.body;
    const match = await eliminationService.advanceWinner(parseInt(id), score1, score2, isWo, woTeam);
    res.json(match);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateMatchTeams = async (req, res) => {
  try {
    const { id } = req.params;
    const { team1Id, team2Id } = req.body;
    const match = await eliminationService.updateMatchTeams(parseInt(id), team1Id, team2Id);
    res.json(match);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};