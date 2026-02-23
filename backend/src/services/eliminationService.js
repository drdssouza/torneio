import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Ordena duplas por campanha: vitórias desc → saldo desc → games vencidos desc
function sortByCampaign(teams) {
  return [...teams].sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    const saldoA = a.gamesWon - a.gamesLost;
    const saldoB = b.gamesWon - b.gamesLost;
    if (saldoB !== saldoA) return saldoB - saldoA;
    return b.gamesWon - a.gamesWon;
  });
}

export const generateElimination = async (category, gender, tournamentId) => {
  // Limpar eliminatórias anteriores
  await prisma.match.deleteMany({
    where: {
      category,
      gender,
      tournamentId,
      phase: { in: ['quartas', 'semi', 'final'] }
    }
  });

  // Buscar grupos com classificação
  const groups = await prisma.group.findMany({
    where: { category, gender, tournamentId },
    include: {
      teams: {
        orderBy: [
          { wins: 'desc' },
          { gamesWon: 'desc' }
        ]
      }
    },
    orderBy: { name: 'asc' }
  });

  // ===== CATEGORIA B: Final direta 1º × 2º =====
  if (category === 'B') {
    if (groups.length !== 1) {
      throw new Error('Categoria B deve ter exatamente 1 grupo');
    }

    const teams = groups[0].teams;

    if (teams.length < 2) {
      throw new Error('Categoria B precisa ter pelo menos 2 duplas no grupo para gerar a final');
    }

    const first = teams[0];
    const second = teams[1];

    console.log('=== CATEGORIA B - FINAL DIRETA ===');
    console.log('1º:', first.player1, '/', first.player2);
    console.log('2º:', second.player1, '/', second.player2);

    const final = await prisma.match.create({
      data: {
        team1Id: first.id,
        team2Id: second.id,
        category,
        gender,
        tournamentId,
        phase: 'final',
        isBestOf3: true
      },
      include: {
        team1: { include: { club: true } },
        team2: { include: { club: true } }
      }
    });

    return [final];
  }

  // ===== CATEGORIAS NORMAIS (E, D, C): 4 grupos =====
  if (groups.length !== 4) {
    throw new Error('É necessário ter 4 grupos gerados primeiro');
  }

  // Organizar grupos por nome
  const groupMap = {};
  groups.forEach(g => {
    groupMap[g.name] = g.teams;
  });

  // Verificar se cada grupo tem pelo menos 2 times
  ['A', 'B', 'C', 'D'].forEach(name => {
    if (!groupMap[name] || groupMap[name].length < 2) {
      throw new Error(`Grupo ${name} não tem duplas suficientes classificadas`);
    }
  });

  // Pegar os classificados (1º e 2º de cada grupo)
  const classified = [
    groupMap['A'][0], groupMap['A'][1],
    groupMap['B'][0], groupMap['B'][1],
    groupMap['C'][0], groupMap['C'][1],
    groupMap['D'][0], groupMap['D'][1],
  ];

  // Verificar se não há IDs duplicados
  const allIds = classified.map(t => t.id);
  const uniqueIds = new Set(allIds);
  if (uniqueIds.size !== 8) {
    console.error('ERRO: IDs duplicados detectados!', allIds);
    throw new Error('Erro: duplas duplicadas nas classificações. Verifique os grupos.');
  }

  // === CRUZAMENTO POR CAMPANHA ===
  // Ordenar todos os 8 classificados pela campanha geral
  const ranked = sortByCampaign(classified);

  console.log('=== CLASSIFICADOS POR CAMPANHA ===');
  ranked.forEach((t, i) => {
    const saldo = t.gamesWon - t.gamesLost;
    console.log(`${i+1}º: ${t.player1}/${t.player2} | Vitórias: ${t.wins} | Saldo: ${saldo} | Games: ${t.gamesWon}`);
  });

  // Cruzamento: 1º x 8º, 2º x 7º, 3º x 6º, 4º x 5º
  const matchups = [
    [ranked[0], ranked[7]],
    [ranked[1], ranked[6]],
    [ranked[2], ranked[5]],
    [ranked[3], ranked[4]],
  ];

  const quartas = [];

  for (let i = 0; i < matchups.length; i++) {
    const [teamA, teamB] = matchups[i];
    console.log(`Criando Quarta ${i+1}: ${teamA.player1}/${teamA.player2} x ${teamB.player1}/${teamB.player2}`);
    quartas.push(await prisma.match.create({
      data: {
        team1Id: teamA.id,
        team2Id: teamB.id,
        category,
        gender,
        tournamentId,
        phase: 'quartas'
      },
      include: {
        team1: { include: { club: true } },
        team2: { include: { club: true } }
      }
    }));
  }

  console.log('=== QUARTAS CRIADAS ===');
  quartas.forEach((q, i) => {
    console.log(`Quarta ${i+1}: ${q.team1.player1}/${q.team1.player2} x ${q.team2.player1}/${q.team2.player2}`);
  });

  return quartas;
};

export const getElimination = async (category, gender, tournamentId) => {
  return await prisma.match.findMany({
    where: {
      category,
      gender,
      tournamentId,
      phase: { in: ['quartas', 'semi', 'final'] }
    },
    include: {
      team1: { include: { club: true } },
      team2: { include: { club: true } }
    },
    orderBy: { id: 'asc' }
  });
};

export const advanceWinner = async (matchId, score1, score2, isWo = false, woTeam = null) => {
  let finalScore1 = score1;
  let finalScore2 = score2;
  if (isWo) {
    finalScore1 = woTeam === 1 ? 0 : 2;
    finalScore2 = woTeam === 2 ? 0 : 2;
  }

  const match = await prisma.match.update({
    where: { id: matchId },
    data: { score1: finalScore1, score2: finalScore2, status: 'finalizado', isWo, woTeam }
  });

  if (match.phase === 'quartas') {
    const quartasFinished = await prisma.match.findMany({
      where: {
        category: match.category,
        gender: match.gender,
        tournamentId: match.tournamentId,
        phase: 'quartas',
        status: 'finalizado'
      },
      orderBy: { id: 'asc' }
    });

    if (quartasFinished.length === 4) {
      const winners = quartasFinished.map(m =>
        m.score1 > m.score2 ? m.team1Id : m.team2Id
      );

      await prisma.match.create({
        data: {
          team1Id: winners[0],
          team2Id: winners[1],
          category: match.category,
          gender: match.gender,
          tournamentId: match.tournamentId,
          phase: 'semi'
        }
      });

      await prisma.match.create({
        data: {
          team1Id: winners[2],
          team2Id: winners[3],
          category: match.category,
          gender: match.gender,
          tournamentId: match.tournamentId,
          phase: 'semi'
        }
      });
    }
  }

  if (match.phase === 'semi') {
    const semiFinished = await prisma.match.findMany({
      where: {
        category: match.category,
        gender: match.gender,
        tournamentId: match.tournamentId,
        phase: 'semi',
        status: 'finalizado'
      },
      orderBy: { id: 'asc' }
    });

    const totalSemis = await prisma.match.count({
      where: {
        category: match.category,
        gender: match.gender,
        tournamentId: match.tournamentId,
        phase: 'semi'
      }
    });

    if (semiFinished.length === totalSemis) {
      // Categorias normais (E, D, C): 2 semis → final
      const winners = semiFinished.map(m =>
        m.score1 > m.score2 ? m.team1Id : m.team2Id
      );

      await prisma.match.create({
        data: {
          team1Id: winners[0],
          team2Id: winners[1],
          category: match.category,
          gender: match.gender,
          tournamentId: match.tournamentId,
          phase: 'final'
        }
      });
    }
  }

  return match;
};

// Atualiza quais duplas participam de uma partida eliminatória (apenas antes de finalizada)
export const updateMatchTeams = async (matchId, team1Id, team2Id) => {
  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) throw new Error('Partida não encontrada');
  if (match.status === 'finalizado') throw new Error('Não é possível editar uma partida já finalizada');

  return await prisma.match.update({
    where: { id: matchId },
    data: { team1Id, team2Id },
    include: {
      team1: { include: { club: true } },
      team2: { include: { club: true } }
    }
  });
};
