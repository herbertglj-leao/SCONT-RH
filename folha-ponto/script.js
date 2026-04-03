/**
 * SCONT - Sistema de Gestão de Ponto e Folha de Pagamento
 * Arquivo: script.js (VERSÃO FINAL v9.1 - CORRIGIDA)
 * Descrição: Autenticação, persistência, cálculos e auditoria
 * Data: 04/2026
 */

// ============================================
// AGUARDAR SUPABASE E XLSX CARREGAREM
// ============================================
console.log('⏳ Aguardando bibliotecas carregarem...');

let tentativas = 0;
const aguardarBibliotecas = setInterval(() => {
    tentativas++;
    
    if (typeof supabase !== 'undefined' && typeof XLSX !== 'undefined') {
        console.log('✅ Todas as bibliotecas carregadas com sucesso');
        clearInterval(aguardarBibliotecas);
        inicializarSistema();
    } else if (tentativas > 100) {
        console.error('❌ Timeout ao carregar bibliotecas');
        clearInterval(aguardarBibliotecas);
        alert('Erro ao carregar o sistema. Recarregue a página.');
    }
}, 50);

// ============================================
// INICIALIZAR SISTEMA
// ============================================
async function inicializarSistema() {
    console.log('🚀 Inicializando sistema...');
    
    // ============================================
    // CONFIGURAÇÃO SUPABASE
    // ============================================
    const SUPABASE_URL = 'https://udnikmolgryzczalcbbz.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkbmlrbW9sZ3J5emN6YWxjYmJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxNDQzNTUsImV4cCI6MjA5MDcyMDM1NX0.9vCwDkmxhrLAc-UxKpUxiVHF0BBh8OIdGZPKpTWu-lI';

    window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    
    console.log('✅ Supabase inicializado');
    
    // ============================================
    // ESTADO GLOBAL
    // ============================================
    window.state = {
        usuarioAutenticado: null,
        usuarioEmail: null,
        usuarioId: null,
        competencia: '',
        codigoEmpresa: '',
        jornada: '08:00',
        feriados: [],
        ruleExtra100Optional: false,
        folhas: [],
        abaSelecionada: 0,
        resultados: null
    };

    window.persistenceState = {
        isLoading: false,
        lastSaveTime: null,
        saveInProgress: false,
        autoSaveInterval: null
    };

    window.empregadosDisponiveis = [];

    // ============================================
    // VERIFICAR AUTENTICAÇÃO
    // ============================================
    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        
        if (user) {
            state.usuarioAutenticado = true;
            state.usuarioId = user.id;
            state.usuarioEmail = user.email;
            console.log('✅ Usuário autenticado:', user.email);
            
            inicializarComSupabase();
            inicializarEventos();
            atualizarHeaderAcoes();
            mostrarTela('selectionScreen');
        } else {
            console.log('⚠️ Usuário não autenticado');
            inicializarEventos();
            mostrarTela('loginScreen');
        }
    } catch (erro) {
        console.error('❌ Erro ao verificar autenticação:', erro);
        inicializarEventos();
        mostrarTela('loginScreen');
    }
    
    // ============================================
    // MONITORAR MUDANÇAS DE AUTENTICAÇÃO
    // ============================================
    supabaseClient.auth.onAuthStateChange((event, session) => {
        console.log('🔐 Evento de autenticação:', event);
        
        if (event === 'SIGNED_IN' && session) {
            state.usuarioAutenticado = true;
            state.usuarioId = session.user.id;
            state.usuarioEmail = session.user.email;
            
            inicializarComSupabase();
            atualizarHeaderAcoes();
            mostrarTela('selectionScreen');
        } else if (event === 'SIGNED_OUT') {
            state.usuarioAutenticado = false;
            state.usuarioId = null;
            state.usuarioEmail = null;
            pararAutoSave();
            
            const headerActions = document.getElementById('headerActions');
            if (headerActions) {
                headerActions.innerHTML = '';
            }
            
            mostrarTela('loginScreen');
        }
    });
}

// ============================================
// AUTENTICAÇÃO - LOGIN
// ============================================
async function handleLogin(e) {
    e.preventDefault();
    console.log('🔄 Função handleLogin chamada');
    
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    if (!email || !password) {
        console.error('❌ Email ou senha vazios');
        mostrarMensagem('Erro', 'Preencha email e senha.');
        return;
    }
    
    try {
        console.log('🔄 Tentando login com:', email);
        
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) {
            console.error('❌ Erro de login:', error.message);
            mostrarMensagem('Erro', error.message);
            return;
        }
        
        console.log('✅ Login bem-sucedido!');
        document.getElementById('loginForm').reset();
        
    } catch (erro) {
        console.error('❌ Erro inesperado:', erro);
        mostrarMensagem('Erro', 'Erro ao fazer login. Tente novamente.');
    }
}

// ============================================
// AUTENTICAÇÃO - REGISTRO
// ============================================
async function handleRegistro(e) {
    e.preventDefault();
    
    const nome = document.getElementById('registroNome').value.trim();
    const email = document.getElementById('registroEmail').value.trim();
    const password = document.getElementById('registroPassword').value;
    const passwordConfirm = document.getElementById('registroPasswordConfirm').value;
    
    if (!nome || !email || !password || !passwordConfirm) {
        mostrarMensagem('Erro', 'Preencha todos os campos.');
        return;
    }
    
    if (password !== passwordConfirm) {
        mostrarMensagem('Erro', 'As senhas não conferem.');
        return;
    }
    
    if (password.length < 6) {
        mostrarMensagem('Erro', 'Senha deve ter no mínimo 6 caracteres.');
        return;
    }
    
    try {
        console.log('🔄 Criando conta...');
        
        const { data, error } = await supabaseClient.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    nome: nome
                }
            }
        });
        
        if (error) {
            console.error('❌ Erro:', error.message);
            mostrarMensagem('Erro', error.message);
            return;
        }
        
        console.log('✅ Conta criada com sucesso!');
        mostrarMensagem('Sucesso', 'Conta criada! Você pode fazer login agora.');
        
        document.getElementById('registroForm').reset();
        
        setTimeout(() => {
            mostrarTelaLogin();
        }, 2000);
        
    } catch (erro) {
        console.error('❌ Erro inesperado:', erro);
        mostrarMensagem('Erro', 'Erro ao criar conta. Tente novamente.');
    }
}

// ============================================
// AUTENTICAÇÃO - LOGOUT
// ============================================
async function fazerLogout(e) {
    if (e) e.preventDefault();
    
    mostrarConfirmacao(
        'Sair',
        'Deseja sair do sistema?',
        async () => {
            try {
                console.log('🔄 Iniciando logout...');
                
                const { error } = await supabaseClient.auth.signOut();
                
                if (error) {
                    console.error('❌ Erro ao sair:', error.message);
                    mostrarMensagem('Erro', 'Erro ao fazer logout: ' + error.message);
                    return;
                }
                
                console.log('✅ Logout realizado com sucesso');
                
                state.usuarioAutenticado = false;
                state.usuarioId = null;
                state.usuarioEmail = null;
                state.folhas = [];
                state.abaSelecionada = 0;
                state.competencia = '';
                state.codigoEmpresa = '';
                
                pararAutoSave();
                
                const headerActions = document.getElementById('headerActions');
                if (headerActions) {
                    headerActions.innerHTML = '';
                }
                
                const selectionForm = document.getElementById('selectionForm');
                if (selectionForm) {
                    selectionForm.reset();
                }
                
                mostrarTela('loginScreen');
                
                const loginForm = document.getElementById('loginForm');
                if (loginForm) {
                    loginForm.reset();
                }
                
                console.log('✅ Tela de login exibida');
                
            } catch (erro) {
                console.error('❌ Erro inesperado:', erro);
                mostrarMensagem('Erro', 'Erro ao fazer logout. Tente novamente.');
            }
        }
    );
}

// ============================================
// NAVEGAÇÃO - TELAS DE LOGIN
// ============================================
function mostrarTelaLogin(e) {
    if (e) e.preventDefault();
    mostrarTela('loginScreen');
}

function mostrarTelaRegistro(e) {
    if (e) e.preventDefault();
    mostrarTela('registroScreen');
}

// ============================================
// ATUALIZAR HEADER COM DADOS DO USUÁRIO
// ============================================
function atualizarHeaderAcoes() {
    const headerActions = document.getElementById('headerActions');
    if (!headerActions) return;
    
    if (state.usuarioAutenticado && state.usuarioEmail) {
        headerActions.innerHTML = `
            <span style="color: white; font-size: 13px; margin-right: 15px;">
                👤 ${state.usuarioEmail}
            </span>
            <button type="button" class="btn btn-small" onclick="fazerLogout()" style="background: rgba(255,255,255,0.2); color: white; border: 1px solid rgba(255,255,255,0.3);">
                🚪 Sair
            </button>
        `;
    } else {
        headerActions.innerHTML = '';
    }
}

// ============================================
// PERSISTÊNCIA COM SUPABASE
// ============================================

async function inicializarComSupabase() {
    console.log('🔄 Inicializando persistência com Supabase...');
    
    try {
        carregarEmpresasDropbox();
        
        const codigoEmpresaSelect = document.getElementById('codigoEmpresa');
        if (codigoEmpresaSelect) {
            codigoEmpresaSelect.addEventListener('change', (e) => {
                carregarEmpregadosDropbox(e.target.value);
            });
        }
        
        const { data, error } = await supabaseClient
            .from('saves')
            .select('count', { count: 'exact', head: true });
        
        if (error) {
            console.warn('⚠️ Supabase indisponível.');
            return;
        }
        
        console.log('✅ Supabase conectado com sucesso');
        iniciarAutoSave();
        
    } catch (erro) {
        console.error('❌ Erro ao inicializar Supabase:', erro);
    }
}

// ============================================
// CARREGAR EMPRESAS E EMPREGADOS
// ============================================

async function carregarEmpresasDropbox() {
    try {
        const { data, error } = await supabaseClient
            .from('empresas')
            .select('codigo_empresa, nome_empresa')
            .order('nome_empresa', { ascending: true });
        
        if (error) throw error;
        
        const select = document.getElementById('codigoEmpresa');
        if (!select) return;
        
        select.innerHTML = '<option value="">Selecione uma empresa...</option>';
        
        (data || []).forEach(empresa => {
            const option = document.createElement('option');
            option.value = empresa.codigo_empresa;
            option.textContent = `${empresa.codigo_empresa} - ${empresa.nome_empresa}`;
            select.appendChild(option);
        });
        
        console.log('✅ Empresas carregadas:', data?.length || 0);
        
    } catch (erro) {
        console.error('❌ Erro ao carregar empresas:', erro);
    }
}

async function carregarEmpregadosDropbox(codigoEmpresa) {
    try {
        if (!codigoEmpresa) {
            const select = document.getElementById('nomeTrabalhador');
            if (select) {
                select.innerHTML = '<option value="">Selecione uma empresa primeiro</option>';
            }
            return;
        }
        
        const { data, error } = await supabaseClient
            .from('empregados')
            .select('codigo_empregado, nome_empregado')
            .eq('codigo_empresa', codigoEmpresa)
            .order('nome_empregado', { ascending: true });
        
        if (error) throw error;
        
        const select = document.getElementById('nomeTrabalhador');
        if (!select) return;
        
        select.innerHTML = '<option value="">Selecione um empregado...</option>';
        
        (data || []).forEach(empregado => {
            const option = document.createElement('option');
            option.value = empregado.nome_empregado;
            option.textContent = `${empregado.codigo_empregado} - ${empregado.nome_empregado}`;
            select.appendChild(option);
        });
        
        console.log('✅ Empregados carregados:', data?.length || 0);
        
    } catch (erro) {
        console.error('❌ Erro ao carregar empregados:', erro);
    }
}

async function carregarEmpregadosDisponiveisParaTela() {
    try {
        if (!state.codigoEmpresa) {
            window.empregadosDisponiveis = [];
            return;
        }
        
        const { data, error } = await supabaseClient
            .from('empregados')
            .select('codigo_empregado, nome_empregado')
            .eq('codigo_empresa', state.codigoEmpresa)
            .order('nome_empregado', { ascending: true });
        
        if (error) throw error;
        
        window.empregadosDisponiveis = (data || []).map(emp => ({
            codigo: emp.codigo_empregado,
            nome: emp.nome_empregado
        }));
        
        console.log('✅ Empregados disponíveis carregados:', window.empregadosDisponiveis.length);
        
    } catch (erro) {
        console.error('❌ Erro ao carregar empregados disponíveis:', erro);
        window.empregadosDisponiveis = [];
    }
}

async function salvarFolhaNoSupabase() {
    if (persistenceState.saveInProgress) {
        console.log('⏳ Salvamento já em andamento...');
        return;
    }
    
    if (!state.usuarioAutenticado || !state.competencia || !state.codigoEmpresa || state.folhas.length === 0) {
        return;
    }
    
    persistenceState.saveInProgress = true;
    
    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        const nomeUsuario = user?.user_metadata?.nome || user?.email || 'Sistema';
        
        for (const folha of state.folhas) {
            if (!folha.nomeTrabalhador) continue;
            
            const saveRecord = {
                usuario_id: state.usuarioId,
                empresa_codigo: state.codigoEmpresa,
                competencia: state.competencia,
                nome_trabalhador: folha.nomeTrabalhador,
                folha_id: folha.id.toString(),
                dados_json: JSON.stringify(folha.dados),
                feriados_json: JSON.stringify(state.feriados),
                jornada: state.jornada,
                rule_extra_100_opcional: state.ruleExtra100Optional,
                data_atualizacao: new Date().toISOString(),
                status: 'em_preenchimento',
                criado_por: state.usuarioId,
                atualizado_por: state.usuarioId,
                nome_usuario: nomeUsuario
            };
            
            try {
                const { data: existente } = await supabaseClient
                    .from('saves')
                    .select('id')
                    .eq('usuario_id', state.usuarioId)
                    .eq('empresa_codigo', state.codigoEmpresa)
                    .eq('competencia', state.competencia)
                    .eq('folha_id', folha.id.toString())
                    .single();
                
                if (existente) {
                    const { error } = await supabaseClient
                        .from('saves')
                        .update(saveRecord)
                        .eq('id', existente.id);
                    
                    if (error) throw error;
                    console.log('✏️ Folha atualizada:', folha.nomeTrabalhador);
                } else {
                    const { error } = await supabaseClient
                        .from('saves')
                        .insert([saveRecord]);
                    
                    if (error) throw error;
                    console.log('💾 Folha salva:', folha.nomeTrabalhador);
                }
            } catch (erro) {
                console.warn('⚠️ Erro ao salvar no Supabase:', erro);
            }
        }
        
        persistenceState.lastSaveTime = new Date();
        console.log('✅ Dados salvos com sucesso');
        
    } catch (erro) {
        console.error('❌ Erro ao salvar:', erro);
    } finally {
        persistenceState.saveInProgress = false;
    }
}

function iniciarAutoSave() {
    if (persistenceState.autoSaveInterval) {
        clearInterval(persistenceState.autoSaveInterval);
    }
    
    persistenceState.autoSaveInterval = setInterval(() => {
        salvarFolhaNoSupabase();
    }, 30000);
    
    console.log('🔄 Auto-save ativado (a cada 30s)');
}

function pararAutoSave() {
    if (persistenceState.autoSaveInterval) {
        clearInterval(persistenceState.autoSaveInterval);
        persistenceState.autoSaveInterval = null;
    }
}

// ============================================
// CARREGAMENTO DE PREENCHIMENTOS ANTERIORES
// ============================================

async function carregarPreenchimentosAnteriores() {
    try {
        const competencia = document.getElementById('competencia').value.trim();
        const codigoEmpresa = document.getElementById('codigoEmpresa').value.trim();
        
        if (!validarCompetencia(competencia) || !codigoEmpresa) {
            mostrarMensagem('Erro', 'Preencha competência e código da empresa.');
            return;
        }
        
        console.log('🔄 Buscando preenchimentos anteriores...');
        console.log('Empresa:', codigoEmpresa);
        console.log('Competência:', competencia);
        
        const { data: registros, error } = await supabaseClient
            .from('saves')
            .select('*')
            .eq('empresa_codigo', codigoEmpresa)
            .eq('competencia', competencia)
            .eq('status', 'em_preenchimento')
            .order('data_atualizacao', { ascending: false });
        
        if (error) {
            console.error('❌ Erro ao buscar:', error);
            throw error;
        }
        
        console.log('📋 Registros encontrados (total):', registros?.length || 0);
        
        if (!registros || registros.length === 0) {
            console.log('ℹ️ Nenhum preenchimento anterior encontrado.');
            iniciarNovoPreenchimento(competencia, codigoEmpresa);
            return;
        }
        
        const ultimasVersoes = filtrarUltimasVersoes(registros);
        
        console.log('📋 Últimas versões encontradas:', ultimasVersoes.length);
        
        if (ultimasVersoes.length === 0) {
            console.log('ℹ️ Nenhuma versão válida encontrada.');
            iniciarNovoPreenchimento(competencia, codigoEmpresa);
            return;
        }
        
        const agrupado = agruparPreenchimentos(ultimasVersoes);
        
        console.log('📊 Grupos encontrados:', agrupado.length);
        
        mostrarModalPreenchimentosAnterioresAgrupado(agrupado, competencia, codigoEmpresa, ultimasVersoes);
        
    } catch (erro) {
        console.error('❌ Erro ao carregar preenchimentos:', erro);
        mostrarMensagem('Erro', 'Erro ao carregar preenchimentos anteriores.');
    }
}

function filtrarUltimasVersoes(registros) {
    const mapa = {};
    
    const ordenados = registros.sort((a, b) => {
        return new Date(b.data_atualizacao) - new Date(a.data_atualizacao);
    });
    
    ordenados.forEach(registro => {
        const chaveEmpregado = `${registro.nome_trabalhador}`;
        
        if (!mapa[chaveEmpregado]) {
            mapa[chaveEmpregado] = registro;
            console.log(`✅ Última versão de ${registro.nome_trabalhador}: ${new Date(registro.data_atualizacao).toLocaleString('pt-BR')}`);
        } else {
            console.log(`⏭️ Ignorando versão anterior de ${registro.nome_trabalhador}`);
        }
    });
    
    return Object.values(mapa);
}

function agruparPreenchimentos(registros) {
    const agrupado = {};
    
    registros.forEach(registro => {
        const dataFormatada = new Date(registro.data_atualizacao).toLocaleString('pt-BR');
        
        const nomeAutor = registro.nome_usuario || registro.atualizado_por || 'Sistema';
        const chave = `${nomeAutor}_${dataFormatada}`;
        
        if (!agrupado[chave]) {
            agrupado[chave] = {
                usuarioId: registro.atualizado_por,
                nomeUsuario: nomeAutor,
                dataAtualizacao: registro.data_atualizacao,
                dataFormatada: dataFormatada,
                empregados: []
            };
        }
        
        agrupado[chave].empregados.push(registro);
    });
    
    return Object.values(agrupado);
}

function mostrarModalPreenchimentosAnterioresAgrupado(agrupados, competencia, codigoEmpresa, todosRegistros) {
    const modal = document.createElement('div');
    modal.id = 'preenchimentosAnterioresModal';
    modal.className = 'modal active';
    
    const totalFolhas = todosRegistros.length;
    
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>📋 Preenchimentos Anteriores</h3>
                <button type="button" class="modal-close" onclick="fecharModalPreenchimentos()">×</button>
            </div>
            <div class="modal-body">
                <p>Preenchimentos encontrados para <strong>${codigoEmpresa}</strong> - <strong>${competencia}</strong>:</p>
                <p style="font-size: 12px; color: #666; margin-bottom: 15px;">
                    ℹ️ Mostrando apenas a última versão de cada empregado
                </p>
                <div id="preenchimentosList" class="registros-list"></div>
                
                <div class="modal-buttons-container">
                    <button type="button" class="btn btn-primary btn-full" onclick="carregarTodosPreenchimentos('${codigoEmpresa}', '${competencia}')">
                        ▶️ Carregar Preenchimento
                    </button>
                    <button type="button" class="btn btn-secondary btn-full" onclick="iniciarNovoPreenchimento('${competencia}', '${codigoEmpresa}')">
                        ➕ Novo Preenchimento
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    const lista = document.getElementById('preenchimentosList');
    
    agrupados.forEach((grupo, index) => {
        const item = document.createElement('div');
        item.className = 'registro-item';
        
        const empregadosLista = grupo.empregados
            .map(e => e.nome_trabalhador)
            .join(', ');
        
        const totalFolhasGrupo = grupo.empregados.length;
        
        item.innerHTML = `
            <div class="registro-info">
                <h4>📁 Folhas: ${empregadosLista}</h4>
                <p>👤 Autor da Última Modificação: <strong>${grupo.nomeUsuario}</strong></p>
                <p>📅 Data: ${grupo.dataFormatada}</p>
                <p>📊 Total de folhas: ${totalFolhasGrupo}</p>
            </div>
        `;
        lista.appendChild(item);
    });
}

function fecharModalPreenchimentos() {
    const modal = document.getElementById('preenchimentosAnterioresModal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => modal.remove(), 300);
    }
}

async function carregarTodosPreenchimentos(codigoEmpresa, competencia) {
    try {
        console.log('🔄 Carregando TODAS as folhas (últimas versões)...');
        console.log('Empresa:', codigoEmpresa);
        console.log('Competência:', competencia);
        
        const { data: registros, error } = await supabaseClient
            .from('saves')
            .select('*')
            .eq('empresa_codigo', codigoEmpresa)
            .eq('competencia', competencia)
            .eq('status', 'em_preenchimento')
            .order('data_atualizacao', { ascending: false });
        
        if (error) {
            console.error('❌ Erro ao buscar folhas:', error);
            throw error;
        }
        
        if (!registros || registros.length === 0) {
            mostrarMensagem('Erro', 'Nenhuma folha encontrada para carregar.');
            return;
        }
        
        const ultimasVersoes = filtrarUltimasVersoes(registros);
        
        console.log('📋 Total de folhas a carregar (últimas versões):', ultimasVersoes.length);
        
        state.folhas = [];
        
        ultimasVersoes.forEach((registro, index) => {
            try {
                const folhaRestaurada = {
                    id: parseInt(registro.folha_id),
                    nomeTrabalhador: registro.nome_trabalhador,
                    dados: JSON.parse(registro.dados_json),
                    autorUltimaMod: registro.nome_usuario || registro.atualizado_por || 'Sistema'
                };
                
                state.folhas.push(folhaRestaurada);
                console.log(`✅ Folha ${index + 1}/${ultimasVersoes.length} carregada: ${registro.nome_trabalhador} (Autor: ${folhaRestaurada.autorUltimaMod})`);
            } catch (erro) {
                console.error(`❌ Erro ao carregar folha ${index + 1}:`, erro);
            }
        });
        
        const primeiroRegistro = ultimasVersoes[0];
        state.competencia = primeiroRegistro.competencia;
        state.codigoEmpresa = primeiroRegistro.empresa_codigo;
        state.jornada = primeiroRegistro.jornada || '08:00';
        state.ruleExtra100Optional = primeiroRegistro.rule_extra_100_opcional || false;
        state.feriados = JSON.parse(primeiroRegistro.feriados_json || '[]');
        
        await carregarEmpregadosDisponiveisParaTela();
        
        const jornadaInput = document.getElementById('jornada');
        if (jornadaInput) {
            jornadaInput.value = state.jornada;
        }
        
        const ruleCheckbox = document.getElementById('ruleExtra100Optional');
        if (ruleCheckbox) {
            ruleCheckbox.checked = state.ruleExtra100Optional;
        }
        
        state.abaSelecionada = 0;
        
        fecharModalPreenchimentos();
        
        mostrarTela('mainScreen');
        
        renderizarAbas();
        renderizarConteudoAba();
        renderizarTabelaFeriados();
        
        console.log(`✅ ${ultimasVersoes.length} folhas carregadas com sucesso!`);
        
        const autores = [...new Set(ultimasVersoes.map(r => r.nome_usuario || r.atualizado_por || 'Sistema'))];
        mostrarMensagem('Sucesso', `${ultimasVersoes.length} folhas carregadas com sucesso!\n\nEmpregados: ${ultimasVersoes.map(r => r.nome_trabalhador).join(', ')}\n\nAutor(es): ${autores.join(', ')}`);
        
        iniciarAutoSave();
        
    } catch (erro) {
        console.error('❌ Erro ao carregar preenchimentos:', erro);
        mostrarMensagem('Erro', 'Erro ao carregar preenchimentos. Tente novamente.');
    }
}

function iniciarNovoPreenchimento(competencia, codigoEmpresa) {
    state.competencia = competencia;
    state.codigoEmpresa = codigoEmpresa;
    state.folhas = [];
    state.abaSelecionada = 0;
    carregarFeriadosPadrao();
    
    carregarEmpregadosDisponiveisParaTela();
    
    fecharModalPreenchimentos();
    mostrarTela('mainScreen');
    adicionarNovaFolha();
    
    console.log('✨ Novo preenchimento iniciado');
    iniciarAutoSave();
}

// ============================================
// INICIALIZAÇÃO DE EVENTOS
// ============================================

function inicializarEventos() {
    console.log('🔄 Inicializando eventos...');
    
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        console.log('✅ Formulário de login encontrado');
        loginForm.addEventListener('submit', handleLogin);
    }
    
    const registroForm = document.getElementById('registroForm');
    if (registroForm) {
        console.log('✅ Formulário de registro encontrado');
        registroForm.addEventListener('submit', handleRegistro);
    }
    
    const selectionForm = document.getElementById('selectionForm');
    if (selectionForm) {
        selectionForm.addEventListener('submit', handleCarregarFolhaComPersistencia);
    }
    
    const addTabBtn = document.getElementById('addTabBtn');
    if (addTabBtn) {
        addTabBtn.addEventListener('click', adicionarNovaFolha);
    }
    
    const openFeriadosBtn = document.getElementById('openFeriadosBtn');
    if (openFeriadosBtn) {
        openFeriadosBtn.addEventListener('click', abrirModalFeriados);
    }
    
    const addFeriadoBtn = document.getElementById('addFeriadoBtn');
    if (addFeriadoBtn) {
        addFeriadoBtn.addEventListener('click', adicionarFeriado);
    }
    
    const closeFeriadosBtn = document.getElementById('closeFeriadosBtn');
    if (closeFeriadosBtn) {
        closeFeriadosBtn.addEventListener('click', fecharModalFeriados);
    }
    
    const processBtn = document.getElementById('processBtn');
    if (processBtn) {
        processBtn.addEventListener('click', processarFolhaComSalvamento);
    }
    
    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', resetarDadosComSupabase);
    }
    
    const exportXlsxBtn = document.getElementById('exportXlsxBtn');
    if (exportXlsxBtn) {
        exportXlsxBtn.addEventListener('click', exportarParaExcel);
    }
    
    const backToEditBtn = document.getElementById('backToEditBtn');
    if (backToEditBtn) {
        backToEditBtn.addEventListener('click', voltarParaEdicao);
    }
    
    const messageOk = document.getElementById('messageOk');
    if (messageOk) {
        messageOk.addEventListener('click', fecharModalMensagem);
    }
    
    const confirmYes = document.getElementById('confirmYes');
    if (confirmYes) {
        confirmYes.addEventListener('click', confirmarAcao);
    }
    
    const confirmNo = document.getElementById('confirmNo');
    if (confirmNo) {
        confirmNo.addEventListener('click', fecharModalConfirmacao);
    }
    
    const competencia = document.getElementById('competencia');
    if (competencia) {
        competencia.addEventListener('input', (e) => {
            e.target.value = formatarCompetencia(e.target.value);
        });
    }
    
    const jornada = document.getElementById('jornada');
    if (jornada) {
        jornada.addEventListener('input', (e) => {
            e.target.value = formatarHora(e.target.value);
        });
    }
    
    const novaDataFeriado = document.getElementById('novaDataFeriado');
    if (novaDataFeriado) {
        novaDataFeriado.addEventListener('input', (e) => {
            e.target.value = formatarData(e.target.value);
        });
    }
    
    const ruleExtra100Optional = document.getElementById('ruleExtra100Optional');
    if (ruleExtra100Optional) {
        ruleExtra100Optional.addEventListener('change', (e) => {
            state.ruleExtra100Optional = e.target.checked;
            console.log('✅ Regra 100% (2ª Extra) alterada para:', state.ruleExtra100Optional);
        });
    }
    
    console.log('✅ Eventos inicializados');
}

// ============================================
// TELA DE SELEÇÃO (Competência e Empresa)
// ============================================

async function handleCarregarFolhaComPersistencia(e) {
    e.preventDefault();
    
    const competencia = document.getElementById('competencia').value.trim();
    const codigoEmpresa = document.getElementById('codigoEmpresa').value.trim();
    
    if (!validarCompetencia(competencia)) {
        mostrarMensagem('Erro', 'Competência inválida. Use o formato MM/AAAA (ex: 02/2026).');
        return;
    }
    
    if (!codigoEmpresa) {
        mostrarMensagem('Erro', 'Código da empresa é obrigatório.');
        return;
    }
    
    state.codigoEmpresa = codigoEmpresa;
    await carregarEmpregadosDisponiveisParaTela();
    
    await carregarPreenchimentosAnteriores();
}

function validarCompetencia(competencia) {
    const regex = /^(0[1-9]|1[0-2])\/\d{4}$/;
    return regex.test(competencia);
}

// ============================================
// SISTEMA DE ABAS
// ============================================

function adicionarNovaFolha() {
    const empregadosJaSelecionados = state.folhas.map(f => f.nomeTrabalhador).filter(n => n);
    const empregadosDisponiveis = window.empregadosDisponiveis || [];
    
    const empregadosNaoSelecionados = empregadosDisponiveis.filter(
        emp => !empregadosJaSelecionados.includes(emp.nome)
    );
    
    if (empregadosNaoSelecionados.length === 0) {
        mostrarMensagem('Aviso', 'Todos os empregados já foram selecionados para esta empresa.');
        return;
    }
    
    const novaFolha = {
        id: Date.now(),
        nomeTrabalhador: '',
        dados: {}
    };
    const [mes, ano] = state.competencia.split('/');
    const diasNoMes = new Date(ano, mes, 0).getDate();
    for (let dia = 1; dia <= diasNoMes; dia++) {
        const data = String(dia).padStart(2, '0') + '/' + mes + '/' + ano;
        novaFolha.dados[data] = {
            entrada1: '',
            saida1: '',
            entrada2: '',
            saida2: ''
        };
    }
    state.folhas.push(novaFolha);
    state.abaSelecionada = state.folhas.length - 1;
    console.log('Nova folha adicionada. Total:', state.folhas.length);
    renderizarAbas();
    renderizarConteudoAba();
}

function renderizarAbas() {
    const tabsNav = document.getElementById('tabsNav');
    tabsNav.innerHTML = '';
    state.folhas.forEach((folha, index) => {
        const tab = document.createElement('button');
        tab.type = 'button';
        tab.className = 'tab-button' + (index === state.abaSelecionada ? ' active' : '');
        tab.innerHTML = `
            <span>${folha.nomeTrabalhador || 'Folha ' + (index + 1)}</span>
            <button type="button" class="tab-close" onclick="event.stopPropagation(); removerFolha(${index})">×</button>
        `;
        tab.addEventListener('click', () => {
            state.abaSelecionada = index;
            renderizarAbas();
            renderizarConteudoAba();
        });
        tabsNav.appendChild(tab);
    });
}

function removerFolha(index) {
    mostrarConfirmacao(
        'Remover Folha',
        'Deseja remover esta folha de ponto?',
        () => {
            state.folhas.splice(index, 1);
            if (state.abaSelecionada >= state.folhas.length) {
                state.abaSelecionada = state.folhas.length - 1;
            }
            renderizarAbas();
            renderizarConteudoAba();
        }
    );
}

// ============================================
// RENDERIZAÇÃO DE CONTEÚDO DA ABA
// ============================================

function renderizarConteudoAba() {
    const tabsContent = document.getElementById('tabsContent');
    tabsContent.innerHTML = '';
    const folha = state.folhas[state.abaSelecionada];
    const [mes, ano] = state.competencia.split('/');
    const diasNoMes = new Date(ano, mes, 0).getDate();
    
    const header = document.createElement('div');
    header.className = 'tab-content-header';
    
    const empregadosJaSelecionados = state.folhas
        .map((f, idx) => idx !== state.abaSelecionada ? f.nomeTrabalhador : null)
        .filter(n => n);
    
    const empregadosDisponiveis = window.empregadosDisponiveis || [];
    
    const empregadosParaSelect = empregadosDisponiveis.filter(
        emp => !empregadosJaSelecionados.includes(emp.nome)
    );
    
    let optionsHTML = '<option value="">Selecione um empregado...</option>';
    empregadosParaSelect.forEach(emp => {
        const selected = emp.nome === folha.nomeTrabalhador ? 'selected' : '';
        optionsHTML += `<option value="${emp.nome}" ${selected}>${emp.codigo} - ${emp.nome}</option>`;
    });
    
    if (folha.nomeTrabalhador && !empregadosParaSelect.find(e => e.nome === folha.nomeTrabalhador)) {
        const empSelecionado = empregadosDisponiveis.find(e => e.nome === folha.nomeTrabalhador);
        if (empSelecionado) {
            optionsHTML = `<option value="${empSelecionado.nome}" selected>${empSelecionado.codigo} - ${empSelecionado.nome}</option>` + optionsHTML;
        }
    }
    
    header.innerHTML = `
        <div class="form-group">
            <label for="nomeTrabalhador">Nome do Empregado *</label>
            <select id="nomeTrabalhador" required>
                ${optionsHTML}
            </select>
            <small>Selecione o empregado</small>
        </div>
    `;
    
    const selectNome = header.querySelector('#nomeTrabalhador');
    selectNome.addEventListener('change', (e) => {
        folha.nomeTrabalhador = e.target.value;
        renderizarAbas();
    });
    
    tabsContent.appendChild(header);
    
    const tableWrapper = document.createElement('div');
    tableWrapper.className = 'table-wrapper';
    const table = document.createElement('table');
    const thead = document.createElement('thead');
    const tbody = document.createElement('tbody');
    const headerRow = document.createElement('tr');
    headerRow.innerHTML = '<th>DATA</th><th>DIA DA SEMANA</th><th>ENTRADA 1</th><th>SAIDA 1</th><th>ENTRADA 2</th><th>SAIDA 2</th>';
    thead.appendChild(headerRow);
    
    for (let dia = 1; dia <= diasNoMes; dia++) {
        const data = String(dia).padStart(2, '0') + '/' + mes + '/' + ano;
        const dataObj = new Date(ano, mes - 1, dia);
        const diaSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'][dataObj.getDay()];
        const dados = folha.dados[data];
        const row = document.createElement('tr');
        const isFeriado = state.feriados.some(f => f.data === data);
        const isDSR = dataObj.getDay() === 0;
        if (isFeriado || isDSR) {
            row.classList.add(isFeriado ? 'feriado' : 'dsr');
        }
        row.innerHTML = '<td>' + data + '</td><td>' + diaSemana + '</td><td><input type="text" class="time-input entrada1" placeholder="HH:MM" value="' + dados.entrada1 + '" maxlength="5"></td><td><input type="text" class="time-input saida1" placeholder="HH:MM" value="' + dados.saida1 + '" maxlength="5"></td><td><input type="text" class="time-input entrada2" placeholder="HH:MM" value="' + dados.entrada2 + '" maxlength="5"></td><td><input type="text" class="time-input saida2" placeholder="HH:MM" value="' + dados.saida2 + '" maxlength="5"></td>';
        row.querySelectorAll('.time-input').forEach((input, idx) => {
            input.addEventListener('input', (e) => {
                e.target.value = formatarHora(e.target.value);
            });
            input.addEventListener('change', (e) => {
                const campos = ['entrada1', 'saida1', 'entrada2', 'saida2'];
                dados[campos[idx]] = e.target.value;
            });
        });
        tbody.appendChild(row);
    }
    table.appendChild(thead);
    table.appendChild(tbody);
    tableWrapper.appendChild(table);
    tabsContent.appendChild(tableWrapper);
}

// ============================================
// GERENCIAMENTO DE FERIADOS
// ============================================

function carregarFeriadosPadrao() {
    const feriadosPadrao = [
        { data: '01/01', descricao: 'Ano Novo' },
        { data: '21/04', descricao: 'Tiradentes' },
        { data: '01/05', descricao: 'Dia do Trabalho' },
        { data: '07/09', descricao: 'Independência do Brasil' },
        { data: '12/10', descricao: 'Nossa Senhora Aparecida' },
        { data: '02/11', descricao: 'Finados' },
        { data: '15/11', descricao: 'Proclamação da República' },
        { data: '20/11', descricao: 'Consciência Negra' },
        { data: '25/12', descricao: 'Natal' }
    ];
    const [mes, ano] = state.competencia.split('/');
    state.feriados = feriadosPadrao.map(f => ({
        data: f.data + '/' + ano,
        descricao: f.descricao
    }));
    console.log('Feriados padrão carregados:', state.feriados.length);
}

function abrirModalFeriados() {
    const modal = document.getElementById('feriadosModal');
    modal.classList.add('active');
    renderizarTabelaFeriados();
}

function fecharModalFeriados() {
    const modal = document.getElementById('feriadosModal');
    modal.classList.remove('active');
}

function adicionarFeriado() {
    const data = document.getElementById('novaDataFeriado').value.trim();
    const descricao = document.getElementById('novaDescricaoFeriado').value.trim();
    if (!validarData(data)) {
        console.error('Data inválida:', data);
        mostrarMensagem('Erro', 'Data inválida. Use o formato DD/MM/AAAA (ex: 25/12/2026).');
        return;
    }
    if (!descricao) {
        mostrarMensagem('Erro', 'Descrição é obrigatória.');
        return;
    }
    const feriadoExistente = state.feriados.some(f => f.data === data);
    if (feriadoExistente) {
        mostrarMensagem('Aviso', 'Este feriado já foi adicionado.');
        return;
    }
    state.feriados.push({ data, descricao });
    console.log('Feriado adicionado:', data, descricao);
    document.getElementById('novaDataFeriado').value = '';
    document.getElementById('novaDescricaoFeriado').value = '';
    renderizarTabelaFeriados();
}

function removerFeriado(data) {
    state.feriados = state.feriados.filter(f => f.data !== data);
    console.log('Feriado removido:', data);
    renderizarTabelaFeriados();
}

function renderizarTabelaFeriados() {
    const tbody = document.getElementById('feriadosTbody');
    tbody.innerHTML = '';
    state.feriados.forEach(feriado => {
        const row = document.createElement('tr');
        row.innerHTML = '<td>' + feriado.data + '</td><td>' + feriado.descricao + '</td><td><button type="button" class="btn-delete" onclick="removerFeriado(\'' + feriado.data + '\')">Remover</button></td>';
        tbody.appendChild(row);
    });
}

function validarData(data) {
    const regex = /^(0[1-9]|[12]\d|3[01])\/(0[1-9]|1[0-2])\/(\d{4})$/;
    if (!regex.test(data)) {
        console.error('Formato de data inválido:', data);
        return false;
    }
    const [dia, mes, ano] = data.split('/').map(Number);
    const dataObj = new Date(ano, mes - 1, dia);
    const isValidDate =
        dataObj.getFullYear() === ano &&
        dataObj.getMonth() === mes - 1 &&
        dataObj.getDate() === dia;
    if (!isValidDate) {
        console.error('Data inválida (dia/mês incoerente):', data);
        return false;
    }
    console.log('Data validada com sucesso:', data);
    return true;
}

// ============================================
// PROCESSAMENTO E CÁLCULOS
// ============================================

async function processarFolhaComSalvamento() {
    console.log('Iniciando processamento...');
    if (!validarDadosPreProcessamento()) {
        return;
    }
    
    const jornada = document.getElementById('jornada').value.trim();
    if (!jornada) {
        mostrarMensagem('Erro', 'Jornada de trabalho é obrigatória.');
        return;
    }
    
    state.jornada = jornada;
    state.resultados = [];
    state.folhas.forEach(folha => {
        const resultado = calcularFolha(folha);
        state.resultados.push(resultado);
    });
    
    await salvarFolhaNoSupabase();
    
    console.log('Processamento concluído. Resultados:', state.resultados.length);
    mostrarTela('resultsScreen');
    renderizarResultados();
}

function validarDadosPreProcessamento() {
    if (!state.competencia) {
        mostrarMensagem('Erro', 'Competência não foi carregada.');
        return false;
    }
    if (state.folhas.length === 0) {
        mostrarMensagem('Erro', 'Adicione pelo menos uma folha de ponto.');
        return false;
    }
    for (let folha of state.folhas) {
        if (!folha.nomeTrabalhador.trim()) {
            mostrarMensagem('Erro', 'Nome do trabalhador é obrigatório em todas as folhas.');
            return false;
        }
    }
    const jornada = document.getElementById('jornada').value.trim();
    if (!jornada || !validarHora(jornada)) {
        mostrarMensagem('Erro', 'Jornada de trabalho inválida. Use o formato HH:MM.');
        return false;
    }
    return true;
}

function validarHora(hora) {
    const regex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    return regex.test(hora);
}

function calcularHorasTrabalhadas(entrada, saida) {
    if (entrada === 0 || saida === 0) {
        return 0;
    }
    if (saida < entrada) {
        return (1440 - entrada) + saida;
    }
    return saida - entrada;
}

function calcularFolha(folha) {
    const resultado = {
        nomeTrabalhador: folha.nomeTrabalhador,
        competencia: state.competencia,
        dias: [],
        consolidado: {
            horasTrabalhadas: 0,
            horasExtras50: 0,
            horasExtras100Geral: 0,
            horasExtras100Opcional: 0,
            horasNoturnaReais: 0,
            horasNoturnaConvertida: 0,
            horasDevidas: 0
        }
    };
    
    const [mes, ano] = state.competencia.split('/');
    const diasNoMes = new Date(ano, mes, 0).getDate();
    const jornada = converterHoraParaMinutos(state.jornada);
    
    console.log('\n' + '='.repeat(80));
    console.log('📊 PROCESSANDO FOLHA: ' + folha.nomeTrabalhador);
    console.log('Competência: ' + state.competencia);
    console.log('Jornada: ' + state.jornada);
    console.log('Regra 100% (A partir da 3ª Extra): ' + (state.ruleExtra100Optional ? 'ATIVADA' : 'DESATIVADA'));
    console.log('='.repeat(80));
    
    for (let dia = 1; dia <= diasNoMes; dia++) {
        const data = String(dia).padStart(2, '0') + '/' + mes + '/' + ano;
        const dataObj = new Date(ano, mes - 1, dia);
        const diaSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'][dataObj.getDay()];
        const dados = folha.dados[data];
        
        const isFeriado = state.feriados.some(f => f.data === data);
        const isDSR = dataObj.getDay() === 0;
        
        const entrada1 = converterHoraParaMinutos(dados.entrada1);
        const saida1 = converterHoraParaMinutos(dados.saida1);
        const entrada2 = converterHoraParaMinutos(dados.entrada2);
        const saida2 = converterHoraParaMinutos(dados.saida2);
        
        const horasTrabalhadas = calcularHorasTrabalhadas(entrada1, saida1) + calcularHorasTrabalhadas(entrada2, saida2);
        
        if (horasTrabalhadas === 0) {
            continue;
        }
        
        console.log('\n📅 ' + data + ' - ' + diaSemana + (isFeriado ? ' 🎉 FERIADO' : '') + (isDSR ? ' 🚫 DSR' : ''));
        console.log('  Período 1: ' + dados.entrada1 + ' a ' + dados.saida1 + ' = ' + converterMinutosParaHora(calcularHorasTrabalhadas(entrada1, saida1)));
        console.log('  Período 2: ' + dados.entrada2 + ' a ' + dados.saida2 + ' = ' + converterMinutosParaHora(calcularHorasTrabalhadas(entrada2, saida2)));
        console.log('  Total Trabalhadas: ' + converterMinutosParaHora(horasTrabalhadas));
        
        const horasNoturnaReais = calcularHorasNoturnas(entrada1, saida1, entrada2, saida2);
        const horasNoturnaConvertida = calcularHorasNoturnaConvertida(horasNoturnaReais);
        
        console.log('  Noturnas Reais: ' + converterMinutosParaHora(horasNoturnaReais));
        console.log('  Noturnas Convertidas: ' + converterMinutosParaHora(horasNoturnaConvertida));
        
        let horasExtras50 = 0;
        let horasExtras100Geral = 0;
        let horasExtras100Opcional = 0;
        
        const horasTrabalhadasAjustadas = horasTrabalhadas + (horasNoturnaConvertida - horasNoturnaReais);
        const horasExtrasTotais = Math.max(0, horasTrabalhadasAjustadas - jornada);
        
        console.log('  Horas Trabalhadas (com noturnas convertidas): ' + converterMinutosParaHora(horasTrabalhadasAjustadas));
        console.log('  Horas Extras Totais: ' + converterMinutosParaHora(horasExtrasTotais));
        
        if (isFeriado || isDSR) {
            horasExtras100Geral = horasTrabalhadas;
            console.log('  ⚠️ FERIADO/DSR: Todas as ' + converterMinutosParaHora(horasTrabalhadas) + ' são 100%');
        } 
        else if (state.ruleExtra100Optional && horasExtrasTotais > 0) {
            const duasHoras = 2 * 60;
            
            if (horasExtrasTotais <= duasHoras) {
                horasExtras50 = horasExtrasTotais;
                console.log('  ✅ Regra 100% ATIVADA (A partir da 3ª hora)');
                console.log('     Extra 50% (até 2h): ' + converterMinutosParaHora(horasExtras50));
            } else {
                horasExtras50 = duasHoras;
                horasExtras100Opcional = horasExtrasTotais - duasHoras;
                console.log('  ✅ Regra 100% ATIVADA (A partir da 3ª hora)');
                console.log('     Extra 50% (até 2h): ' + converterMinutosParaHora(horasExtras50));
                console.log('     Extra 100% (a partir 3ª): ' + converterMinutosParaHora(horasExtras100Opcional));
            }
        }
        else {
            horasExtras50 = horasExtrasTotais;
            console.log('  ℹ️ Regra 100% DESATIVADA');
            console.log('     Extra 50%: ' + converterMinutosParaHora(horasExtras50));
        }
        
        const horasDevidas = Math.max(0, jornada - horasTrabalhadasAjustadas);
        
        if (horasDevidas > 0) {
            console.log('  ⏱️ Horas Devidas: ' + converterMinutosParaHora(horasDevidas));
        }
        
        resultado.consolidado.horasTrabalhadas += horasTrabalhadas;
        resultado.consolidado.horasExtras50 += horasExtras50;
        resultado.consolidado.horasExtras100Geral += horasExtras100Geral;
        resultado.consolidado.horasExtras100Opcional += horasExtras100Opcional;
        resultado.consolidado.horasNoturnaReais += horasNoturnaReais;
        resultado.consolidado.horasNoturnaConvertida += horasNoturnaConvertida;
        resultado.consolidado.horasDevidas += horasDevidas;
        
        resultado.dias.push({
            data,
            diaSemana,
            entrada1: dados.entrada1,
            saida1: dados.saida1,
            entrada2: dados.entrada2,
            saida2: dados.saida2,
            horasTrabalhadas,
            horasExtras50,
            horasExtras100Geral,
            horasExtras100Opcional,
            horasNoturnaReais,
            horasNoturnaConvertida,
            horasDevidas,
            isFeriado,
            isDSR
        });
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('📊 CONSOLIDADO DO MÊS - ' + folha.nomeTrabalhador);
    console.log('='.repeat(80));
    console.log('  Horas Trabalhadas: ' + converterMinutosParaHora(resultado.consolidado.horasTrabalhadas));
    console.log('  Extras 50% (até 2h): ' + converterMinutosParaHora(resultado.consolidado.horasExtras50));
    console.log('  Extras 100% (Feriado/DSR): ' + converterMinutosParaHora(resultado.consolidado.horasExtras100Geral));
    console.log('  Extras 100% (A partir 3ª): ' + converterMinutosParaHora(resultado.consolidado.horasExtras100Opcional));
    console.log('  Noturnas Reais: ' + converterMinutosParaHora(resultado.consolidado.horasNoturnaReais));
    console.log('  Noturnas Convertidas: ' + converterMinutosParaHora(resultado.consolidado.horasNoturnaConvertida));
    console.log('  Horas Devidas: ' + converterMinutosParaHora(resultado.consolidado.horasDevidas));
    console.log('='.repeat(80) + '\n');
    
    return resultado;
}

function converterHoraParaMinutos(hora) {
    if (!hora || hora.trim() === '') return 0;
    const [h, m] = hora.split(':').map(Number);
    return h * 60 + m;
}

function converterMinutosParaHora(minutos) {
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    return String(horas).padStart(2, '0') + ':' + String(mins).padStart(2, '0');
}

function calcularHorasNoturnas(entrada1, saida1, entrada2, saida2) {
    const inicioNoturno = 22 * 60;
    const fimNoturno = 5 * 60;
    
    let minutosNoturnos = 0;
    
    if (entrada1 > 0 && saida1 > 0) {
        minutosNoturnos += calcularMinutosNoturnoPeriodo(entrada1, saida1, inicioNoturno, fimNoturno);
    }
    
    if (entrada2 > 0 && saida2 > 0) {
        minutosNoturnos += calcularMinutosNoturnoPeriodo(entrada2, saida2, inicioNoturno, fimNoturno);
    }
    
    return minutosNoturnos;
}

function calcularMinutosNoturnoPeriodo(entrada, saida, inicioNoturno, fimNoturno) {
    let minutosNoturnos = 0;
    
    if (saida < entrada) {
        if (entrada >= inicioNoturno) {
            minutosNoturnos += (24 * 60) - entrada;
        }
        
        if (saida <= fimNoturno) {
            minutosNoturnos += saida;
        } else {
            minutosNoturnos += fimNoturno;
        }
    } else {
        if (entrada < inicioNoturno && saida > inicioNoturno) {
            minutosNoturnos += saida - inicioNoturno;
        } else if (entrada >= inicioNoturno && saida >= inicioNoturno) {
            minutosNoturnos += saida - entrada;
        }
        
        if (entrada < fimNoturno && saida > entrada) {
            minutosNoturnos += Math.min(saida, fimNoturno) - entrada;
        } else if (entrada < fimNoturno && saida >= fimNoturno) {
            minutosNoturnos += fimNoturno - entrada;
        }
    }
    
    return Math.max(0, minutosNoturnos);
}

function calcularHorasNoturnaConvertida(minutosNoturnos) {
    return Math.round(minutosNoturnos / 0.875);
}

// ============================================
// RENDERIZAÇÃO DE RESULTADOS
// ============================================

function renderizarResultados() {
    renderizarConsolidado();
    renderizarTabelasDiarias();
}

function renderizarConsolidado() {
    const container = document.getElementById('consolidadoContainer');
    container.innerHTML = '';
    state.resultados.forEach(resultado => {
        const card = document.createElement('div');
        card.className = 'consolidado-card';
        const consolidado = resultado.consolidado;
        let html = '<h3>📊 ' + resultado.nomeTrabalhador + '</h3>';
        html += '<div class="competencia">' + resultado.competencia + '</div>';
        html += '<div class="metric-grid">';
        html += '<div class="metric-item trabalhadas"><div class="metric-label">Horas Trabalhadas</div><div class="metric-value">' + converterMinutosParaHora(consolidado.horasTrabalhadas) + '</div></div>';
        html += '<div class="metric-item extras50"><div class="metric-label">Extras 50%</div><div class="metric-value">' + converterMinutosParaHora(consolidado.horasExtras50) + '</div></div>';
        html += '<div class="metric-item extras100"><div class="metric-label">Extras 100% (Feriado)</div><div class="metric-value">' + converterMinutosParaHora(consolidado.horasExtras100Geral) + '</div></div>';
        
        if (consolidado.horasExtras100Opcional > 0) {
            html += '<div class="metric-item extras100"><div class="metric-label">Extras 100% (2ª Hora)</div><div class="metric-value">' + converterMinutosParaHora(consolidado.horasExtras100Opcional) + '</div></div>';
        }
        
        html += '<div class="metric-item noturnas"><div class="metric-label">Not. Reais</div><div class="metric-value">' + converterMinutosParaHora(consolidado.horasNoturnaReais) + '</div></div>';
        html += '<div class="metric-item noturnas"><div class="metric-label">Not. Convertida</div><div class="metric-value">' + converterMinutosParaHora(consolidado.horasNoturnaConvertida) + '</div></div>';
        html += '<div class="metric-item devidas"><div class="metric-label">Horas Devidas</div><div class="metric-value">' + converterMinutosParaHora(consolidado.horasDevidas) + '</div></div>';
        html += '</div>';
        card.innerHTML = html;
        container.appendChild(card);
    });
}

function renderizarTabelasDiarias() {
    const container = document.getElementById('tabelasContainer');
    container.innerHTML = '';
    state.resultados.forEach(resultado => {
        const section = document.createElement('div');
        section.className = 'tabela-trabalhador';
        section.innerHTML = '<h3>📋 Detalhamento Diário - ' + resultado.nomeTrabalhador + '</h3>';
        const tableWrapper = document.createElement('div');
        tableWrapper.className = 'tabela-wrapper';
        const table = document.createElement('table');
        const thead = document.createElement('thead');
        const tbody = document.createElement('tbody');
        const headerRow = document.createElement('tr');
        headerRow.innerHTML = '<th>DATA</th><th>DIA</th><th>ENTRADA 1</th><th>SAIDA 1</th><th>ENTRADA 2</th><th>SAIDA 2</th><th>TRABALHADAS</th><th>EXTRAS 50%</th><th>EXTRAS 100% (Feriado)</th><th>EXTRAS 100% (Opcional)</th><th>NOT. REAIS</th><th>NOT. CONV.</th><th>DEVIDAS</th>';
        thead.appendChild(headerRow);
        resultado.dias.forEach(dia => {
            if (dia.entrada1 || dia.saida1 || dia.entrada2 || dia.saida2) {
                const row = document.createElement('tr');
                if (dia.isFeriado) row.classList.add('feriado');
                if (dia.isDSR) row.classList.add('dsr');
                row.innerHTML = '<td>' + dia.data + '</td><td>' + dia.diaSemana + '</td><td>' + dia.entrada1 + '</td><td>' + dia.saida1 + '</td><td>' + dia.entrada2 + '</td><td>' + dia.saida2 + '</td><td>' + converterMinutosParaHora(dia.horasTrabalhadas) + '</td><td>' + converterMinutosParaHora(dia.horasExtras50) + '</td><td>' + converterMinutosParaHora(dia.horasExtras100Geral) + '</td><td>' + converterMinutosParaHora(dia.horasExtras100Opcional) + '</td><td>' + converterMinutosParaHora(dia.horasNoturnaReais) + '</td><td>' + converterMinutosParaHora(dia.horasNoturnaConvertida) + '</td><td>' + converterMinutosParaHora(dia.horasDevidas) + '</td>';
                tbody.appendChild(row);
            }
        });
        table.appendChild(thead);
        table.appendChild(tbody);
        tableWrapper.appendChild(table);
        section.appendChild(tableWrapper);
        container.appendChild(section);
    });
}

// ============================================
// EXPORTAÇÃO PARA EXCEL
// ============================================

async function exportarParaExcel() {
    try {
        mostrarMensagem('Processando', 'Gerando arquivo Excel...');
        
        const workbook = XLSX.utils.book_new();
        
        console.log('📊 Gerando arquivo Excel com ' + state.resultados.length + ' abas...');
        
        state.resultados.forEach((resultado, indexResultado) => {
            console.log(`\n📄 Criando aba: ${resultado.nomeTrabalhador}`);
            
            const dados = [];
            
            dados.push([
                'FOLHA DE PONTO',
                '',
                '',
                '',
                '',
                '',
                '',
                '',
                '',
                '',
                ''
            ]);
            dados.push([
                'Empregado: ' + resultado.nomeTrabalhador,
                '',
                '',
                'Competência: ' + resultado.competencia,
                '',
                '',
                '',
                '',
                '',
                '',
                ''
            ]);
            dados.push([]);
            
            dados.push([
                'DATA',
                'DIA',
                'ENTRADA 1',
                'SAIDA 1',
                'ENTRADA 2',
                'SAIDA 2',
                'TRABALHADAS',
                'EXTRAS 50%',
                'EXTRAS 100%',
                'NOT. REAIS',
                'NOT. CONV.'
            ]);
            
            resultado.dias.forEach(dia => {
                const totalExtras100 = dia.horasExtras100Geral + dia.horasExtras100Opcional;
                
                dados.push([
                    dia.data,
                    dia.diaSemana,
                    dia.entrada1 || '',
                    dia.saida1 || '',
                    dia.entrada2 || '',
                    dia.saida2 || '',
                    converterMinutosParaHora(dia.horasTrabalhadas),
                    converterMinutosParaHora(dia.horasExtras50),
                    converterMinutosParaHora(totalExtras100),
                    converterMinutosParaHora(dia.horasNoturnaReais),
                    converterMinutosParaHora(dia.horasNoturnaConvertida)
                ]);
            });
            
            dados.push([]);
            
            dados.push(['CONSOLIDADO DO MÊS']);
            dados.push([
                'DESCRIÇÃO',
                'HORAS'
            ]);
            
            const consolidado = resultado.consolidado;
            dados.push([
                'Horas Trabalhadas',
                converterMinutosParaHora(consolidado.horasTrabalhadas)
            ]);
            dados.push([
                'Extras 50%',
                converterMinutosParaHora(consolidado.horasExtras50)
            ]);
            dados.push([
                'Extras 100% (Feriado/DSR)',
                converterMinutosParaHora(consolidado.horasExtras100Geral)
            ]);
            dados.push([
                'Extras 100% (2ª Hora)',
                converterMinutosParaHora(consolidado.horasExtras100Opcional)
            ]);
            dados.push([
                'Noturnas Reais',
                converterMinutosParaHora(consolidado.horasNoturnaReais)
            ]);
            dados.push([
                'Noturnas Convertidas',
                converterMinutosParaHora(consolidado.horasNoturnaConvertida)
            ]);
            dados.push([
                'Horas Devidas',
                converterMinutosParaHora(consolidado.horasDevidas)
            ]);
            
            const worksheet = XLSX.utils.aoa_to_sheet(dados);
            
            worksheet['!cols'] = [
                { wch: 12 },
                { wch: 12 },
                { wch: 12 },
                { wch: 12 },
                { wch: 12 },
                { wch: 12 },
                { wch: 14 },
                { wch: 14 },
                { wch: 14 },
                { wch: 14 },
                { wch: 14 }
            ];
            
            XLSX.utils.book_append_sheet(workbook, worksheet, resultado.nomeTrabalhador);
        });
        
        console.log('\n📊 Criando aba de consolidado geral...');
        
        const dadosConsolidado = [];
        
        dadosConsolidado.push([
            'CONSOLIDADO MENSAL GERAL',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            ''
        ]);
        dadosConsolidado.push([
            'Competência: ' + state.competencia,
            '',
            '',
            'Empresa: ' + state.codigoEmpresa,
            '',
            '',
            '',
            '',
            '',
            '',
            ''
        ]);
        dadosConsolidado.push([]);
        
        dadosConsolidado.push([
            'EMPREGADO',
            'TRABALHADAS',
            'EXTRAS 50%',
            'EXTRAS 100% (Feriado)',
            'EXTRAS 100% (2ª Hora)',
            'NOT. REAIS',
            'NOT. CONV.',
            'HORAS DEVIDAS'
        ]);
        
        state.resultados.forEach(resultado => {
            const consolidado = resultado.consolidado;
            
            dadosConsolidado.push([
                resultado.nomeTrabalhador,
                converterMinutosParaHora(consolidado.horasTrabalhadas),
                converterMinutosParaHora(consolidado.horasExtras50),
                converterMinutosParaHora(consolidado.horasExtras100Geral),
                converterMinutosParaHora(consolidado.horasExtras100Opcional),
                converterMinutosParaHora(consolidado.horasNoturnaReais),
                converterMinutosParaHora(consolidado.horasNoturnaConvertida),
                converterMinutosParaHora(consolidado.horasDevidas)
            ]);
        });
        
        dadosConsolidado.push([]);
        dadosConsolidado.push(['TOTAIS']);
        
        let totalTrabalhadas = 0;
        let totalExtras50 = 0;
        let totalExtras100Geral = 0;
        let totalExtras100Opcional = 0;
        let totalNoturnaReais = 0;
        let totalNoturnaConvertida = 0;
        let totalDevidas = 0;
        
        state.resultados.forEach(resultado => {
            const consolidado = resultado.consolidado;
            totalTrabalhadas += consolidado.horasTrabalhadas;
            totalExtras50 += consolidado.horasExtras50;
            totalExtras100Geral += consolidado.horasExtras100Geral;
            totalExtras100Opcional += consolidado.horasExtras100Opcional;
            totalNoturnaReais += consolidado.horasNoturnaReais;
            totalNoturnaConvertida += consolidado.horasNoturnaConvertida;
            totalDevidas += consolidado.horasDevidas;
        });
        
        dadosConsolidado.push([
            'TOTAL',
            converterMinutosParaHora(totalTrabalhadas),
            converterMinutosParaHora(totalExtras50),
            converterMinutosParaHora(totalExtras100Geral),
            converterMinutosParaHora(totalExtras100Opcional),
            converterMinutosParaHora(totalNoturnaReais),
            converterMinutosParaHora(totalNoturnaConvertida),
            converterMinutosParaHora(totalDevidas)
        ]);
        
        const worksheetConsolidado = XLSX.utils.aoa_to_sheet(dadosConsolidado);
        
        worksheetConsolidado['!cols'] = [
            { wch: 20 },
            { wch: 14 },
            { wch: 14 },
            { wch: 18 },
            { wch: 18 },
            { wch: 14 },
            { wch: 14 },
            { wch: 14 }
        ];
        
        XLSX.utils.book_append_sheet(workbook, worksheetConsolidado, 'Consolidado Geral');
        
        const nomeArquivo = `Folha_Ponto_${state.codigoEmpresa}_${state.competencia.replace('/', '_')}_${Date.now()}.xlsx`;
        
        console.log('💾 Gerando arquivo: ' + nomeArquivo);
        XLSX.writeFile(workbook, nomeArquivo);
        
        try {
            const { error: updateError } = await supabaseClient
                .from('saves')
                .update({
                    data_exportacao: new Date().toISOString(),
                    status: 'processado'
                })
                .eq('empresa_codigo', state.codigoEmpresa)
                .eq('competencia', state.competencia);
            
            if (updateError) {
                console.warn('⚠️ Erro ao atualizar status no Supabase:', updateError);
            } else {
                console.log('✅ Status atualizado no Supabase');
            }
        } catch (erro) {
            console.warn('⚠️ Erro ao salvar no Supabase:', erro);
        }
        
        mostrarMensagem('Sucesso', `Arquivo exportado com sucesso!\n\nArquivo: ${nomeArquivo}\n\nAbas:\n- ${state.resultados.map(r => r.nomeTrabalhador).join('\n- ')}\n- Consolidado Geral`);
        console.log('✅ Arquivo exportado com sucesso');
        
    } catch (erro) {
        console.error('❌ Erro ao exportar:', erro);
        mostrarMensagem('Erro', 'Erro ao exportar arquivo: ' + erro.message);
    }
}

// ============================================
// NAVEGAÇÃO ENTRE TELAS
// ============================================

function mostrarTela(telaId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(telaId).classList.add('active');
}

function voltarParaEdicao() {
    mostrarTela('mainScreen');
}

async function resetarDadosComSupabase() {
    mostrarConfirmacao(
        'Limpar Dados',
        'Deseja limpar todos os dados e retornar à tela inicial?',
        async () => {
            try {
                if (state.competencia && state.codigoEmpresa) {
                    await supabaseClient
                        .from('saves')
                        .update({ status: 'deletado' })
                        .eq('empresa_codigo', state.codigoEmpresa)
                        .eq('competencia', state.competencia);
                }
            } catch (erro) {
                console.error('Erro ao limpar dados remotos:', erro);
            }
            
            pararAutoSave();
            state.folhas = [];
            state.abaSelecionada = 0;
            document.getElementById('selectionForm').reset();
            mostrarTela('selectionScreen');
        }
    );
}

// ============================================
// MODAIS
// ============================================

function mostrarMensagem(titulo, mensagem) {
    document.getElementById('messageTitle').textContent = titulo;
    document.getElementById('messageText').textContent = mensagem;
    document.getElementById('messageModal').classList.add('active');
}

function fecharModalMensagem() {
    document.getElementById('messageModal').classList.remove('active');
}

function mostrarConfirmacao(titulo, mensagem, callback) {
    document.getElementById('confirmTitle').textContent = titulo;
    document.getElementById('confirmMessage').textContent = mensagem;
    window.confirmCallback = callback;
    document.getElementById('confirmModal').classList.add('active');
}

function confirmarAcao() {
    if (window.confirmCallback) {
        window.confirmCallback();
    }
    fecharModalConfirmacao();
}

function fecharModalConfirmacao() {
    document.getElementById('confirmModal').classList.remove('active');
    window.confirmCallback = null;
}

// ============================================
// FORMATADORES
// ============================================

function formatarCompetencia(valor) {
    valor = valor.replace(/\D/g, '');
    if (valor.length >= 2) {
        return valor.substring(0, 2) + '/' + valor.substring(2, 6);
    }
    return valor;
}

function formatarHora(valor) {
    valor = valor.replace(/\D/g, '');
    if (valor.length >= 2) {
        return valor.substring(0, 2) + ':' + valor.substring(2, 4);
    }
    return valor;
}

function formatarData(valor) {
    const apenasDigitos = valor.replace(/\D/g, '');
    if (apenasDigitos.length <= 2) {
        return apenasDigitos;
    } else if (apenasDigitos.length <= 4) {
        return apenasDigitos.substring(0, 2) + '/' + apenasDigitos.substring(2, 4);
    } else {
        return apenasDigitos.substring(0, 2) + '/' + apenasDigitos.substring(2, 4) + '/' + apenasDigitos.substring(4, 8);
    }
}

// ============================================
// SALVAMENTO AO SAIR
// ============================================

window.addEventListener('beforeunload', () => {
    pararAutoSave();
    salvarFolhaNoSupabase();
});