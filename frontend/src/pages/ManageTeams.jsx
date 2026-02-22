import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Shuffle, Edit2, X, Check } from 'lucide-react';
import { api } from '../utils/api';

export default function ManageTeams() {
  const { category, gender } = useParams();
  const navigate = useNavigate();
  const [teams, setTeams] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [groups, setGroups] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [editForm, setEditForm] = useState({
    player1: '',
    player2: '',
    clubId: ''
  });
  const [formData, setFormData] = useState({
    player1: '',
    player2: '',
    clubId: ''
  });

  useEffect(() => {
    loadData();
  }, [category, gender]);

  const loadData = async () => {
    const [teamsData, clubsData, groupsData] = await Promise.all([
      api.getTeams(category, gender),
      api.getClubs(),
      api.getGroups(category, gender)
    ]);
    setTeams(teamsData);
    setClubs(clubsData);
    setGroups(groupsData);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.createTeam(
        formData.player1,
        formData.player2,
        parseInt(formData.clubId),
        category,
        gender
      );
      setFormData({ player1: '', player2: '', clubId: '' });
      setShowForm(false);
      loadData();
    } catch (error) {
      alert('Erro ao criar dupla');
    }
  };

  const handleDelete = async (id) => {
    if (groups.length > 0) {
      alert('Não é possível excluir duplas após os grupos terem sido gerados!');
      return;
    }
    
    if (confirm('Excluir esta dupla?')) {
      await api.deleteTeam(id);
      loadData();
    }
  };

  const startEditing = (team) => {
    setEditingTeam(team.id);
    setEditForm({
      player1: team.player1,
      player2: team.player2,
      clubId: team.clubId.toString()
    });
  };

  const cancelEditing = () => {
    setEditingTeam(null);
    setEditForm({ player1: '', player2: '', clubId: '' });
  };

  const handleUpdate = async (teamId) => {
    if (!editForm.player1.trim() || !editForm.player2.trim() || !editForm.clubId) {
      alert('Preencha todos os campos!');
      return;
    }

    try {
      await api.updateTeam(
        teamId,
        editForm.player1.trim(),
        editForm.player2.trim(),
        parseInt(editForm.clubId)
      );
      setEditingTeam(null);
      setEditForm({ player1: '', player2: '', clubId: '' });
      loadData();
    } catch (error) {
      alert('Erro ao atualizar dupla');
    }
  };

  const handleGenerateGroups = async () => {
    if (groups.length > 0) {
      alert('Os grupos já foram gerados para esta categoria!');
      return;
    }

    if (!confirm('Deseja gerar os grupos? Esta ação não pode ser desfeita!')) {
      return;
    }

    setIsGenerating(true);
    try {
      await api.generateGroups(category, gender);
      await loadData();
      alert('Grupos gerados com sucesso! ✓');
    } catch (error) {
      alert('Erro ao gerar grupos: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setIsGenerating(false);
    }
  };

  const teamsByClub = teams.reduce((acc, team) => {
    if (!acc[team.club.name]) acc[team.club.name] = [];
    acc[team.club.name].push(team);
    return acc;
  }, {});

  const groupsGenerated = groups.length > 0;

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <button
            onClick={() => navigate('/')}
            className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-2 mb-6"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Gerenciar Duplas</h1>
              <p className="text-sm text-gray-500 mt-1">
                Categoria {category} • {gender}
              </p>
            </div>

            {!groupsGenerated && (
              <button
                onClick={() => setShowForm(!showForm)}
                className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded text-sm hover:bg-gray-800 transition"
              >
                <Plus className="w-4 h-4" /> Nova Dupla
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-12">
        {showForm && !groupsGenerated && (
          <div className="border border-gray-200 rounded-lg p-6 mb-8">
            <h3 className="font-semibold text-gray-900 mb-4">Adicionar Dupla</h3>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <input
                type="text"
                placeholder="Jogador 1"
                value={formData.player1}
                onChange={(e) => setFormData({ ...formData, player1: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-gray-900"
                required
              />
              <input
                type="text"
                placeholder="Jogador 2"
                value={formData.player2}
                onChange={(e) => setFormData({ ...formData, player2: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-gray-900"
                required
              />
              <select
                value={formData.clubId}
                onChange={(e) => setFormData({ ...formData, clubId: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-gray-900"
                required
              >
                <option value="">Selecione o clube</option>
                {clubs.map(club => (
                  <option key={club.id} value={club.id}>{club.name}</option>
                ))}
              </select>
              <button
                type="submit"
                className="bg-gray-900 text-white px-6 py-2 rounded text-sm hover:bg-gray-800 transition"
              >
                Adicionar
              </button>
            </form>
          </div>
        )}

        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {teams.length}/{category === 'B' ? 4 : 16} duplas cadastradas
          </p>

          {groupsGenerated && (
            <div className="flex items-center gap-2 text-green-600 text-sm">
              <span className="w-2 h-2 bg-green-600 rounded-full"></span>
              Grupos já foram gerados
            </div>
          )}
        </div>

        {teams.length === 0 ? (
          <div className="text-center py-20 border border-gray-200 rounded-lg">
            <p className="text-gray-500">Nenhuma dupla cadastrada ainda.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(teamsByClub).map(([clubName, clubTeams]) => (
              <div key={clubName} className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-900">{clubName}</h3>
                </div>
                <div className="p-6 space-y-3">
                  {clubTeams.map((team) => (
                    <div key={team.id}>
                      {editingTeam === team.id ? (
                        // Modo de edição
                        <div className="border border-blue-300 rounded-lg p-3 bg-blue-50">
                          <div className="space-y-2 mb-3">
                            <input
                              type="text"
                              value={editForm.player1}
                              onChange={(e) => setEditForm({ ...editForm, player1: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500"
                              placeholder="Jogador 1"
                            />
                            <input
                              type="text"
                              value={editForm.player2}
                              onChange={(e) => setEditForm({ ...editForm, player2: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500"
                              placeholder="Jogador 2"
                            />
                            <select
                              value={editForm.clubId}
                              onChange={(e) => setEditForm({ ...editForm, clubId: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500"
                            >
                              {clubs.map(club => (
                                <option key={club.id} value={club.id}>{club.name}</option>
                              ))}
                            </select>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleUpdate(team.id)}
                              className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white px-3 py-2 rounded text-sm hover:bg-green-700 transition"
                            >
                              <Check className="w-4 h-4" /> Salvar
                            </button>
                            <button
                              onClick={cancelEditing}
                              className="flex items-center justify-center gap-2 border border-gray-300 text-gray-700 px-3 py-2 rounded text-sm hover:bg-gray-50 transition"
                            >
                              <X className="w-4 h-4" /> Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        // Modo de visualização
                        <div className="flex items-center justify-between py-2 group">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {team.player1} / {team.player2}
                            </p>
                            <p className="text-xs text-gray-500">{team.club.name}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => startEditing(team)}
                              className="text-blue-600 hover:text-blue-700 transition opacity-0 group-hover:opacity-100"
                              title="Editar nomes"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            {!groupsGenerated && (
                              <button
                                onClick={() => handleDelete(team.id)}
                                className="text-gray-400 hover:text-red-600 transition"
                                title="Excluir dupla"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Botão de Gerar Grupos */}
        {teams.length === (category === 'B' ? 4 : 16) && !groupsGenerated && (
          <div className="mt-12 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-8 text-center">
            <div className="mb-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
                <Shuffle className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Pronto para Gerar os Grupos!
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                {category === 'B'
                  ? 'As 4 duplas foram cadastradas. Será gerado 1 grupo único com todos contra todos.'
                  : <>Todas as 16 duplas foram cadastradas. O sorteio será aleatório<br />respeitando a regra de 1 dupla por arena em cada grupo.</>
                }
              </p>
            </div>
            
            <button
              onClick={handleGenerateGroups}
              disabled={isGenerating}
              className="inline-flex items-center gap-3 bg-blue-600 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-blue-700 transition transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg"
            >
              {isGenerating ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Gerando...
                </>
              ) : (
                <>
                  <Shuffle className="w-5 h-5" />
                  Gerar Grupos Agora
                </>
              )}
            </button>
            
            <p className="text-xs text-gray-500 mt-4">
              ⚠️ Atenção: Esta ação não pode ser desfeita!
            </p>
          </div>
        )}

        {groupsGenerated && (
          <div className="mt-8 bg-green-50 border border-green-200 rounded-lg p-6 text-center">
            <p className="text-green-800 font-medium mb-2">
              ✓ Grupos gerados com sucesso!
            </p>
            <p className="text-sm text-green-700 mb-3">
              Veja os grupos e resultados na página "Ver Torneio"
            </p>
            <p className="text-xs text-gray-600">
              💡 Dica: Você ainda pode editar os nomes dos jogadores clicando no ícone de lápis
            </p>
          </div>
        )}
      </div>
    </div>
  );
}