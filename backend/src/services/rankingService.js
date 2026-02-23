import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const POINTS = {
  grupos: 2,      // Participou da fase de grupos
  quartas: 4,     // Eliminado nas quartas
  semi: 8,        // Eliminado na semi
  finalista: 10,  // Perdeu a final
  campeao: 15     // Ganhou a final
};

// Retorna número de W.O.s dados por um time em um torneio (fase de grupos)
async function getWoCount(teamId, tournamentId) {
  const woAsTeam1 = await prisma.match.count({
    where: {
      tournamentId,
      phase: 'grupos',
      isWo: true,
      woTeam: 1,
      team1Id: teamId
    }
  });
  const woAsTeam2 = await prisma.match.count({
    where: {
      tournamentId,
      phase: 'grupos',
      isWo: true,
      woTeam: 2,
      team2Id: teamId
    }
  });
  return woAsTeam1 + woAsTeam2;
}

export const calculatePoints = async (tournamentId) => {
  // Resetar pontos
  await prisma.team.updateMany({
    where: { tournamentId },
    data: { points: 0, placement: null }
  });

  const categories = ['E', 'D', 'C', 'B'];
  const genders = ['MASCULINO', 'FEMININO'];

  for (const category of categories) {
    // Categoria B é apenas masculino
    const categoryGenders = category === 'B' ? ['MASCULINO'] : genders;
    for (const gender of categoryGenders) {
      await calculateCategoryPoints(tournamentId, category, gender);
    }
  }

  return await getArenaRanking(tournamentId);
};

async function calculateCategoryPoints(tournamentId, category, gender) {
  // 1. Verificar se há jogos de grupos finalizados
  const finishedGroupMatches = await prisma.match.findMany({
    where: {
      tournamentId,
      category,
      gender,
      phase: 'grupos',
      status: 'finalizado'
    }
  });

  if (finishedGroupMatches.length === 0) {
    console.log(`[RANKING] ${category} ${gender}: Nenhum jogo finalizado ainda`);
    return;
  }

  // 2. Buscar grupos e classificados
  const groups = await prisma.group.findMany({
    where: { tournamentId, category, gender },
    include: {
      teams: {
        orderBy: [
          { wins: 'desc' },
          { gamesWon: 'desc' }
        ]
      }
    }
  });

  // 3. Dar 2 pontos BASE para todos que jogaram na fase de grupos
  //    Exceto os que tiveram 3 ou mais W.O.s (não pontuam)
  for (const group of groups) {
    for (const team of group.teams) {
      const woCount = await getWoCount(team.id, tournamentId);
      if (woCount >= 3) {
        console.log(`[RANKING] ${category} ${gender}: ${team.player1}/${team.player2} NÃO pontua (${woCount} W.O.s)`);
        await prisma.team.update({
          where: { id: team.id },
          data: { points: 0, placement: 'wo_eliminado' }
        });
      } else {
        await prisma.team.update({
          where: { id: team.id },
          data: { points: POINTS.grupos, placement: 'grupos' }
        });
      }
    }
  }

  // 4. Quartas (apenas categorias E, D, C - categoria B não tem quartas)
  const quartas = await prisma.match.findMany({
    where: { tournamentId, category, gender, phase: 'quartas', status: 'finalizado' }
  });

  if (quartas.length > 0) {
    for (const match of quartas) {
      const loserId = match.score1 > match.score2 ? match.team2Id : match.team1Id;
      const loserWoCount = await getWoCount(loserId, tournamentId);
      if (loserWoCount < 3) {
        await prisma.team.update({
          where: { id: loserId },
          data: { points: POINTS.quartas, placement: 'quartas' }
        });
      }
    }
  }

  // 5. Semifinais (categorias E, D, C — categoria B vai direto à final, sem semi)
  const totalSemiMatches = await prisma.match.count({
    where: { tournamentId, category, gender, phase: 'semi' }
  });

  if (totalSemiMatches > 0) {
    const semis = await prisma.match.findMany({
      where: { tournamentId, category, gender, phase: 'semi', status: 'finalizado' }
    });

    if (semis.length === 0) {
      console.log(`[RANKING] ${category} ${gender}: Sem semis finalizadas`);
      return;
    }

    for (const match of semis) {
      const loserId = match.score1 > match.score2 ? match.team2Id : match.team1Id;
      const loserWoCount = await getWoCount(loserId, tournamentId);
      if (loserWoCount < 3) {
        await prisma.team.update({
          where: { id: loserId },
          data: { points: POINTS.semi, placement: 'semi' }
        });
      }
    }
  }

  // 6. Final
  const final = await prisma.match.findFirst({
    where: { tournamentId, category, gender, phase: 'final', status: 'finalizado' }
  });

  if (!final) {
    console.log(`[RANKING] ${category} ${gender}: Semis concluídas`);
    return;
  }

  const winnerId = final.score1 > final.score2 ? final.team1Id : final.team2Id;
  const loserId = final.score1 > final.score2 ? final.team2Id : final.team1Id;

  const winnerWoCount = await getWoCount(winnerId, tournamentId);
  const loserWoCount = await getWoCount(loserId, tournamentId);

  if (winnerWoCount < 3) {
    await prisma.team.update({
      where: { id: winnerId },
      data: { points: POINTS.campeao, placement: 'campeao' }
    });
  }

  if (loserWoCount < 3) {
    await prisma.team.update({
      where: { id: loserId },
      data: { points: POINTS.finalista, placement: 'finalista' }
    });
  }

  console.log(`[RANKING] ${category} ${gender}: Torneio completo!`);
}

export const getArenaRanking = async (tournamentId) => {
  const teams = await prisma.team.findMany({
    where: { tournamentId },
    include: { club: true }
  });

  const arenaPoints = {};

  teams.forEach(team => {
    if (!arenaPoints[team.club.name]) {
      arenaPoints[team.club.name] = {
        clubName: team.club.name,
        totalPoints: 0,
        categories: {}
      };
    }

    arenaPoints[team.club.name].totalPoints += team.points;

    if (!arenaPoints[team.club.name].categories[team.category]) {
      arenaPoints[team.club.name].categories[team.category] = {};
    }
    if (!arenaPoints[team.club.name].categories[team.category][team.gender]) {
      arenaPoints[team.club.name].categories[team.category][team.gender] = [];
    }

    arenaPoints[team.club.name].categories[team.category][team.gender].push({
      player1: team.player1,
      player2: team.player2,
      points: team.points,
      placement: team.placement
    });
  });

  return Object.values(arenaPoints).sort((a, b) => b.totalPoints - a.totalPoints);
};

export const getDetailedRanking = async (tournamentId, clubName) => {
  const teams = await prisma.team.findMany({
    where: {
      tournamentId,
      club: { name: clubName }
    },
    include: { club: true },
    orderBy: [
      { category: 'asc' },
      { gender: 'asc' },
      { points: 'desc' }
    ]
  });

  return teams;
};
