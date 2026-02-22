import express from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const router = express.Router();
const prisma = new PrismaClient();

// Dados reais do torneio - Fevereiro 2026 - Apenas Masculino
// Categoria B: formato especial - 1 grupo único, todos contra todos, final melhor de 3 sets
const TORNEIO_DATA = {
  'E': {
    'MASCULINO': {
      'A': [
        { player1: 'Toquinho', player2: 'João Vitor', club: 'Rilex Beach Tennis' },
        { player1: 'João', player2: 'João', club: 'Arena Beach MN' },
        { player1: 'Sabior', player2: 'Bruno', club: 'Beach do Lago' },
        { player1: 'Gabriel Kister', player2: 'Matheus', club: 'Arena B2' }
      ],
      'B': [
        { player1: 'Tavinho', player2: 'Polaco', club: 'Rilex Beach Tennis' },
        { player1: 'Thalisson', player2: 'Artur', club: 'Arena Beach MN' },
        { player1: 'Rafael', player2: 'Pedro H', club: 'Beach do Lago' },
        { player1: 'Henrique', player2: 'Manske', club: 'Arena B2' }
      ],
      'C': [
        { player1: 'Junior', player2: 'Foca', club: 'Rilex Beach Tennis' },
        { player1: 'João', player2: 'Tiago', club: 'Arena Beach MN' },
        { player1: 'Eduardo', player2: 'Miguel', club: 'Beach do Lago' },
        { player1: 'Junior', player2: 'Caio', club: 'Arena B2' }
      ],
      'D': [
        { player1: 'Fabio', player2: 'Roger', club: 'Rilex Beach Tennis' },
        { player1: 'Gabriel', player2: 'Alisson', club: 'Arena Beach MN' },
        { player1: 'Dennis', player2: 'Lucas', club: 'Beach do Lago' },
        { player1: 'Gabriel', player2: 'Alyson', club: 'Arena B2' }
      ]
    }
  },
  'D': {
    'MASCULINO': {
      'A': [
        { player1: 'Cassio', player2: 'Foca', club: 'Rilex Beach Tennis' },
        { player1: 'Cleiton', player2: 'Gabriel', club: 'Arena Beach MN' },
        { player1: 'Edgar', player2: 'Marcos', club: 'Beach do Lago' },
        { player1: 'Joenck', player2: 'Caio', club: 'Arena B2' }
      ],
      'B': [
        { player1: 'Samuel', player2: 'Junior', club: 'Rilex Beach Tennis' },
        { player1: 'Dede', player2: 'Rodrigo', club: 'Arena Beach MN' },
        { player1: 'Ronan', player2: 'Lucas', club: 'Beach do Lago' },
        { player1: 'Dudu', player2: 'Renan', club: 'Arena B2' }
      ],
      'C': [
        { player1: 'Roger', player2: 'Polaco', club: 'Rilex Beach Tennis' },
        { player1: 'Thalisson', player2: 'Rikelme', club: 'Arena Beach MN' },
        { player1: 'Shundi', player2: 'Renato', club: 'Beach do Lago' },
        { player1: 'Lopes', player2: 'Valber', club: 'Arena B2' }
      ],
      'D': [
        { player1: 'Fabio', player2: 'Junior', club: 'Rilex Beach Tennis' },
        { player1: 'Jean', player2: 'Gustavo', club: 'Arena Beach MN' },
        { player1: 'José', player2: 'Alefe', club: 'Beach do Lago' },
        { player1: 'Mansk', player2: 'Vinicius', club: 'Arena B2' }
      ]
    }
  },
  'C': {
    'MASCULINO': {
      'A': [
        { player1: 'Cassio', player2: 'Gordinho', club: 'Rilex Beach Tennis' },
        { player1: 'Fer', player2: 'Danilo', club: 'Arena Beach MN' },
        { player1: 'Gustavo', player2: 'Pedro', club: 'Beach do Lago' },
        { player1: 'Max', player2: 'Bença', club: 'Arena B2' }
      ],
      'B': [
        { player1: 'Lincon', player2: 'Perí', club: 'Rilex Beach Tennis' },
        { player1: 'Lavarda', player2: 'Mikhael', club: 'Arena Beach MN' },
        { player1: 'Shundi', player2: 'Renato', club: 'Beach do Lago' },
        { player1: 'Lopes', player2: 'Asafe', club: 'Arena B2' }
      ],
      'C': [
        { player1: 'Samuel', player2: 'Vinicius', club: 'Rilex Beach Tennis' },
        { player1: 'Gabriel', player2: 'Alysson', club: 'Arena Beach MN' },
        { player1: 'Kengi', player2: 'Rodrigo', club: 'Beach do Lago' },
        { player1: 'Valber', player2: 'Henrique', club: 'Arena B2' }
      ],
      'D': [
        { player1: 'Marcio', player2: 'Foca', club: 'Rilex Beach Tennis' },
        { player1: 'Raphael', player2: 'André', club: 'Arena Beach MN' },
        { player1: 'João B', player2: 'Vinicius H', club: 'Beach do Lago' },
        { player1: 'Dudu', player2: 'Renan', club: 'Arena B2' }
      ]
    }
  },
  'B': {
    'MASCULINO': {
      'A': [
        { player1: 'Lincon', player2: 'Neri', club: 'Rilex Beach Tennis' },
        { player1: 'Maicon', player2: 'Rafael', club: 'Arena Beach MN' },
        { player1: 'Gustavo', player2: 'Pedro', club: 'Beach do Lago' },
        { player1: 'Lucas', player2: 'Severo', club: 'Arena B2' }
      ]
    }
  }
};

async function executeSeedReal() {
  console.log('🌱 [SEED REAL] Iniciando seed com dados reais do torneio...');

  const adminUsername = process.env.ADMIN_EMAIL || 'admin_torneio';
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    throw new Error('ADMIN_PASSWORD não configurado');
  }

  // Limpar dados anteriores
  console.log('[SEED REAL] Limpando banco...');
  await prisma.match.deleteMany();
  await prisma.team.deleteMany();
  await prisma.group.deleteMany();
  await prisma.club.deleteMany();
  await prisma.tournament.deleteMany();
  await prisma.admin.deleteMany();

  // Criar admin
  console.log('[SEED REAL] Criando admin com username:', adminUsername);
  const senhaHash = await bcrypt.hash(adminPassword, 10);
  const admin = await prisma.admin.create({
    data: {
      username: adminUsername,
      password: senhaHash
    }
  });

  // Criar torneio com clubes
  console.log('[SEED REAL] Criando torneio...');
  const tournament = await prisma.tournament.create({
    data: {
      name: 'Torneio Interclubes - Fev/2026',
      date: new Date('2026-02-22'),
      isActive: true,
      clubs: {
        create: [
          { name: 'Arena B2' },
          { name: 'Rilex Beach Tennis' },
          { name: 'Beach do Lago' },
          { name: 'Arena Beach MN' }
        ]
      }
    },
    include: { clubs: true }
  });

  console.log('[SEED REAL] Criando grupos e duplas...');

  // Criar grupos e duplas para cada categoria
  for (const [categoria, generos] of Object.entries(TORNEIO_DATA)) {
    for (const [genero, grupos] of Object.entries(generos)) {
      console.log(`  → ${categoria} ${genero}`);

      // Criar os grupos
      for (const [grupoNome, duplas] of Object.entries(grupos)) {
        const grupo = await prisma.group.create({
          data: {
            name: grupoNome,
            category: categoria,
            gender: genero,
            tournamentId: tournament.id
          }
        });

        // Criar as duplas do grupo
        for (const dupla of duplas) {
          const club = tournament.clubs.find(c => c.name === dupla.club);

          if (!club) {
            console.warn(`    ⚠️ Clube não encontrado: ${dupla.club}`);
            continue;
          }

          await prisma.team.create({
            data: {
              player1: dupla.player1,
              player2: dupla.player2,
              clubId: club.id,
              category: categoria,
              gender: genero,
              tournamentId: tournament.id,
              groupId: grupo.id
            }
          });
        }

        // Criar jogos do grupo (todos contra todos)
        const teamsInGroup = await prisma.team.findMany({
          where: { groupId: grupo.id }
        });

        for (let i = 0; i < teamsInGroup.length; i++) {
          for (let j = i + 1; j < teamsInGroup.length; j++) {
            await prisma.match.create({
              data: {
                groupId: grupo.id,
                team1Id: teamsInGroup[i].id,
                team2Id: teamsInGroup[j].id,
                category: categoria,
                gender: genero,
                tournamentId: tournament.id,
                phase: 'grupos'
              }
            });
          }
        }
      }
    }
  }

  console.log('[SEED REAL] ✓ Seed concluído com dados reais!');

  // Contar totais
  const totalTeams = await prisma.team.count();
  const totalGroups = await prisma.group.count();
  const totalMatches = await prisma.match.count();

  return {
    admin: { username: admin.username },
    tournament: { id: tournament.id, name: tournament.name },
    clubs: tournament.clubs.length,
    groups: totalGroups,
    teams: totalTeams,
    matches: totalMatches
  };
}

// Rota GET
router.get('/seed-real', async (req, res) => {
  try {
    const data = await executeSeedReal();

    res.json({
      success: true,
      message: 'Seed com dados reais executado com sucesso!',
      data
    });
  } catch (error) {
    console.error('[SEED REAL] ❌ Erro:', error);
    res.status(500).json({ error: error.message });
  }
});

// Rota POST
router.post('/seed-real', async (req, res) => {
  try {
    const data = await executeSeedReal();

    res.json({
      success: true,
      message: 'Seed com dados reais executado com sucesso!',
      data
    });
  } catch (error) {
    console.error('[SEED REAL] ❌ Erro:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
