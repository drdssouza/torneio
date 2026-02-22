import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trophy, ChevronDown, ChevronUp, Calculator } from 'lucide-react';
import { api } from '../utils/api';
import { useStore } from '../store/useStore';

export default function Ranking() {
  const navigate = useNavigate();
  const [ranking, setRanking] = useState([]);
  const [expandedClub, setExpandedClub] = useState(null);
  const [detailedData, setDetailedData] = useState({});
  const { isAuthenticated } = useStore();

  useEffect(() => {
    loadRanking();
  }, []);

  const loadRanking = async () => {
    const data = await api.getRanking();
    setRanking(Array.isArray(data) ? data : []);
  };

  const handleCalculate = async () => {
    if (!isAuthenticated) {
      alert('Você precisa estar logado como admin!');
      return;
    }
    await api.calculateRanking();
    loadRanking();
  };

  const toggleClub = async (clubName) => {
    if (expandedClub === clubName) {
      setExpandedClub(null);
    } else {
      setExpandedClub(clubName);
      if (!detailedData[clubName]) {
        const data = await api.getDetailedRanking(clubName);
        setDetailedData({ ...detailedData, [clubName]: data });
      }
    }
  };

  const getPlacementLabel = (placement) => {
    const labels = {
      grupos: 'Não passou da fase de grupos',
      quartas: 'Eliminado nas quartas',
      semi: 'Eliminado na semifinal',
      finalista: 'Vice-campeão',
      campeao: 'Campeão'
    };
    return labels[placement] || 'N/A';
  };

  const getPlacementColor = (placement) => {
    const colors = {
      grupos: 'text-gray-600',
      quartas: 'text-orange-600',
      semi: 'text-blue-600',
      finalista: 'text-purple-600',
      campeao: 'text-yellow-600'
    };
    return colors[placement] || 'text-gray-600';
  };

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => navigate('/')}
              className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" /> Voltar
            </button>

            {isAuthenticated && (
              <button
                onClick={handleCalculate}
                className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded text-sm hover:bg-gray-800 transition"
              >
                <Calculator className="w-4 h-4" /> Calcular Pontos
              </button>
            )}
          </div>

          <div>
            <h1 className="text-2xl font-bold text-gray-900">Classificação Geral</h1>
            <p className="text-sm text-gray-500 mt-1">Ranking por pontos das arenas</p>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Tabela de Pontos */}
        <div className="border border-gray-200 rounded-lg p-4 mb-8 bg-blue-50">
          <p className="text-sm font-medium text-gray-900 mb-3">Sistema de Pontuação:</p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs text-gray-700">
            <div><span className="font-semibold">2 pts</span> - Fase de grupos</div>
            <div><span className="font-semibold">4 pts</span> - Quartas de final</div>
            <div><span className="font-semibold">8 pts</span> - Semifinal</div>
            <div><span className="font-semibold">10 pts</span> - Finalista</div>
            <div><span className="font-semibold">15 pts</span> - Campeão</div>
          </div>
        </div>

        {/* Ranking */}
        <div className="space-y-4">
          {ranking.map((club, index) => (
            <div key={club.clubName} className="border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleClub(club.clubName)}
                className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition"
              >
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100">
                    {index === 0 && <Trophy className="w-5 h-5 text-yellow-600" />}
                    {index !== 0 && <span className="font-bold text-gray-600">{index + 1}</span>}
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-gray-900">{club.clubName}</p>
                    <p className="text-sm text-gray-500">Clique para ver detalhes</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">{club.totalPoints}</p>
                    <p className="text-xs text-gray-500">pontos</p>
                  </div>
                  {expandedClub === club.clubName ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </button>

              {expandedClub === club.clubName && detailedData[club.clubName] && (
                <div className="border-t border-gray-200 bg-gray-50 p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Detalhamento por Categoria</h3>
                  
                  {['E', 'D', 'C', 'B'].map(category => (
                    <div key={category} className="mb-6 last:mb-0">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">
                        Categoria {category}
                        {category === 'B' && (
                          <span className="ml-2 text-xs text-gray-400 font-normal">Final: Melhor de 3 Sets</span>
                        )}
                      </h4>

                      {(category === 'B' ? ['MASCULINO'] : ['MASCULINO', 'FEMININO']).map(gender => {
                        const teams = detailedData[club.clubName].filter(
                          t => t.category === category && t.gender === gender
                        );

                        if (teams.length === 0) return null;

                        return (
                          <div key={gender} className="mb-4">
                            <p className="text-xs text-gray-500 mb-2">{gender}</p>
                            <div className="space-y-2">
                              {teams.map(team => (
                                <div
                                  key={team.id}
                                  className="flex items-center justify-between bg-white px-4 py-3 rounded border border-gray-200"
                                >
                                  <div>
                                    <p className="text-sm font-medium text-gray-900">
                                      {team.player1} / {team.player2}
                                    </p>
                                    <p className={`text-xs ${getPlacementColor(team.placement)}`}>
                                      {getPlacementLabel(team.placement)}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-lg font-bold text-gray-900">{team.points}</p>
                                    <p className="text-xs text-gray-500">pts</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}