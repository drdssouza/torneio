import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const generateGroups = async (category, gender, tournamentId) => {
  try {
    console.log(`[GROUPS] Iniciando geração de grupos - ${category} ${gender} Tournament ${tournamentId}`);

    // Limpar grupos e matches anteriores
    console.log('[GROUPS] Limpando matches anteriores...');
    await prisma.match.deleteMany({
      where: {
        category,
        gender,
        tournamentId,
        phase: 'grupos'
      }
    });

    console.log('[GROUPS] Resetando times...');
    await prisma.team.updateMany({
      where: { category, gender, tournamentId },
      data: { groupId: null, wins: 0, gamesWon: 0, gamesLost: 0 }
    });

    console.log('[GROUPS] Deletando grupos anteriores...');
    await prisma.group.deleteMany({ where: { category, gender, tournamentId } });

    // Buscar duplas
    console.log('[GROUPS] Buscando duplas...');
    const teams = await prisma.team.findMany({
      where: { category, gender, tournamentId },
      include: { club: true }
    });

    console.log(`[GROUPS] Encontradas ${teams.length} duplas`);

    // Categoria B: formato especial - 1 grupo único com 4 duplas
    if (category === 'B') {
      if (teams.length !== 4) {
        throw new Error(`Categoria B precisa ter exatamente 4 duplas. Atualmente há ${teams.length} duplas.`);
      }

      const group = await prisma.group.create({
        data: { name: 'A', category, gender, tournamentId }
      });

      for (const team of teams) {
        await prisma.team.update({
          where: { id: team.id },
          data: { groupId: group.id }
        });
      }

      const teamsInGroup = await prisma.team.findMany({
        where: { groupId: group.id }
      });

      for (let i = 0; i < teamsInGroup.length; i++) {
        for (let j = i + 1; j < teamsInGroup.length; j++) {
          await prisma.match.create({
            data: {
              groupId: group.id,
              team1Id: teamsInGroup[i].id,
              team2Id: teamsInGroup[j].id,
              category,
              gender,
              tournamentId,
              phase: 'grupos'
            }
          });
        }
      }

      return await prisma.group.findMany({
        where: { category, gender, tournamentId },
        include: {
          teams: { include: { club: true } },
          matches: {
            include: {
              team1: { include: { club: true } },
              team2: { include: { club: true } }
            }
          }
        }
      });
    }

    // Categorias normais (E, D, C): exigem exatamente 16 duplas
    if (teams.length !== 16) {
      throw new Error(`É necessário ter exatamente 16 duplas cadastradas. Atualmente há ${teams.length} duplas.`);
    }

    // Organizar times por clube
    const teamsByClub = {};
    teams.forEach(team => {
      if (!teamsByClub[team.clubId]) teamsByClub[team.clubId] = [];
      teamsByClub[team.clubId].push(team);
    });

    console.log('[GROUPS] Times por clube:', Object.keys(teamsByClub).map(id =>
      `Clube ${id}: ${teamsByClub[id].length} times`
    ).join(', '));

    // Criar os 4 grupos
    const groupNames = ['A', 'B', 'C', 'D'];
    const groups = [];

    console.log('[GROUPS] Criando grupos...');
    for (const name of groupNames) {
      const group = await prisma.group.create({
        data: { name, category, gender, tournamentId }
      });
      groups.push(group);
      console.log(`[GROUPS] Grupo ${name} criado - ID: ${group.id}`);
    }

    // Distribuir times nos grupos
    const clubIds = Object.keys(teamsByClub).map(id => parseInt(id));
    console.log('[GROUPS] IDs dos clubes:', clubIds);

    for (let groupIndex = 0; groupIndex < 4; groupIndex++) {
      console.log(`[GROUPS] Populando Grupo ${groupNames[groupIndex]}...`);

      // Embaralhar ordem dos clubes para cada grupo
      const shuffledClubIds = [...clubIds].sort(() => Math.random() - 0.5);

      for (const clubId of shuffledClubIds) {
        const availableTeams = teamsByClub[clubId].filter(t => !t.groupId);

        if (availableTeams.length > 0) {
          // Escolher uma dupla ALEATÓRIA
          const randomIndex = Math.floor(Math.random() * availableTeams.length);
          const team = availableTeams[randomIndex];

          console.log(`[GROUPS]   Adicionando time ${team.player1}/${team.player2} (Clube ${clubId})`);

          await prisma.team.update({
            where: { id: team.id },
            data: { groupId: groups[groupIndex].id }
          });

          // Importante: marcar o time como já alocado
          team.groupId = groups[groupIndex].id;
        } else {
          console.warn(`[GROUPS]   AVISO: Clube ${clubId} não tem times disponíveis!`);
        }
      }
    }

    // Criar os jogos dentro de cada grupo
    console.log('[GROUPS] Criando jogos...');
    for (const group of groups) {
      const teamsInGroup = await prisma.team.findMany({
        where: { groupId: group.id }
      });

      console.log(`[GROUPS] Grupo ${group.name}: ${teamsInGroup.length} times`);

      // Gerar confrontos (todos contra todos)
      let matchCount = 0;
      for (let i = 0; i < teamsInGroup.length; i++) {
        for (let j = i + 1; j < teamsInGroup.length; j++) {
          await prisma.match.create({
            data: {
              groupId: group.id,
              team1Id: teamsInGroup[i].id,
              team2Id: teamsInGroup[j].id,
              category,
              gender,
              tournamentId,
              phase: 'grupos'
            }
          });
          matchCount++;
        }
      }
      console.log(`[GROUPS]   ${matchCount} jogos criados no Grupo ${group.name}`);
    }

    // Retornar grupos completos
    console.log('[GROUPS] Buscando resultado final...');
    const result = await prisma.group.findMany({
      where: { category, gender, tournamentId },
      include: {
        teams: { include: { club: true } },
        matches: {
          include: {
            team1: { include: { club: true } },
            team2: { include: { club: true } }
          }
        }
      }
    });

    console.log(`[GROUPS] ✓ Geração concluída! ${result.length} grupos criados`);
    return result;

  } catch (error) {
    console.error('[GROUPS] ❌ ERRO:', error);
    console.error('[GROUPS] Stack:', error.stack);
    throw error;
  }
};

export const getGroups = async (category, gender, tournamentId) => {
  try {
    console.log(`[GROUPS] Buscando grupos - ${category} ${gender} Tournament ${tournamentId}`);

    const groups = await prisma.group.findMany({
      where: { category, gender, tournamentId },
      include: {
        teams: {
          include: { club: true },
          orderBy: [
            { wins: 'desc' },
            { gamesWon: 'desc' }
          ]
        },
        matches: {
          include: {
            team1: { include: { club: true } },
            team2: { include: { club: true } }
          }
        }
      }
    });

    console.log(`[GROUPS] Encontrados ${groups.length} grupos`);
    return groups;

  } catch (error) {
    console.error('[GROUPS] Erro ao buscar grupos:', error);
    throw error;
  }
};
