import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';

import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Leads from './Leads';
import LeadsFechados from './LeadsFechados';
import LeadsPerdidos from './LeadsPerdidos';
import BuscarLead from './BuscarLead';
import CriarUsuario from './pages/CriarUsuario';
import Usuarios from './pages/Usuarios';
import Ranking from './pages/Ranking';
import CriarLead from './pages/CriarLead'; // Verifique se este arquivo é CriarLead.jsx

// URLs do Google Apps Script (AJUSTE ESSAS URLs SE FOR NECESSÁRIO)
// Lembre-se que se você fez um NOVO DEPLOY do Apps Script, a URL pode ter mudado!
const GOOGLE_SHEETS_BASE_URL = 'https://script.google.com/macros/s/AKfycby8vujvd5ybEpkaZ0kwZecAWOdaL0XJR84oKJBAIR9dVYeTCv7iSdTdHQWBb7YCp349/exec'; // Use a URL base sem o ?v=getLeads

const App = () => {
  const navigate = useNavigate();

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginInput, setLoginInput] = useState('');
  const [senhaInput, setSenhaInput] = useState('');
  const [usuarioLogado, setUsuarioLogado] = useState(null);
  const [leadsFechados, setLeadsFechados] = useState([]);
  const [backgroundLoaded, setBackgroundLoaded] = useState(false);

  useEffect(() => {
    const img = new Image();
    img.src = '/background.png';
    img.onload = () => setBackgroundLoaded(true);
  }, []);

  // INÍCIO - sincronização leads via Google Sheets
  const [leads, setLeads] = useState([]);
  const [leadSelecionado, setLeadSelecionado] = useState(null);

  const fetchLeadsFromSheet = async () => {
    try {
      // Usando a URL base com o parâmetro GET para buscar leads
      const response = await fetch(`${GOOGLE_SHEETS_BASE_URL}?v=getLeads`);
      const data = await response.json();

      console.log("Leads brutos do GS:", data);

      if (Array.isArray(data)) {
        const sortedData = data.sort((a, b) => {
          const dateA = new Date(a.editado);
          const dateB = new Date(b.editado);
          return dateB - dateA; // decrescente (mais recente no topo)
        });

        const formattedLeads = sortedData.map((item, index) => ({
          id: item.id || crypto.randomUUID(), // Usar crypto.randomUUID() se não houver id, garantindo um ID único
          name: item.name || item.Name || '',
          vehicleModel: item.vehiclemodel || item.vehicleModel || '', // Consistência na chave
          vehicleYearModel: item.vehicleyearmodel || item.vehicleYearModel || '', // Consistência na chave
          city: item.city || '',
          phone: item.phone || item.Telefone || '',
          insuranceType: item.insurancetype || item.insuranceType || '', // Consistência na chave
          status: item.status || 'Novo', // 'Selecione o status' é melhor para UX, mas 'Novo' para consistência
          confirmado: item.confirmado === 'true' || item.confirmado === true,
          insurer: item.insurer || '',
          insurerConfirmed: item.insurerConfirmed === 'true' || item.insurerConfirmed === true,
          usuarioId: item.usuarioId ? String(item.usuarioId) : null, // Garantir string
          premioLiquido: item.premioLiquido || '',
          comissao: item.comissao || '',
          parcelamento: item.parcelamento || '',
          createdAt: item.createdAt || item.Data || new Date().toISOString(), // Consistência na chave
          responsavel: item.responsavel || '',
          editado: item.editado || ''
        }));

        console.log("Leads formatados:", formattedLeads);

        if (!leadSelecionado) {
          setLeads(formattedLeads);
        }
      } else {
        if (!leadSelecionado) {
          setLeads([]);
        }
      }
    } catch (error) {
      console.error('Erro ao buscar leads:', error);
      if (!leadSelecionado) {
        setLeads([]);
      }
    }
  };

  useEffect(() => {
    fetchLeadsFromSheet();

    const interval = setInterval(() => {
      fetchLeadsFromSheet();
    }, 60000);

    return () => clearInterval(interval);
  }, [leadSelecionado]);
  // FIM - sincronização leads

  const fetchLeadsFechadosFromSheet = async () => {
    try {
      // Usando a URL base com o parâmetro GET para buscar leads fechados
      const response = await fetch(`${GOOGLE_SHEETS_BASE_URL}?v=pegar_clientes_fechados`);
      const data = await response.json();
      console.log("Leads Fechados brutos do GS:", data);
      setLeadsFechados(data);
    } catch (error) {
      console.error('Erro ao buscar leads fechados:', error);
      setLeadsFechados([]);
    }
  };

  useEffect(() => {
    fetchLeadsFechadosFromSheet();

    const interval = setInterval(() => {
      fetchLeadsFechadosFromSheet();
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const [usuarios, setUsuarios] = useState([]);

  useEffect(() => {
    const fetchUsuariosFromSheet = async () => {
      try {
        // Usando a URL base com o parâmetro GET para buscar usuários
        const response = await fetch(`${GOOGLE_SHEETS_BASE_URL}?v=pegar_usuario`);
        const data = await response.json();
        console.log("Usuários brutos do GS:", data);

        if (Array.isArray(data)) {
          const formattedUsuarios = data.map((item) => ({
            id: item.ID || crypto.randomUUID(), // Assegura que o ID seja sempre uma string única
            usuario: item.Usuario || '',
            nome: item.Nome || '',
            email: item.Email || '',
            senha: item.Senha || '',
            status: item.Status || 'Ativo',
            tipo: item.Tipo || 'Usuario',
          }));
          console.log("Usuários formatados:", formattedUsuarios);
          setUsuarios(formattedUsuarios);
        } else {
          setUsuarios([]);
        }
      } catch (error) {
        console.error('Erro ao buscar usuários do Google Sheets:', error);
        setUsuarios([]);
      }
    };

    fetchUsuariosFromSheet();

    const interval = setInterval(() => {
      fetchUsuariosFromSheet();
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  // const [ultimoFechadoId, setUltimoFechadoId] = useState(null); // Essa variável parece não ser usada efetivamente

  const adicionarUsuario = async (novoUsuario) => {
    try {
      const response = await fetch(`${GOOGLE_SHEETS_BASE_URL}?action=criar_usuario`, {
        method: 'POST',
        mode: 'no-cors', // Mantido conforme sua solicitação
        body: JSON.stringify({
          action: 'criar_usuario',
          usuario: novoUsuario.usuario,
          nome: novoUsuario.nome,
          email: novoUsuario.email,
          senha: novoUsuario.senha,
          status: novoUsuario.status,
          tipo: novoUsuario.tipo
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      // Com no-cors, você não terá acesso à resposta real.
      // Apenas assume sucesso ou verifica logs do Apps Script para falhas.
      console.log('Requisição para criar usuário enviada (modo no-cors).');
      fetchUsuariosFromSheet(); // Atualiza a lista de usuários após a adição
    } catch (error) {
      console.error('Erro ao adicionar usuário:', error);
    }
  };

  // --- NOVA FUNÇÃO ADICIONADA: adicionarNovoLead ---
  const adicionarNovoLead = async (novoLead) => {
    try {
      const response = await fetch(`${GOOGLE_SHEETS_BASE_URL}?action=criar_lead`, {
        method: 'POST',
        mode: 'no-cors', // Mantido conforme sua solicitação
        body: JSON.stringify({
          action: 'criar_lead',
          name: novoLead.name,
          vehicleModel: novoLead.vehicleModel,
          vehicleYearModel: novoLead.vehicleYearModel,
          city: novoLead.city,
          phone: novoLead.phone,
          insuranceType: novoLead.insuranceType,
          createdAt: novoLead.createdAt, // Envia a data de criação
          responsavel: novoLead.responsavel,
          status: novoLead.status,
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      console.log('Requisição para criar lead enviada (modo no-cors).');
      fetchLeadsFromSheet(); // Atualiza a lista de leads após a adição
    } catch (error) {
      console.error('Erro ao adicionar novo lead:', error);
    }
  };
  // --- FIM DA NOVA FUNÇÃO ---

  const atualizarStatusLeadAntigo = (id, novoStatus, phone) => {
    if (novoStatus === 'Fechado') {
      setLeadsFechados((prev) => {
        const atualizados = prev.map((leadsFechados) =>
          leadsFechados.phone === phone ? { ...leadsFechados, Status: novoStatus, confirmado: true } : leadsFechados
        );
        return atualizados;
      });
    }

    setLeads((prev) =>
      prev.map((lead) =>
        lead.phone === phone ? { ...lead, status: novoStatus, confirmado: true } : lead
      )
    );
  };

  const atualizarStatusLead = async (id, novoStatus, phone) => {
    // Atualiza leads principal localmente (otimista)
    setLeads((prev) =>
      prev.map((lead) =>
        lead.phone === phone ? { ...lead, status: novoStatus, confirmado: true } : lead
      )
    );

    // Lógica para leads fechados (mantida)
    if (novoStatus === 'Fechado') {
      setLeadsFechados((prev) => {
        const jaExiste = prev.some((lead) => lead.phone === phone);

        if (jaExiste) {
          const atualizados = prev.map((lead) =>
            lead.phone === phone ? { ...lead, Status: novoStatus, confirmado: true } : lead
          );
          return atualizados;
        } else {
          const leadParaAdicionar = leads.find((lead) => lead.phone === phone);

          if (leadParaAdicionar) {
            const novoLeadFechado = {
              ID: leadParaAdicionar.id || crypto.randomUUID(),
              name: leadParaAdicionar.name,
              vehicleModel: leadParaAdicionar.vehicleModel, // Correção aqui
              vehicleYearModel: leadParaAdicionar.vehicleYearModel, // Correção aqui
              city: leadParaAdicionar.city,
              phone: leadParaAdicionar.phone,
              insurer: leadParaAdicionar.insuranceType || leadParaAdicionar.insurer || "", // Use insurer ou insuranceType
              Data: leadParaAdicionar.createdAt || new Date().toISOString(),
              Responsavel: leadParaAdicionar.responsavel || "",
              Status: "Fechado",
              Seguradora: leadParaAdicionar.Seguradora || "",
              PremioLiquido: leadParaAdicionar.premioLiquido || "",
              Comissao: leadParaAdicionar.comissao || "",
              Parcelamento: leadParaAdicionar.parcelamento || "",
              VigenciaFinal: leadParaAdicionar.VigenciaFinal || "", // Novo campo
              usuario: leadParaAdicionar.usuario || "",
              nome: leadParaAdicionar.nome || "",
              email: leadParaAdicionar.email || "",
              senha: leadParaAdicionar.senha || "",
              status: leadParaAdicionar.status || "Ativo",
              tipo: leadParaAdicionar.tipo || "Usuario",
              "Ativo/Inativo": leadParaAdicionar["Ativo/Inativo"] || "Ativo",
              confirmado: true
            };
            return [...prev, novoLeadFechado];
          }
          console.warn("Lead não encontrado na lista principal para adicionar aos fechados.");
          return prev;
        }
      });
    }

    // Chamada para o Apps Script para atualizar o status
    try {
      await fetch(`${GOOGLE_SHEETS_BASE_URL}?action=alterar_status`, {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify({
          action: 'alterar_status',
          id: id,
          status: novoStatus,
          phone: phone // Passa o phone para o script localizar o lead
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      console.log('Requisição de atualização de status enviada (modo no-cors).');
      // Opcional: fetchLeadsFromSheet() aqui para re-sincronizar após a alteração no GS
    } catch (error) {
      console.error('Erro ao enviar atualização de status do lead:', error);
    }
  };

  const atualizarSeguradoraLead = (id, seguradora) => {
    setLeads((prev) =>
      prev.map((lead) =>
        lead.id === id
          ? limparCamposLead({ ...lead, insurer: seguradora })
          : lead
      )
    );
  };

  const limparCamposLead = (lead) => ({
    ...lead,
    premioLiquido: "",
    comissao: "",
    parcelamento: "",
  });

  const confirmarSeguradoraLead = async (id, premio, seguradora, comissao, parcelamento, vigenciaFinal) => {
    const lead = leadsFechados.find((l) => l.ID === id); // Usar 'l' para evitar conflito com 'lead' do parâmetro
    if (!lead) return;

    // Atualiza o objeto 'lead' para enviar
    lead.Seguradora = seguradora;
    lead.PremioLiquido = premio;
    lead.Comissao = comissao;
    lead.Parcelamento = parcelamento;
    lead.VigenciaFinal = vigenciaFinal; // Adiciona vigenciaFinal

    // Atualiza localmente os leadsFechados (otimista)
    setLeadsFechados((prev) => {
      const atualizados = prev.map((l) =>
        l.ID === id ? { ...l, Seguradora: seguradora, PremioLiquido: premio, Comissao: comissao, Parcelamento: parcelamento, VigenciaFinal: vigenciaFinal, insurerConfirmed: true } : l
      );
      return atualizados;
    });

    try {
      // Faz a chamada para o Apps Script via fetch POST
      await fetch(`${GOOGLE_SHEETS_BASE_URL}?action=alterar_seguradora`, {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify({
          action: 'alterar_seguradora',
          lead: { // Envia apenas os campos relevantes para o script
            ID: lead.ID,
            Seguradora: seguradora,
            PremioLiquido: premio,
            Comissao: comissao,
            Parcelamento: parcelamento,
            VigenciaFinal: vigenciaFinal // Inclui aqui
          }
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      console.log('Requisição para confirmar seguradora enviada (modo no-cors).');
      fetchLeadsFechadosFromSheet(); // Atualiza a lista de leads fechados após a alteração
    } catch (error) {
      console.error('Erro ao enviar lead fechado para atualização:', error);
    }
  };

  const atualizarDetalhesLeadFechado = (id, campo, valor) => {
    setLeads((prev) =>
      prev.map((lead) =>
        lead.id === id ? { ...lead, [campo]: valor } : lead
      )
    );
  };

  const transferirLead = async (leadId, responsavelId) => {
    let responsavelNome = '';
    if (responsavelId === null || responsavelId === '') {
      responsavelNome = ''; // Define como vazio para desatribuir
    } else {
      let usuario = usuarios.find((u) => String(u.id) === String(responsavelId));
      if (!usuario) {
        console.warn('Usuário responsável não encontrado:', responsavelId);
        return;
      }
      responsavelNome = usuario.nome;
    }

    // Atualização otimista no estado local
    setLeads((prev) =>
      prev.map((lead) =>
        String(lead.id) === String(leadId) ? { ...lead, responsavel: responsavelNome } : lead
      )
    );

    // Chamada para o Apps Script para transferir o lead
    try {
      await fetch(`${GOOGLE_SHEETS_BASE_URL}?action=alterar_atribuido`, {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify({
          action: 'alterar_atribuido',
          id: leadId,
          usuarioId: responsavelId // Envia o ID do usuário para o Apps Script
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      console.log('Requisição de transferência de lead enviada (modo no-cors).');
      // Opcional: fetchLeadsFromSheet() para re-sincronizar após a alteração no GS
    } catch (error) {
      console.error('Erro ao transferir lead:', error);
    }
  };


  const atualizarStatusUsuario = async (id, novoStatus = null, novoTipo = null) => {
    const usuario = usuarios.find((u) => String(u.id) === String(id));
    if (!usuario) return;

    // Cria um objeto com as alterações para enviar
    const dadosParaEnviar = {
      id: usuario.id,
      usuario: usuario.usuario,
      nome: usuario.nome,
      email: usuario.email,
      senha: usuario.senha,
      status: novoStatus !== null ? novoStatus : usuario.status,
      tipo: novoTipo !== null ? (novoTipo === 'Usuário Comum' ? 'Usuario' : novoTipo) : usuario.tipo // Normaliza 'Usuário Comum' para 'Usuario'
    };

    try {
      await fetch(`${GOOGLE_SHEETS_BASE_URL}?action=alterar_usuario`, {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify({
          action: 'alterar_usuario',
          usuario: dadosParaEnviar
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      console.log('Requisição de atualização de usuário enviada (modo no-cors).');
      fetchUsuariosFromSheet(); // Re-fetch para garantir que o estado local esteja sincronizado
    } catch (error) {
      console.error('Erro ao enviar atualização do usuário:', error);
    }
  };


  const onAbrirLead = (lead) => {
    setLeadSelecionado(lead);

    let path = '/leads';
    if (lead.status === 'Fechado') path = '/leads-fechados';
    else if (lead.status === 'Perdido') path = '/leads-perdidos';

    navigate(path);
  };

  const handleLogin = () => {
    const usuarioEncontrado = usuarios.find(
      (u) => u.usuario === loginInput && u.senha === senhaInput && u.status === 'Ativo'
    );

    if (usuarioEncontrado) {
      setIsAuthenticated(true);
      setUsuarioLogado(usuarioEncontrado);
    } else {
      alert('Login ou senha inválidos ou usuário inativo.');
    }
  };

  if (!isAuthenticated) {
    return (
      <div
        className={`flex items-center justify-center min-h-screen bg-cover bg-center transition-opacity duration-1000 ${
          backgroundLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          backgroundImage: `url('/background.png')`,
        }}
      >
        <div className="bg-blue-900 bg-opacity-60 text-white p-10 rounded-2xl shadow-2xl w-full max-w-sm">
          <div className="flex flex-col items-center mb-6">
            <div className="w-12 h-12 mb-2 flex items-center justify-center text-4xl text-yellow-400">
              👑
            </div>
            <h1 className="text-xl font-semibold">GRUPO</h1>
            <h2 className="text-2xl font-bold text-white">PRIMME SEGUROS</h2>
            <p className="text-sm text-white">CORRETORA DE SEGUROS</p>
          </div>

          <input
            type="text"
            placeholder="Usuário"
            value={loginInput}
            onChange={(e) => setLoginInput(e.target.value)}
            className="w-full mb-4 px-4 py-2 rounded text-black"
          />
          <input
            type="password"
            placeholder="Senha"
            value={senhaInput}
            onChange={(e) => setSenhaInput(e.target.value)}
            className="w-full mb-2 px-4 py-2 rounded text-black"
          />
          <div className="text-right text-sm mb-4">
            <a href="#" className="text-white underline">
              Esqueci minha senha
            </a>
          </div>
          <button
            onClick={handleLogin}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            ENTRAR
          </button>
        </div>
      </div>
    );
  }

  const isAdmin = usuarioLogado?.tipo === 'Admin';

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <Sidebar isAdmin={isAdmin} nomeUsuario={usuarioLogado} />

      <main style={{ flex: 1, overflow: 'auto' }}>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route
            path="/dashboard"
            element={
              <Dashboard
                leadsClosed={
                  isAdmin
                    ? leadsFechados
                    : leadsFechados.filter((lead) => lead.Responsavel === usuarioLogado.nome)
                }
                leads={
                  isAdmin
                    ? leads
                    : leads.filter((lead) => lead.responsavel === usuarioLogado.nome)
                }
                usuarioLogado={usuarioLogado}
              />
            }
          />
          <Route
            path="/leads"
            element={
              <Leads
                leads={isAdmin ? leads : leads.filter((lead) => lead.responsavel === usuarioLogado.nome)}
                usuarios={usuarios}
                onUpdateStatus={atualizarStatusLead}
                fetchLeadsFromSheet={fetchLeadsFromSheet}
                transferirLead={transferirLead}
                usuarioLogado={usuarioLogado}
              />
            }
          />
          <Route
            path="/leads-fechados"
            element={
              <LeadsFechados
                leads={isAdmin ? leadsFechados : leadsFechados.filter((lead) => lead.Responsavel === usuarioLogado.nome)}
                usuarios={usuarios}
                onUpdateInsurer={atualizarSeguradoraLead}
                onConfirmInsurer={confirmarSeguradoraLead}
                onUpdateDetalhes={atualizarDetalhesLeadFechado}
                fetchLeadsFechadosFromSheet={fetchLeadsFechadosFromSheet}
                isAdmin={isAdmin}
                // ultimoFechadoId={ultimoFechadoId} // Não parece ser usado, pode ser removido se não houver uso futuro.
                onAbrirLead={onAbrirLead}
                leadSelecionado={leadSelecionado}
              />
            }
          />
          <Route
            path="/leads-perdidos"
            element={
              <LeadsPerdidos
                leads={isAdmin ? leads : leads.filter((lead) => lead.responsavel === usuarioLogado.nome)}
                usuarios={usuarios}
                fetchLeadsFromSheet={fetchLeadsFromSheet}
                onAbrirLead={onAbrirLead}
                isAdmin={isAdmin}
                leadSelecionado={leadSelecionado}
              />
            }
          />
          <Route path="/buscar-lead" element={<BuscarLead
            leads={leads}
            fetchLeadsFromSheet={fetchLeadsFromSheet}
            fetchLeadsFechadosFromSheet={fetchLeadsFechadosFromSheet}
          />} />
          {/* AQUI ESTÁ A CHAMADA CORRIGIDA: AGORA 'adicionarNovoLead' EXISTE */}
          <Route
            path="/criar-lead"
            element={<CriarLead adicionarLead={adicionarNovoLead} />}
          />
          {isAdmin && (
            <>
              <Route path="/criar-usuario" element={<CriarUsuario adicionarUsuario={adicionarUsuario} />} />
              <Route
                path="/usuarios"
                element={
                  <Usuarios
                    leads={isAdmin ? leads : leads.filter((lead) => lead.responsavel === usuarioLogado.nome)}
                    usuarios={usuarios}
                    fetchLeadsFromSheet={fetchLeadsFromSheet}
                    fetchLeadsFechadosFromSheet={fetchLeadsFechadosFromSheet}
                    atualizarStatusUsuario={atualizarStatusUsuario}
                  />
                }
              />
            </>
          )}
          <Route path="/ranking" element={<Ranking
            usuarios={usuarios}
            fetchLeadsFromSheet={fetchLeadsFromSheet}
            fetchLeadsFechadosFromSheet={fetchLeadsFechadosFromSheet}
            leads={leads} />} />
          <Route path="*" element={<h1 style={{ padding: 20 }}>Página não encontrada</h1>} />
        </Routes>
      </main>
    </div>
  );
};

export default App;
