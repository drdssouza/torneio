import { useState } from 'react';
import { useStore } from '../store/useStore';
import { api } from '../utils/api';
import { Trophy, Edit2 } from 'lucide-react';

export default function EliminationBracket({ onUpdate }) {
  const { elimination, isAuthenticated, category } = useStore();
  const [localScores, setLocalScores] = useState({});
  const [editingMatches, setEditingMatches] = useState(new Set());

  const quartas = elimination.filter(m => m.phase === 'quartas');
  const semi = elimination.filter(m => m.phase === 'semi');
  const final = elimination.filter(m => m.phase === 'final');

  const handleScoreChange = (matchId, field, value) => {
    setLocalScores(prev => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        [field]: value
      }
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

      setEditingMatches(prev => {
        const newSet = new Set(prev);
        newSet.delete(matchId);
        return newSet;
      });

      setLocalScores(prev => {
        const newScores = { ...prev };
        delete newScores[matchId];
        return newScores;
      });

      onUpdate();

      // Recalcular pontos automaticamente
      try {
        await api.calculateRanking();
      } catch (err) {
        console.log('Erro ao calcular ranking:', err);
      }
    } catch (error) {
      alert('Erro ao salvar placar');
    }
  };

  const startEditing = (match) => {
    setEditingMatches(prev => new Set(prev).add(match.id));
    setLocalScores(prev => ({
      ...prev,
      [match.id]: {
        score1: match.score1?.toString() || '',
        score2: match.score2?.toString() || ''
      }
    }));
  };

  const cancelEditing = (matchId) => {
    setEditingMatches(prev => {
      const newSet = new Set(prev);
      newSet.delete(matchId);
      return newSet;
    });
    setLocalScores(prev => {
      const newScores = { ...prev };
      delete newScores[matchId];
      return newScores;
    });
  };

  const renderMatch = (match) => {
    const isEditing = editingMatches.has(match.id);
    const isFinalized = match.status === 'finalizado' && !isEditing;
    const currentScores = localScores[match.id] || {};
    const isBestOf3 = match.isBestOf3;

    return (
      <div key={match.id} className="border border-gray-200 rounded-lg p-4 bg-white">
        {isBestOf3 && (
          <div className="mb-3 flex items-center gap-2">
            <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full border border-amber-200 font-medium">
              Melhor de 3 Sets
            </span>
            <span className="text-xs text-gray-400">Placar = sets ganhos (máx. 2)</span>
          </div>
        )}

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${isFinalized && match.score1 > match.score2 ? 'text-gray-900' : 'text-gray-700'}`}>
                {match.team1.player1} / {match.team1.player2}
              </p>
              <p className="text-xs text-gray-500">{match.team1.club.name}</p>
            </div>
            {isFinalized ? (
              <span className={`text-lg font-semibold ${match.score1 > match.score2 ? 'text-gray-900' : 'text-gray-400'}`}>
                {match.score1}
              </span>
            ) : (
              isAuthenticated && (
                <input
                  type="number"
                  min="0"
                  max={isBestOf3 ? 2 : undefined}
                  placeholder="0"
                  value={currentScores.score1 || ''}
                  className="w-12 px-2 py-1 border border-gray-300 rounded text-center text-sm focus:outline-none focus:border-gray-900"
                  onChange={(e) => handleScoreChange(match.id, 'score1', e.target.value)}
                />
              )
            )}
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${isFinalized && match.score2 > match.score1 ? 'text-gray-900' : 'text-gray-700'}`}>
                {match.team2.player1} / {match.team2.player2}
              </p>
              <p className="text-xs text-gray-500">{match.team2.club.name}</p>
            </div>
            {isFinalized ? (
              <span className={`text-lg font-semibold ${match.score2 > match.score1 ? 'text-gray-900' : 'text-gray-400'}`}>
                {match.score2}
              </span>
            ) : (
              isAuthenticated && (
                <input
                  type="number"
                  min="0"
                  max={isBestOf3 ? 2 : undefined}
                  placeholder="0"
                  value={currentScores.score2 || ''}
                  className="w-12 px-2 py-1 border border-gray-300 rounded text-center text-sm focus:outline-none focus:border-gray-900"
                  onChange={(e) => handleScoreChange(match.id, 'score2', e.target.value)}
                />
              )
            )}
          </div>
        </div>

        {isFinalized && isAuthenticated ? (
          <button
            onClick={() => startEditing(match)}
            className="mt-3 w-full border border-gray-300 text-gray-700 py-2 rounded text-sm hover:bg-gray-50 transition flex items-center justify-center gap-2"
          >
            <Edit2 className="w-4 h-4" /> Editar Placar
          </button>
        ) : (
          !isFinalized && isAuthenticated && (
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => handleSave(match.id)}
                className="flex-1 bg-gray-900 text-white py-2 rounded text-sm hover:bg-gray-800 transition"
              >
                Salvar
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

  return (
    <div className="space-y-16">
      {quartas.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Quartas de Final</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quartas.map(renderMatch)}
          </div>
        </div>
      )}

      {semi.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Semifinal</h3>
            {category === 'B' && (
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                2º lugar × 3º lugar
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
            {semi.map(renderMatch)}
          </div>
          {category === 'B' && (
            <p className="text-xs text-gray-400 text-center mt-3">
              O 1º colocado aguarda o vencedor desta semifinal para a grande final.
            </p>
          )}
        </div>
      )}

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
