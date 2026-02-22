import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

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

  // ===== CATEGORIA B: formato especial =====
  // 1 grupo único, 1º vai direto à final, 2º x 3º na semi, final melhor de 3 sets
  if (category === 'B') {
    if (groups.length !== 1) {
      throw new Error('Categoria B deve ter exatamente 1 grupo');
    }

    const teams = groups[0].teams;

    if (teams.length < 3) {
      throw new Error('Categoria B precisa ter pelo menos 3 duplas no grupo para gerar eliminatórias');
    }

    const second = teams[1];
    const third = teams[2];

    console.log('=== CATEGORIA B - ELIMINATÓRIAS ===');
    console.log('1º (bye → final):', teams[0].player1, '/', teams[0].player2);
    console.log('Semi: 2º', second.player1, '/', second.player2, 'x 3º', third.player1, '/', third.player2);

    const semi = await prisma.match.create({
      data: {
        team1Id: second.id,
        team2Id: third.id,
        category,
        gender,
        tournamentId,
        phase: 'semi'
      },
      include: {
        team1: { include: { club: true } },
        team2: { include: { club: true } }
      }
    });

    return [semi];
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

  // Pegar os classificados
  const first_A = groupMap['A'][0];
  const second_A = groupMap['A'][1];
  const first_B = groupMap['B'][0];
  const second_B = groupMap['B'][1];
  const first_C = groupMap['C'][0];
  const second_C = groupMap['C'][1];
  const first_D = groupMap['D'][0];
  const second_D = groupMap['D'][1];

  // LOG DE DEBUG
  console.log('=== CLASSIFICADOS ===');
  console.log('Grupo A - 1º:', first_A.player1, '/', first_A.player2);
  console.log('Grupo A - 2º:', second_A.player1, '/', second_A.player2);
  console.log('Grupo B - 1º:', first_B.player1, '/', first_B.player2);
  console.log('Grupo B - 2º:', second_B.player1, '/', second_B.player2);
  console.log('Grupo C - 1º:', first_C.player1, '/', first_C.player2);
  console.log('Grupo C - 2º:', second_C.player1, '/', second_C.player2);
  console.log('Grupo D - 1º:', first_D.player1, '/', first_D.player2);
  console.log('Grupo D - 2º:', second_D.player1, '/', second_D.player2);

  // Verificar se não há IDs duplicados
  const allIds = [
    first_A.id, second_A.id, first_B.id, second_B.id,
    first_C.id, second_C.id, first_D.id, second_D.id
  ];
  const uniqueIds = new Set(allIds);

  if (uniqueIds.size !== 8) {
    console.error('ERRO: IDs duplicados detectados!', allIds);
    throw new Error('Erro: duplas duplicadas nas classificações. Verifique os grupos.');
  }

  // Criar as quartas de final
  const quartas = [];

  // Quarta 1: 1ºA x 2ºD
  console.log('Criando Quarta 1: 1ºA x 2ºD');
  quartas.push(await prisma.match.create({
    data: {
      team1Id: first_A.id,
      team2Id: second_D.id,
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

  // Quarta 2: 1ºB x 2ºC
  console.log('Criando Quarta 2: 1ºB x 2ºC');
  quartas.push(await prisma.match.create({
    data: {
      team1Id: first_B.id,
      team2Id: second_C.id,
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

  // Quarta 3: 1ºC x 2ºB
  console.log('Criando Quarta 3: 1ºC x 2ºB');
  quartas.push(await prisma.match.create({
    data: {
      team1Id: first_C.id,
      team2Id: second_B.id,
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

  // Quarta 4: 1ºD x 2ºA
  console.log('Criando Quarta 4: 1ºD x 2ºA');
  quartas.push(await prisma.match.create({
    data: {
      team1Id: first_D.id,
      team2Id: second_A.id,
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

export const advanceWinner = async (matchId, score1, score2) => {
  const match = await prisma.match.update({
    where: { id: matchId },
    data: { score1, score2, status: 'finalizado' }
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
    // Buscar todas as semis finalizadas desta categoria/genero
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

    // Contar total de semis
    const totalSemis = await prisma.match.count({
      where: {
        category: match.category,
        gender: match.gender,
        tournamentId: match.tournamentId,
        phase: 'semi'
      }
    });

    if (semiFinished.length === totalSemis) {
      // Categoria B: 1 semi → final com 1º lugar do grupo + isBestOf3
      if (match.category === 'B') {
        const group = await prisma.group.findFirst({
          where: {
            category: match.category,
            gender: match.gender,
            tournamentId: match.tournamentId
          },
          include: {
            teams: {
              orderBy: [
                { wins: 'desc' },
                { gamesWon: 'desc' }
              ]
            }
          }
        });

        const firstPlace = group.teams[0];
        const semiWinner = match.score1 > match.score2 ? match.team1Id : match.team2Id;

        console.log('Categoria B - Criando final:', firstPlace.player1, '/', firstPlace.player2, '(1º lugar) x vencedor da semi');

        await prisma.match.create({
          data: {
            team1Id: firstPlace.id,
            team2Id: semiWinner,
            category: match.category,
            gender: match.gender,
            tournamentId: match.tournamentId,
            phase: 'final',
            isBestOf3: true
          }
        });
      } else {
        // Categorias normais: 2 semis → final
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
  }

  return match;
};
