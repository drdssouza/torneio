import express from 'express';
import * as authController from '../controllers/authController.js';
import * as tournamentController from '../controllers/tournamentController.js';
import * as clubController from '../controllers/clubController.js';
import * as teamController from '../controllers/teamController.js';
import * as groupController from '../controllers/groupController.js';
import * as matchController from '../controllers/matchController.js';
import * as eliminationController from '../controllers/eliminationController.js';
import * as rankingController from '../controllers/rankingController.js';
import seedRoutes from './seed-api.js';
import seedRealRoutes from './seed-real.js';

const router = express.Router();

// Auth
router.post('/login', authController.login);

// Seed (para testes e população de dados)
router.use('/seed', seedRoutes);
router.use('/seed', seedRealRoutes);

// Tournaments
router.get('/tournaments', tournamentController.getAllTournaments);
router.get('/tournaments/active', tournamentController.getActiveTournament);
router.post('/tournaments', tournamentController.createTournament);
router.patch('/tournaments/:id/activate', tournamentController.setActiveTournament);
router.delete('/tournaments/:id', tournamentController.deleteTournament);

// Clubs
router.get('/clubs', clubController.getClubs);

// Teams
router.post('/teams', teamController.createTeam);
router.get('/teams/:category/:gender', teamController.getTeams);
router.delete('/teams/:id', teamController.deleteTeam);
router.put('/teams/:id', teamController.updateTeam);

// Groups
router.post('/groups/generate', groupController.generateGroups);
router.get('/groups/:category/:gender', groupController.getGroups);

// Matches
router.get('/matches/:category/:gender', matchController.getMatches);
router.patch('/matches/:id', matchController.updateMatch);

// Elimination
router.post('/elimination/generate', eliminationController.generateElimination);
router.get('/elimination/:category/:gender', eliminationController.getElimination);
router.patch('/elimination/:id', eliminationController.advanceWinner);
router.patch('/elimination/:id/teams', eliminationController.updateMatchTeams);

// Ranking
router.post('/ranking/calculate', rankingController.calculateRanking);
router.get('/ranking', rankingController.getArenaRanking);
router.get('/ranking/:clubName', rankingController.getDetailedRanking);

export default router;