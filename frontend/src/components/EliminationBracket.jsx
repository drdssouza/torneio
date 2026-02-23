import { useState } from 'react';
import { useStore } from '../store/useStore';
import { api } from '../utils/api';
import { Trophy, Edit2, Users, AlertTriangle, ChevronRight } from 'lucide-react';

export default function EliminationBracket({ onUpdate }) {
  const { elimination, isAuthenticated, category, groups } = useStore();
  const [localScores, setLocalScores] = useState({});
  const [editingMatches, setEditingMatches] = useState(new Set());
  const [woModal, setWoModal] = useState(null);
  const [editTeamsModal, setEditTeamsModal] = useState(null);
  const [editTeamsSelection, setEditTeamsSelection] = useState({ team1Id: '', team2Id: '' });

  const quartas = elimination.filter(m => m.phase === 'quartas');
  const semi = elimination.filter(m => m.phase === 'semi');
  const final = elimination.filter(m => m.phase === 'final');

  const allGroupTeams = groups.flatMap(g => g.teams || []);

  const handleScoreChange = (matchId, field, value) => {
    setLocalScores(prev => ({
      ...prev,
      [matchId]: { ...prev[matchId], [field]: value }
    }));
  };

  const handleSave = async (matchId) => {
    if (!isAuthenticated) {
      alert('Você precisa estar logado como admin!');
      return;
    }
    const scores = localScores[matchId];
    if (!scores || scores.score1 === '' || scores.score2 === '' ||
        scores.score1 === undefined || scores.score2 === undefined) {
      alert('Preencha ambos os placares');
      return;
    }
    try {
      await api.advanceWinner(matchId, parseInt(scores.score1), parseInt(scores.score2));
      setEditingMatches(prev => { const s = new Set(prev); s.delete(matchId); return s; });
      setLocalScores(prev => { const n = { ...prev }; delete n[matchId]; return n; });
      onUpdate();
      try { await api.calculateRanking(); } catch (err) { console.log('Erro ao calcular ranking:', err); }
    } catch (error) {
      alert('Erro ao salvar placar');
    }
  };

  const handleWo = async (matchId, woTeam) => {
    if (!isAuthenticated) return;
    try {
      await api.advanceWinner(matchId, null, null, true, woTeam);
      setWoModal(null);
      onUpdate();
      try { await api.calculateRanking(); } catch (err) { console.log('Erro ao calcular ranking:', err); }
    } catch (error) {
      alert('Erro ao registrar W.O.');
    }
  };

  const handleEditTeams = async () => {
    const { team1Id, team2Id } = editTeamsSelection;
    if (!team1Id || !team2Id) { alert('Selecione as duas duplas'); return; }
    if (team1Id === team2Id) { alert('As duas duplas devem ser diferentes'); return; }
    try {
      await api.updateEliminationTeams(editTeamsModal.match.id, parseInt(team1Id), parseInt(team2Id));
      setEditTeamsModal(null);
      onUpdate();
    } catch (error) {
      alert(error.message || 'Erro ao editar confronto');
    }
  };

  const startEditing = (match) => {
    setEditingMatches(prev => new Set(prev).add(match.id));
    setLocalScores(prev => ({
      ...prev,
      [match.id]: {
        score1: match.isWo ? '' : (match.score1?.toString() || ''),
        score2: match.isWo ? '' : (match.score2?.toString() || '')
      }
    }));
  };

  const cancelEditing = (matchId) => {
    setEditingMatches(prev => { const s = new Set(prev); s.delete(matchId); return s; });
    setLocalScores(prev => { const n = { ...prev }; delete n[matchId]; return n; });
  };

  const openEditTeams = (match) => {
    setEditTeamsModal({ match });
    setEditTeamsSelection({ team1Id: match.team1Id.toString(), team2Id: match.team2Id.toString() });
  };

  const renderMatch = (match) => {
    if (!match) return null;
    const isEditing = editingMatches.has(match.id);
    const isFinalized = match.status === 'finalizado' && !isEditing;
    const currentScores = localScores[match.id] || {};
    const isBestOf3 = match.isBestOf3;
    const isWo = match.isWo;
    const woTeam = match.woTeam;
    const canEditTeams = !isFinalized && match.phase !== 'final';

    return (
      <div key={match.id} className={`border rounded-lg p-4 bg-white ${isWo && isFinalized ? 'border-amber-300' : 'border-gray-200'}`}>
        {isBestOf3 && (
          <div className="mb-3 flex items-center gap-2">
            <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full border border-amber-200 font-medium">
              Melhor de 3 Sets
            </span>
            <span className="text-xs text-gray-400">Placar = sets ganhos (máx. 2)</span>
          </div>
        )}

        <div className="space-y-3">
          {/* Team 1 */}
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0 pr-2">
              <p className={`text-sm font-medium truncate ${isFinalized && isWo && woTeam === 1 ? 'text-red-400 line-through' : isFinalized && match.score1 > match.score2 ? 'text-gray-900 font-semibold' : 'text-gray-700'}`}>
                {match.team1.player1} / {match.team1.player2}
              </p>
              <p className="text-xs text-gray-500 truncate">{match.team1.club.name}</p>
            </div>
            {isFinalized ? (
              <span className={`text-lg font-semibold flex-shrink-0 ${match.score1 > match.score2 ? 'text-gray-900' : 'text-gray-400'}`}>
                {isWo && woTeam === 1 ? 'W.O.' : match.score1}
              </span>
            ) : (
              isAuthenticated && (
                <input
                  type="number" min="0" max={isBestOf3 ? 2 : undefined} placeholder="0"
                  value={currentScores.score1 || ''}
                  className="w-12 px-2 py-1 border border-gray-300 rounded text-center text-sm focus:outline-none focus:border-gray-900 flex-shrink-0"
                  onChange={(e) => handleScoreChange(match.id, 'score1', e.target.value)}
                />
              )
            )}
          </div>

          <div className="border-t border-gray-100" />

          {/* Team 2 */}
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0 pr-2">
              <p className={`text-sm font-medium truncate ${isFinalized && isWo && woTeam === 2 ? 'text-red-400 line-through' : isFinalized && match.score2 > match.score1 ? 'text-gray-900 font-semibold' : 'text-gray-700'}`}>
                {match.team2.player1} / {match.team2.player2}
              </p>
              <p className="text-xs text-gray-500 truncate">{match.team2.club.name}</p>
            </div>
            {isFinalized ? (
              <span className={`text-lg font-semibold flex-shrink-0 ${match.score2 > match.score1 ? 'text-gray-900' : 'text-gray-400'}`}>
                {isWo && woTeam === 2 ? 'W.O.' : match.score2}
              </span>
            ) : (
              isAuthenticated && (
                <input
                  type="number" min="0" max={isBestOf3 ? 2 : undefined} placeholder="0"
                  value={currentScores.score2 || ''}
                  className="w-12 px-2 py-1 border border-gray-300 rounded text-center text-sm focus:outline-none focus:border-gray-900 flex-shrink-0"
                  onChange={(e) => handleScoreChange(match.id, 'score2', e.target.value)}
                />
              )
            )}
          </div>
        </div>

        {isFinalized && isWo && (
          <div className="mt-2 flex justify-center">
            <span className="text-xs bg-amber-100 text-amber-700 px-3 py-1 rounded-full font-medium">W.O.</span>
          </div>
        )}

        {/* Action buttons */}
        {isFinalized && isAuthenticated ? (
          <button
            onClick={() => startEditing(match)}
            className="mt-3 w-full border border-gray-300 text-gray-700 py-2 rounded text-sm hover:bg-gray-50 transition flex items-center justify-center gap-2"
          >
            <Edit2 className="w-4 h-4" /> Editar Placar
          </button>
        ) : (
          !isFinalized && isAuthenticated && (
            <div className="mt-3 space-y-2">
              <div className="flex gap-2">
                <button
                  onClick={() => handleSave(match.id)}
                  className="flex-1 bg-gray-900 text-white py-2 rounded text-sm hover:bg-gray-800 transition"
                >
                  Salvar
                </button>
                <button
                  onClick={() => setWoModal({ matchId: match.id, team1: match.team1, team2: match.team2 })}
                  className="px-4 bg-amber-500 text-white py-2 rounded text-sm hover:bg-amber-600 transition font-medium"
                  title="Registrar W.O."
                >
                  W.O.
                </button>
                {isEditing && (
                  <button
                    onClick={() => cancelEditing(match.id)}
                    className="px-4 border border-gray-300 text-gray-700 py-2 rounded text-sm hover:bg-gray-50 transition"
                  >
                    Cancelar
                  </button>
                )}
              </div>
              {canEditTeams && (
                <button
                  onClick={() => openEditTeams(match)}
                  className="w-full border border-blue-200 text-blue-700 py-2 rounded text-sm hover:bg-blue-50 transition flex items-center justify-center gap-2"
                >
                  <Users className="w-4 h-4" /> Editar Confronto
                </button>
              )}
            </div>
          )
        )}
      </div>
    );
  };

  const champion = final[0]?.status === 'finalizado'
    ? (final[0].score1 > final[0].score2 ? final[0].team1 : final[0].team2)
    : null;

  if (quartas.length === 0 && semi.length === 0 && final.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Nenhuma eliminatória gerada ainda.</p>
        {category === 'B' && (
          <p className="text-sm text-gray-400 mt-2">
            Conclua todos os jogos da fase de grupos para gerar as eliminatórias.
          </p>
        )}
      </div>
    );
  }

  // ===== CATEGORIA B: Final direta 1º × 2º =====
  const renderCategoryBBracket = () => (
    <div>
      {final.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold text-gray-900">Final</h3>
            {final[0]?.isBestOf3 && (
              <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full border border-amber-200 font-medium">
                Melhor de 3 Sets
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mb-5">
            1º lugar × 2º lugar
          </p>
          <div className="max-w-sm">
            {renderMatch(final[0])}
          </div>
        </div>
      )}
    </div>
  );

  // ===== CATEGORIAS E, D, C: Quartas → Semis → Final =====
  const renderNormalBracket = () => (
    <div className="space-y-12">
      {/* Quartas de Final */}
      {quartas.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Quartas de Final</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Chave 1: Q1 + Q2 → Semi 1 */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full">
                  Chave 1
                </span>
                <ChevronRight className="w-4 h-4 text-gray-300" />
                <span className="text-xs text-gray-400">Semifinal 1</span>
              </div>
              <div className="space-y-4 border-l-4 border-blue-200 pl-4">
                {quartas[0] && renderMatch(quartas[0])}
                {quartas[1] && renderMatch(quartas[1])}
              </div>
            </div>

            {/* Chave 2: Q3 + Q4 → Semi 2 */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs font-semibold text-violet-700 bg-violet-50 border border-violet-200 px-3 py-1 rounded-full">
                  Chave 2
                </span>
                <ChevronRight className="w-4 h-4 text-gray-300" />
                <span className="text-xs text-gray-400">Semifinal 2</span>
              </div>
              <div className="space-y-4 border-l-4 border-violet-200 pl-4">
                {quartas[2] && renderMatch(quartas[2])}
                {quartas[3] && renderMatch(quartas[3])}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Semifinal */}
      {semi.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Semifinal</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {semi[0] && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full">
                    Semifinal 1
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-300" />
                  <span className="text-xs text-gray-400">Final</span>
                </div>
                <div className="border-l-4 border-blue-200 pl-4">
                  {renderMatch(semi[0])}
                </div>
              </div>
            )}

            {semi[1] && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xs font-semibold text-violet-700 bg-violet-50 border border-violet-200 px-3 py-1 rounded-full">
                    Semifinal 2
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-300" />
                  <span className="text-xs text-gray-400">Final</span>
                </div>
                <div className="border-l-4 border-violet-200 pl-4">
                  {renderMatch(semi[1])}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Final */}
      {final.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Final</h3>
            {final[0]?.isBestOf3 && (
              <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full border border-amber-200 font-medium">
                Melhor de 3 Sets
              </span>
            )}
          </div>
          <div className="max-w-md mx-auto">
            {renderMatch(final[0])}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-16">
      {/* Modal W.O. */}
      {woModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <h3 className="font-semibold text-gray-900">Registrar W.O.</h3>
            </div>
            <p className="text-sm text-gray-600 mb-5">Qual dupla deu W.O. (não compareceu)?</p>
            <div className="space-y-3">
              <button
                onClick={() => handleWo(woModal.matchId, 1)}
                className="w-full text-left px-4 py-3 border border-gray-200 rounded-lg hover:bg-red-50 hover:border-red-300 transition text-sm"
              >
                <span className="font-medium text-red-600">W.O.</span>
                <span className="ml-2 text-gray-900">{woModal.team1.player1} / {woModal.team1.player2}</span>
                <span className="ml-1 text-gray-500 text-xs">({woModal.team1.club.name})</span>
              </button>
              <button
                onClick={() => handleWo(woModal.matchId, 2)}
                className="w-full text-left px-4 py-3 border border-gray-200 rounded-lg hover:bg-red-50 hover:border-red-300 transition text-sm"
              >
                <span className="font-medium text-red-600">W.O.</span>
                <span className="ml-2 text-gray-900">{woModal.team2.player1} / {woModal.team2.player2}</span>
                <span className="ml-1 text-gray-500 text-xs">({woModal.team2.club.name})</span>
              </button>
            </div>
            <button
              onClick={() => setWoModal(null)}
              className="mt-4 w-full py-2 text-sm text-gray-500 hover:text-gray-700"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Modal Editar Confronto */}
      {editTeamsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-gray-900">Editar Confronto</h3>
            </div>
            <p className="text-sm text-gray-500 mb-5">
              Selecione as duplas que vão se enfrentar nesta partida.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Dupla 1</label>
                <select
                  value={editTeamsSelection.team1Id}
                  onChange={(e) => setEditTeamsSelection(prev => ({ ...prev, team1Id: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="">Selecione...</option>
                  {allGroupTeams.map(team => (
                    <option key={team.id} value={team.id}>
                      {team.player1} / {team.player2} — {team.club?.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="text-center text-gray-400 text-sm font-medium">× VS ×</div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Dupla 2</label>
                <select
                  value={editTeamsSelection.team2Id}
                  onChange={(e) => setEditTeamsSelection(prev => ({ ...prev, team2Id: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="">Selecione...</option>
                  {allGroupTeams.map(team => (
                    <option key={team.id} value={team.id}>
                      {team.player1} / {team.player2} — {team.club?.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleEditTeams}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm hover:bg-blue-700 transition font-medium"
              >
                Confirmar
              </button>
              <button
                onClick={() => setEditTeamsModal(null)}
                className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bracket */}
      {category === 'B' ? renderCategoryBBracket() : renderNormalBracket()}

      {/* Campeão */}
      {champion && (
        <div className="border-2 border-gray-900 rounded-lg p-8 text-center max-w-md mx-auto">
          <Trophy className="w-12 h-12 mx-auto mb-4 text-gray-900" />
          <p className="text-sm text-gray-500 mb-2">Campeão</p>
          <p className="text-xl font-bold text-gray-900">
            {champion.player1} / {champion.player2}
          </p>
          <p className="text-sm text-gray-600 mt-2">{champion.club.name}</p>
        </div>
      )}
    </div>
  );
}
