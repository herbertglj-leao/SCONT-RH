/**
 * SCONT - Sistema de Gestão de Ponto e Folha de Pagamento
 * Arquivo: script.js (VERSÃO CORRIGIDA - Com campos reais do Supabase)
 */

// ===== CONFIGURAÇÃO SUPABASE =====
const SUPABASE_URL = 'https://udnikmolgryzczalcbbz.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkbmlrbW9sZ3J5emN6YWxjYmJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxNDQzNTUsImV4cCI6MjA5MDcyMDM1NX0.9vCwDkmxhrLAc-UxKpUxiVHF0BBh8OIdGZPKpTWu-lI';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ===== ESTADO GLOBAL DA APLICAÇÃO =====
const state = {
    empresas: [],
    empregadosDisponiveis: [],
    empresaSelecionada: null,
    competencia: '',
    folhas: [],
    abaAtivaIndex: 0,
    feriados: [],
    jornada: '08:00',
    ruleExtra100Optional: false,
    resultados: []
};

// ===== INICIALIZAÇÃO =====
document.addEventListener('DOMContentLoaded', async () => {
    document.getElementById('competencia').addEventListener('input', (e) => {
        e.target.value = formatarCompetencia(e.target.value);
    });
    document.getElementById('jornada').addEventListener('input', (e) => {
        e.target.value = formatarHora(e.target.value);
    });
    document.getElementById('novaDataFeriado').addEventListener('input', (e) => {
        e.target.value = formatarData(e.target.value);
    });
    await carregarEmpresas();
    carregarFeriadosPadrao();
    inicializarEventos();
});

// --- CARREGAMENTO DE DADOS (SUPABASE) ---
async function carregarEmpresas() {
    try {
        const { data, error } = await supabaseClient
            .from('empresas')
            .select('codigo_empresa, nome_empresa')
            .order('nome_empresa', { ascending: true });
        if (error) throw error;
        state.empresas = data || [];
        const select = document.getElementById('codigoEmpresa');
        select.innerHTML = '<option value="">Selecione uma empresa...</option>';
        state.empresas.forEach(emp => {
            const option = document.createElement('option');
            option.value = emp.codigo_empresa;
            option.textContent = `${emp.codigo_empresa} - ${emp.nome_empresa}`;
            select.appendChild(option);
        });
    } catch (erro) {
        console.error('Erro ao carregar empresas:', erro);
        mostrarMensagem('Erro', 'Falha ao carregar a lista de empresas do servidor.');
    }
}

async function carregarEmpregados(codigoEmpresa) {
    try {
        const { data, error } = await supabaseClient
            .from('empregados')
            .select('codigo_empregado, nome_empregado')
            .eq('codigo_empresa', codigoEmpresa)
            .order('nome_empregado', { ascending: true });
        if (error) throw error;
        state.empregadosDisponiveis = data || [];
    } catch (erro) {
        console.error('Erro ao carregar empregados:', erro);
        mostrarMensagem('Erro', 'Falha ao carregar a lista de empregados.');
    }
}

// --- EVENTOS PRINCIPAIS ---
function inicializarEventos() {
    document.getElementById('selectionForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const comp = document.getElementById('competencia').value;
        const codEmp = document.getElementById('codigoEmpresa').value;
        if (!validarCompetencia(comp)) {
            mostrarMensagem('Erro', 'Competência inválida. Use o formato MM/AAAA.');
            return;
        }
        state.competencia = comp;
        state.empresaSelecionada = state.empresas.find(emp => emp.codigo_empresa === codEmp);
        await carregarEmpregados(codEmp);
        if (state.empregadosDisponiveis.length === 0) {
            mostrarMensagem('Aviso', 'Esta empresa não possui empregados cadastrados.');
            return;
        }
        await verificarPreenchimentosAnteriores(codEmp, comp);
    });
    document.getElementById('resetBtn').addEventListener('click', () => {
        mostrarConfirmacao('Limpar Dados', 'Tem certeza que deseja limpar todos os dados preenchidos? Esta ação não pode ser desfeita.', () => {
            iniciarNovaFolhaEmBranco();
        });
    });
    document.getElementById('backToEditBtn').addEventListener('click', voltarParaEdicao);
    document.getElementById('exportXlsxBtn').addEventListener('click', exportarParaExcel);
    document.getElementById('openFeriadosBtn').addEventListener('click', () => document.getElementById('feriadosModal').classList.add('active'));
    document.getElementById('closeFeriadosBtn').addEventListener('click', () => document.getElementById('feriadosModal').classList.remove('active'));
    document.getElementById('closeFeriadosBtnTop').addEventListener('click', () => document.getElementById('feriadosModal').classList.remove('active'));
    document.getElementById('addFeriadoBtn').addEventListener('click', adicionarFeriado);
    document.getElementById('addTabBtn').addEventListener('click', adicionarNovaFolha);
}

// --- RETOMADA DE DADOS (SAVES) ---
async function verificarPreenchimentosAnteriores(codigoEmpresa, competencia) {
    try {
        const { data, error } = await supabaseClient
            .from('saves')
            .select('usuario_id, responsavel_alteracao, data_criacao, nome_trabalhador')
            .eq('empresa_codigo', codigoEmpresa)
            .eq('competencia', competencia)
            .order('data_criacao', { ascending: false });
        if (error) throw error;
        if (data && data.length > 0) {
            const agrupados = agruparSaves(data);
            mostrarModalRetomada(agrupados, codigoEmpresa, competencia);
        } else {
            iniciarNovaFolhaEmBranco();
        }
    } catch (erro) {
        console.error('Erro ao buscar saves:', erro);
        iniciarNovaFolhaEmBranco();
    }
}

function agruparSaves(registros) {
    const grupos = {};
    registros.forEach(reg => {
        const dataCurta = new Date(reg.data_criacao).toLocaleDateString('pt-BR');
        const responsavel = reg.responsavel_alteracao || 'Usuário Desconhecido';
        const chave = `${dataCurta}_${responsavel}`;
        if (!grupos[chave]) {
            grupos[chave] = {
                data: dataCurta,
                responsavel: responsavel,
                timestamp: reg.data_criacao,
                empregados: new Set()
            };
        }
        grupos[chave].empregados.add(reg.nome_trabalhador);
    });
    return Object.values(grupos);
}

function mostrarModalRetomada(agrupados, codigoEmpresa, competencia) {
    const container = document.getElementById('listaPreenchimentos');
    container.innerHTML = '';
    agrupados.forEach(grupo => {
        const dataHora = new Date(grupo.timestamp).toLocaleString('pt-BR');
        const div = document.createElement('div');
        div.style.cssText = 'padding: 15px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center;';
        div.innerHTML = `
            <div>
                <div style="font-weight: bold; color: var(--primary-color);">👤 ${grupo.responsavel}</div>
                <div style="font-size: 12px; color: var(--text-secondary);">Salvo em: ${dataHora}</div>
                <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">${grupo.empregados.size} empregado(s) preenchido(s)</div>
            </div>
            <button class="btn btn-secondary btn-small" onclick="carregarSaveEspecifico('${codigoEmpresa}', '${competencia}', '${grupo.timestamp}')">Retomar</button>
        `;
        container.appendChild(div);
    });
    document.getElementById('btnNovoPreenchimento').onclick = () => {
        fecharModalPreenchimentos();
        iniciarNovaFolhaEmBranco();
    };
    document.getElementById('preenchimentosModal').classList.add('active');
}

function fecharModalPreenchimentos() {
    document.getElementById('preenchimentosModal').classList.remove('active');
}

async function carregarSaveEspecifico(codigoEmpresa, competencia, timestamp) {
    fecharModalPreenchimentos();
    mostrarMensagem('Carregando', 'Recuperando dados salvos...');
    try {
        const { data, error } = await supabaseClient
            .from('saves')
            .select('*')
            .eq('empresa_codigo', codigoEmpresa)
            .eq('competencia', competencia)
            .lte('data_criacao', timestamp)
            .order('data_criacao', { ascending: false });
        if (error) throw error;
        const ultimasVersoes = {};
        data.forEach(reg => {
            if (!ultimasVersoes[reg.nome_trabalhador]) {
                ultimasVersoes[reg.nome_trabalhador] = reg;
            }
        });
        const registrosParaCarregar = Object.values(ultimasVersoes);
        if (registrosParaCarregar.length > 0) {
            state.jornada = registrosParaCarregar[0].jornada || '08:00';
            state.ruleExtra100Optional = registrosParaCarregar[0].rule_extra_100_opcional || false;
            if (registrosParaCarregar[0].feriados_json) {
                state.feriados = JSON.parse(registrosParaCarregar[0].feriados_json);
                renderizarTabelaFeriados();
            }
            document.getElementById('jornada').value = state.jornada;
            document.getElementById('ruleExtra100Optional').checked = state.ruleExtra100Optional;
            state.folhas = registrosParaCarregar.map(reg => ({
                empregadoId: state.empregadosDisponiveis.find(e => e.nome_empregado === reg.nome_trabalhador)?.codigo_empregado || '',
                nome: reg.nome_trabalhador,
                dados: JSON.parse(reg.dados_json)
            }));
            state.abaAtivaIndex = 0;
            mostrarTela('mainScreen');
            renderizarAbas();
            fecharModalMensagem();
        } else {
            throw new Error("Nenhum dado válido encontrado no save.");
        }
    } catch (erro) {
        console.error('Erro ao carregar save:', erro);
        mostrarMensagem('Erro', 'Falha ao carregar os dados salvos. Iniciando folha em branco.');
        setTimeout(iniciarNovaFolhaEmBranco, 2000);
    }
}

function iniciarNovaFolhaEmBranco() {
    state.folhas = [];
    state.abaAtivaIndex = 0;
    adicionarNovaFolha();
    mostrarTela('mainScreen');
}

// --- SISTEMA DE ABAS E RENDERIZAÇÃO ---
function adicionarNovaFolha() {
    const novaFolha = {
        empregadoId: '',
        nome: 'Novo Empregado',
        dados: gerarDiasDoMes(state.competencia)
    };
    state.folhas.push(novaFolha);
    state.abaAtivaIndex = state.folhas.length - 1;
    renderizarAbas();
}

function removerFolha(index) {
    if (state.folhas.length <= 1) {
        mostrarMensagem('Aviso', 'Você precisa ter pelo menos uma folha.');
        return;
    }
    mostrarConfirmacao('Remover Folha', 'Tem certeza que deseja remover esta folha?', () => {
        state.folhas.splice(index, 1);
        state.abaAtivaIndex = Math.max(0, index - 1);
        renderizarAbas();
    });
}

function renderizarAbas() {
    const nav = document.getElementById('tabsNav');
    nav.innerHTML = '';
    state.folhas.forEach((folha, index) => {
        const btn = document.createElement('button');
        btn.className = `tab-btn ${index === state.abaAtivaIndex ? 'active' : ''}`;
        let nomeExibicao = folha.nome;
        if (nomeExibicao.length > 15) nomeExibicao = nomeExibicao.substring(0, 15) + '...';
        btn.innerHTML = `
            ${nomeExibicao}
            <span class="tab-close" onclick="event.stopPropagation(); removerFolha(${index})">×</span>
        `;
        btn.onclick = () => {
            state.abaAtivaIndex = index;
            renderizarAbas();
        };
        nav.appendChild(btn);
    });
    renderizarConteudoAba();
}

function renderizarConteudoAba() {
    const content = document.getElementById('tabsContent');
    const folha = state.folhas[state.abaAtivaIndex];
    if (!folha) return;
    let optionsEmpregados = '<option value="">Selecione o Empregado...</option>';
    state.empregadosDisponiveis.forEach(emp => {
        const selected = (folha.nome === emp.nome_empregado) ? 'selected' : '';
        optionsEmpregados += `<option value="${emp.codigo_empregado}|${emp.nome_empregado}" ${selected}>${emp.codigo_empregado} - ${emp.nome_empregado}</option>`;
    });
    let html = `
        <div style="margin-bottom: 20px;">
            <label for="selectEmpregado">Empregado *</label>
            <select id="selectEmpregado" onchange="atualizarNomeEmpregado(this.value, ${state.abaAtivaIndex})">
                ${optionsEmpregados}
            </select>
        </div>
        <div class="table-container">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Data</th>
                        <th>Dia</th>
                        <th>Entrada 1</th>
                        <th>Saída 1</th>
                        <th>Entrada 2</th>
                        <th>Saída 2</th>
                        <th>Ação</th>
                    </tr>
                </thead>
                <tbody>
    `;
    folha.dados.forEach((dia, diaIndex) => {
        html += `
            <tr>
                <td>${dia.data}</td>
                <td>${dia.diaSemana}</td>
                <td><input type="text" class="time-input" value="${dia.entrada1}" onchange="atualizarDado(${state.abaAtivaIndex}, ${diaIndex}, 'entrada1', this.value)" placeholder="00:00" maxlength="5"></td>
                <td><input type="text" class="time-input" value="${dia.saida1}" onchange="atualizarDado(${state.abaAtivaIndex}, ${diaIndex}, 'saida1', this.value)" placeholder="00:00" maxlength="5"></td>
                <td><input type="text" class="time-input" value="${dia.entrada2}" onchange="atualizarDado(${state.abaAtivaIndex}, ${diaIndex}, 'entrada2', this.value)" placeholder="00:00" maxlength="5"></td>
                <td><input type="text" class="time-input" value="${dia.saida2}" onchange="atualizarDado(${state.abaAtivaIndex}, ${diaIndex}, 'saida2', this.value)" placeholder="00:00" maxlength="5"></td>
                <td><button type="button" class="btn-icon" onclick="limparLinha(${state.abaAtivaIndex}, ${diaIndex})" title="Limpar linha">🗑️</button></td>
            </tr>
        `;
    });
    html += `</tbody></table></div>`;
    content.innerHTML = html;
    document.querySelectorAll('.time-input').forEach(input => {
        input.addEventListener('input', (e) => {
            e.target.value = formatarHora(e.target.value);
        });
    });
}

window.atualizarNomeEmpregado = function(valorSelect, folhaIndex) {
    if (!valorSelect) {
        state.folhas[folhaIndex].nome = 'Novo Empregado';
        state.folhas[folhaIndex].empregadoId = '';
    } else {
        const [id, nome] = valorSelect.split('|');
        state.folhas[folhaIndex].nome = nome;
        state.folhas[folhaIndex].empregadoId = id;
    }
    renderizarAbas();
};

window.atualizarDado = function(folhaIndex, diaIndex, campo, valor) {
    if (valor && !validarHora(valor)) {
        mostrarMensagem('Erro', 'Hora inválida. Use o formato HH:MM (00:00 a 23:59).');
        renderizarConteudoAba();
        return;
    }
    state.folhas[folhaIndex].dados[diaIndex][campo] = valor;
};

window.limparLinha = function(folhaIndex, diaIndex) {
    state.folhas[folhaIndex].dados[diaIndex].entrada1 = '';
    state.folhas[folhaIndex].dados[diaIndex].saida1 = '';
    state.folhas[folhaIndex].dados[diaIndex].entrada2 = '';
    state.folhas[folhaIndex].dados[diaIndex].saida2 = '';
    renderizarConteudoAba();
};

// --- GERENCIAMENTO DE FERIADOS ---
function carregarFeriadosPadrao() {
    const feriadosFixos = [
        { dia: '01/01', desc: 'Confraternização Universal' },
        { dia: '21/04', desc: 'Tiradentes' },
        { dia: '01/05', desc: 'Dia do Trabalho' },
        { dia: '07/09', desc: 'Independência do Brasil' },
        { dia: '12/10', desc: 'Nossa Senhora Aparecida' },
        { dia: '02/11', desc: 'Finados' },
        { dia: '20/11', desc: 'Consciência Negra' },
        { dia: '25/12', desc: 'Natal' }
    ];
    state.feriados = feriadosFixos.map(f => ({ data: f.dia, descricao: f.desc }));
    renderizarTabelaFeriados();
}

function adicionarFeriado() {
    const data = document.getElementById('novaDataFeriado').value;
    const desc = document.getElementById('novaDescricaoFeriado').value;
    if (!validarData(data)) {
        mostrarMensagem('Erro', 'Data inválida. Use DD/MM/AAAA.');
        return;
    }
    if (!desc) {
        mostrarMensagem('Erro', 'Informe uma descrição para o feriado.');
        return;
    }
    if (!state.feriados.some(f => f.data === data)) {
        state.feriados.push({ data, descricao: desc });
        state.feriados.sort((a, b) => {
            const [d1, m1, a1] = a.data.split('/');
            const [d2, m2, a2] = b.data.split('/');
            return new Date(a1, m1-1, d1) - new Date(a2, m2-1, d2);
        });
        renderizarTabelaFeriados();
        renderizarConteudoAba();
    }
    document.getElementById('novaDataFeriado').value = '';
    document.getElementById('novaDescricaoFeriado').value = '';
}

window.removerFeriado = function(data) {
    state.feriados = state.feriados.filter(f => f.data !== data);
    renderizarTabelaFeriados();
    renderizarConteudoAba();
};

function renderizarTabelaFeriados() {
    const tbody = document.getElementById('feriadosTbody');
    tbody.innerHTML = '';
    if (state.feriados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; padding: 10px; color: var(--text-secondary);">Nenhum feriado cadastrado.</td></tr>';
        return;
    }
    state.feriados.forEach(f => {
        tbody.innerHTML += `
            <tr>
                <td style="padding: 8px; border-bottom: 1px solid var(--border-color);">${f.data}</td>
                <td style="padding: 8px; border-bottom: 1px solid var(--border-color);">${f.descricao}</td>
                <td style="padding: 8px; border-bottom: 1px solid var(--border-color); text-align: center;">
                    <button type="button" class="btn-icon" onclick="removerFeriado('${f.data}')" style="color: var(--danger-color);">🗑️</button>
                </td>
            </tr>
        `;
    });
}

// --- ✅ LÓGICA DE ASSINATURA E SALVAMENTO ---
function iniciarSalvamento() {
    state.jornada = document.getElementById('jornada').value;
    state.ruleExtra100Optional = document.getElementById('ruleExtra100Optional').checked;
    if (!validarHora(state.jornada)) {
        mostrarMensagem('Erro', 'Jornada de trabalho inválida.');
        return;
    }
    let temErroEmpregado = false;
    state.folhas.forEach((f, i) => {
        if (f.nome === 'Novo Empregado' || !f.empregadoId) {
            temErroEmpregado = true;
            state.abaAtivaIndex = i;
        }
    });
    if (temErroEmpregado) {
        renderizarAbas();
        mostrarMensagem('Erro', 'Selecione um empregado válido em todas as folhas antes de processar.');
        return;
    }
    document.getElementById('signatureModal').classList.add('active');
    document.getElementById('nomeResponsavel').focus();
}

function fecharModalAssinatura() {
    document.getElementById('signatureModal').classList.remove('active');
    document.getElementById('nomeResponsavel').value = '';
}

async function confirmarSalvamentoComAssinatura() {
    const responsavel = document.getElementById('nomeResponsavel').value.trim();
    if (!responsavel) {
        alert('Por favor, informe seu nome ou e-mail para registrar a alteração.');
        return;
    }
    fecharModalAssinatura();
    await processarFolhaComSalvamento(responsavel);
}

async function processarFolhaComSalvamento(nomeResponsavel) {
    mostrarMensagem('Processando', 'Calculando horas e salvando no servidor...');
    try {
        state.resultados = state.folhas.map(folha => calcularFolha(folha));
        
        // ✅ Usar UUID padrão (já existe na tabela usuarios)
        const usuarioUUID = '00000000-0000-0000-0000-000000000000';
        
        const dadosParaSalvar = state.folhas.map(folha => ({
            usuario_id: usuarioUUID,
            empresa_codigo: state.empresaSelecionada.codigo_empresa,
            nome_trabalhador: folha.nome,
            competencia: state.competencia,
            jornada: state.jornada,
            rule_extra_100_opcional: state.ruleExtra100Optional,
            dados_json: JSON.stringify(folha.dados),
            feriados_json: JSON.stringify(state.feriados),
            responsavel_alteracao: nomeResponsavel,
            status: 'processado',
            criado_por: nomeResponsavel,
            atualizado_por: nomeResponsavel,
            nome_usuario: nomeResponsavel
        }));
        
        console.log('Salvando com UUID:', usuarioUUID);
        console.log('Dados a enviar:', dadosParaSalvar[0]);
        
        const { error } = await supabaseClient.from('saves').insert(dadosParaSalvar);
        if (error) throw error;
        
        fecharModalMensagem();
        mostrarTela('resultsScreen');
        renderizarConsolidado();
        renderizarTabelasDiarias();
        mostrarMensagem('Sucesso', 'Folha de ponto processada e salva com sucesso!');
    } catch (erro) {
        console.error('Erro no processamento/salvamento:', erro);
        mostrarMensagem('Erro', 'Falha ao processar ou salvar os dados: ' + erro.message);
    }
}

// ✅ Função para gerar UUID v4 determinístico baseado no nome
function gerarUUIDDoNome(nome) {
    // Usar hash SHA-1 simulado para gerar UUID consistente
    const hash = simpleHash(nome);
    
    // Formatar como UUID v4
    const uuid = [
        hash.substring(0, 8),
        hash.substring(8, 12),
        '4' + hash.substring(13, 16),  // v4
        ((parseInt(hash.substring(16, 18), 16) & 0x3f) | 0x80).toString(16).padStart(2, '0') + hash.substring(18, 20),
        hash.substring(20, 32)
    ].join('-');
    
    return uuid;
}

// ✅ Função hash simples (determinística)
function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Converter para inteiro 32-bit
    }
    
    // Converter para string hexadecimal de 32 caracteres
    let hex = Math.abs(hash).toString(16);
    
    // Repetir o hash para preencher 32 caracteres
    while (hex.length < 32) {
        hex += Math.abs(simpleHashAux(hex)).toString(16);
    }
    
    return hex.substring(0, 32);
}

// ✅ Função auxiliar para hash
function simpleHashAux(str) {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) + hash) + str.charCodeAt(i);
    }
    return hash;
}

// Função para gerar UUID determinístico baseado no nome
function gerarUUIDDoNome(nome) {
    const NAMESPACE = '550e8400-e29b-41d4-a716-446655440000';
    const hash = simpleHash(NAMESPACE + nome);
    return `${hash.substring(0, 8)}-${hash.substring(8, 12)}-5${hash.substring(13, 16)}-a${hash.substring(17, 20)}-${hash.substring(20, 32)}`;
}

// Função hash simples
function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(32, '0');
}

// Função para gerar UUID v5 determinístico baseado no nome
function gerarUUIDDoNome(nome) {
    // Namespace UUID para SCONT
    const NAMESPACE = '550e8400-e29b-41d4-a716-446655440000';
    
    // Simular UUID v5 (SHA-1 hash do namespace + nome)
    // Para produção, use uma biblioteca como 'uuid' do npm
    const hash = simpleHash(NAMESPACE + nome);
    
    // Formatar como UUID
    return `${hash.substring(0, 8)}-${hash.substring(8, 12)}-5${hash.substring(13, 16)}-a${hash.substring(17, 20)}-${hash.substring(20, 32)}`;
}

// Função hash simples (para desenvolvimento)
function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Converter para inteiro 32-bit
    }
    return Math.abs(hash).toString(16).padStart(32, '0');
}


// --- MOTOR DE CÁLCULO ---
function calcularFolha(folha) {
    const jornadaMinutos = converterHoraParaMinutos(state.jornada);
    let totalTrabalhado = 0, totalExtra50 = 0, totalExtra100 = 0, totalNoturno = 0, totalNoturnoConvertido = 0, totalDevido = 0;
    const diasCalculados = folha.dados.map(dia => {
        const isFeriado = state.feriados.some(f => f.data === dia.data);
        const isDomingo = dia.diaSemana === 'Dom';
        const isDiaDescanso = isFeriado || isDomingo;
        const minTrabalhados = calcularHorasTrabalhadas(dia.entrada1, dia.saida1) + calcularHorasTrabalhadas(dia.entrada2, dia.saida2);
        const minNoturnos = calcularHorasNoturnas(dia.entrada1, dia.saida1, dia.entrada2, dia.saida2);
        const minNoturnosConvertidos = Math.round(minNoturnos / 0.875);
        let extra50 = 0, extra100 = 0, devido = 0;
        if (minTrabalhados > 0) {
            if (isDiaDescanso) {
                extra100 = minTrabalhados;
            } else {
                if (minTrabalhados > jornadaMinutos) {
                    const minutosExtras = minTrabalhados - jornadaMinutos;
                    if (state.ruleExtra100Optional) {
                        if (minutosExtras <= 120) extra50 = minutosExtras;
                        else { extra50 = 120; extra100 = minutosExtras - 120; }
                    } else {
                        extra50 = minutosExtras;
                    }
                } else if (minTrabalhados < jornadaMinutos) {
                    devido = jornadaMinutos - minTrabalhados;
                }
            }
        } else if (!isDiaDescanso) {
            devido = jornadaMinutos;
        }
        totalTrabalhado += minTrabalhados;
        totalExtra50 += extra50;
        totalExtra100 += extra100;
        totalNoturno += minNoturnos;
        totalNoturnoConvertido += minNoturnosConvertidos;
        totalDevido += devido;
        return {
            data: dia.data,
            diaSemana: dia.diaSemana,
            entrada1: dia.entrada1,
            saida1: dia.saida1,
            entrada2: dia.entrada2,
            saida2: dia.saida2,
            trabalhado: converterMinutosParaHora(minTrabalhados),
            extra50: converterMinutosParaHora(extra50),
            extra100: converterMinutosParaHora(extra100),
            noturno: converterMinutosParaHora(minNoturnos),
            noturnoConvertido: converterMinutosParaHora(minNoturnosConvertidos),
            devido: converterMinutosParaHora(devido)
        };
    });
    return {
        nome: folha.nome,
        empregadoId: folha.empregadoId,
        dias: diasCalculados,
        totais: {
            trabalhado: converterMinutosParaHora(totalTrabalhado),
            extra50: converterMinutosParaHora(totalExtra50),
            extra100: converterMinutosParaHora(totalExtra100),
            noturno: converterMinutosParaHora(totalNoturno),
            noturnoConvertido: converterMinutosParaHora(totalNoturnoConvertido),
            devido: converterMinutosParaHora(totalDevido)
        }
    };
}

function calcularHorasTrabalhadas(entrada, saida) {
    if (!entrada || !saida) return 0;
    let minEntrada = converterHoraParaMinutos(entrada);
    let minSaida = converterHoraParaMinutos(saida);
    if (minSaida < minEntrada) minSaida += 24 * 60;
    return minSaida - minEntrada;
}

function calcularHorasNoturnas(e1, s1, e2, s2) {
    const inicioNoturno = 22 * 60, fimNoturno = 5 * 60;
    let minNoturnos = 0;
    const calcularNoturnoIntervalo = (entrada, saida) => {
        if (!entrada || !saida) return 0;
        let minE = converterHoraParaMinutos(entrada);
        let minS = converterHoraParaMinutos(saida);
        if (minS < minE) minS += 24 * 60;
        let noturno = 0;
        if (minE < fimNoturno && minS > fimNoturno) noturno += fimNoturno - minE;
        if (minE < inicioNoturno && minS > inicioNoturno) noturno += minS - inicioNoturno;
        if (minE >= inicioNoturno || minS <= fimNoturno) {
            if (minE >= inicioNoturno) noturno += minS - minE;
            else if (minS <= fimNoturno) noturno += minS - minE;
        }
        return noturno;
    };
    minNoturnos += calcularNoturnoIntervalo(e1, s1);
    minNoturnos += calcularNoturnoIntervalo(e2, s2);
    return minNoturnos;
}

// --- RENDERIZAÇÃO DE RESULTADOS ---
function renderizarConsolidado() {
    const container = document.getElementById('consolidadoContainer');
    let html = '<h3 style="color: var(--primary-color); margin-bottom: 20px;">📊 Consolidado Geral</h3>';
    state.resultados.forEach(res => {
        html += `
            <div class="card" style="margin-bottom: 20px; padding: 0; overflow: hidden;">
                <div style="background: var(--secondary-color); color: white; padding: 10px 15px; font-weight: bold;">
                    ${res.nome}
                </div>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; padding: 15px;">
                    <div style="background: #D4EDDA; padding: 15px; border-radius: 8px; text-align: center; border: 1px solid #C3E6CB;">
                        <div style="font-size: 12px; color: #155724; text-transform: uppercase; font-weight: bold;">Trabalhado</div>
                        <div style="font-size: 24px; font-weight: bold; color: #155724; margin-top: 5px;">${res.totais.trabalhado}</div>
                    </div>
                    <div style="background: #FFF3CD; padding: 15px; border-radius: 8px; text-align: center; border: 1px solid #FFEAA7;">
                        <div style="font-size: 12px; color: #856404; text-transform: uppercase; font-weight: bold;">Extras 50%</div>
                        <div style="font-size: 24px; font-weight: bold; color: #856404; margin-top: 5px;">${res.totais.extra50}</div>
                    </div>
                    <div style="background: #F8D7DA; padding: 15px; border-radius: 8px; text-align: center; border: 1px solid #F5C6CB;">
                        <div style="font-size: 12px; color: #721C24; text-transform: uppercase; font-weight: bold;">Extras 100%</div>
                        <div style="font-size: 24px; font-weight: bold; color: #721C24; margin-top: 5px;">${res.totais.extra100}</div>
                    </div>
                    <div style="background: #D1ECF1; padding: 15px; border-radius: 8px; text-align: center; border: 1px solid #BEE5EB;">
                        <div style="font-size: 12px; color: #0C5460; text-transform: uppercase; font-weight: bold;">Adic. Noturno (Conv)</div>
                        <div style="font-size: 24px; font-weight: bold; color: #0C5460; margin-top: 5px;">${res.totais.noturnoConvertido}</div>
                    </div>
                    <div style="background: #E2E3E5; padding: 15px; border-radius: 8px; text-align: center; border: 1px solid #D6D8DB;">
                        <div style="font-size: 12px; color: #383D41; text-transform: uppercase; font-weight: bold;">Falta/Atraso</div>
                        <div style="font-size: 24px; font-weight: bold; color: #383D41; margin-top: 5px;">${res.totais.devido}</div>
                    </div>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

function renderizarTabelasDiarias() {
    const container = document.getElementById('tabelasContainer');
    let html = '<h3 style="color: var(--primary-color); margin-bottom: 20px;">📋 Detalhes Diários</h3>';
    state.resultados.forEach(res => {
        let htmlTabela = `
            <div class="card" style="margin-bottom: 20px; padding: 0; overflow: hidden;">
                <div style="background: var(--secondary-color); color: white; padding: 10px 15px; font-weight: bold;">
                    ${res.nome}
                </div>
                <div class="table-container" style="margin: 0; border: none; border-radius: 0;">
                    <table class="data-table" style="font-size: 12px;">
                        <thead>
                            <tr>
                                <th>Data</th>
                                <th>Entradas/Saídas</th>
                                <th>Trabalhado</th>
                                <th>Extra 50%</th>
                                <th>Extra 100%</th>
                                <th>Noturno</th>
                                <th>Falta/Atraso</th>
                            </tr>
                        </thead>
                        <tbody>
        `;
        res.dias.forEach(dia => {
            htmlTabela += `
                <tr>
                    <td>${dia.data}</td>
                    <td>${dia.entrada1}/${dia.saida1} ${dia.entrada2 ? '- ' + dia.entrada2 + '/' + dia.saida2 : ''}</td>
                    <td>${dia.trabalhado}</td>
                    <td>${dia.extra50}</td>
                    <td>${dia.extra100}</td>
                    <td>${dia.noturnoConvertido}</td>
                    <td>${dia.devido}</td>
                </tr>
            `;
        });
        htmlTabela += `
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        html += htmlTabela;
    });
    container.innerHTML = html;
}

// --- EXPORTAÇÃO EXCEL ---
function exportarParaExcel() {
    const wb = XLSX.utils.book_new();
    state.resultados.forEach(res => {
        const dadosDiarios = res.dias.map(dia => ({
            'Data': dia.data,
            'Entrada 1': dia.entrada1,
            'Saída 1': dia.saida1,
            'Entrada 2': dia.entrada2,
            'Saída 2': dia.saida2,
            'Trabalhado': dia.trabalhado,
            'Extra 50%': dia.extra50,
            'Extra 100%': dia.extra100,
            'Noturno (Conv)': dia.noturnoConvertido,
            'Falta/Atraso': dia.devido
        }));
        let nomeAba = res.nome.substring(0, 31).replace(/[\/?*\[\]]/g, '');
        const wsDiario = XLSX.utils.json_to_sheet(dadosDiarios);
        XLSX.utils.book_append_sheet(wb, wsDiario, nomeAba);
    });
    const compParts = state.competencia.split('/');
    const compFormatada = compParts[1] + compParts[0];
    XLSX.writeFile(wb, `Folha_Ponto_${state.empresaSelecionada.codigo_empresa}_${compFormatada}.xlsx`);
}

// --- EXPORTAÇÃO TXT ---
function abrirModalExportacaoTXT() {
    document.getElementById('exportTxtModal').classList.add('active');
    document.getElementById('exportCompetencia').value = state.competencia || '';
    document.getElementById('exportEmpresasContainer').style.display = 'none';
    document.getElementById('btnGerarTXT').style.display = 'none';
}

function fecharModalExportacaoTXT() {
    document.getElementById('exportTxtModal').classList.remove('active');
}

async function buscarEmpresasParaExportacao() {
    const comp = document.getElementById('exportCompetencia').value;
    if (!validarCompetencia(comp)) {
        mostrarMensagem('Erro', 'Competência inválida.');
        return;
    }
    try {
        const { data, error } = await supabaseClient
            .from('saves')
            .select('empresa_codigo')
            .eq('competencia', comp);
        if (error) throw error;
        const codigosUnicos = [...new Set(data.map(item => item.empresa_codigo))];
        if (codigosUnicos.length === 0) {
            mostrarMensagem('Aviso', 'Nenhum dado processado encontrado para esta competência.');
            return;
        }
        const empresasFiltradas = state.empresas.filter(emp => codigosUnicos.includes(emp.codigo_empresa));
        renderizarListaEmpresasExportacao(empresasFiltradas);
    } catch (erro) {
        console.error('Erro ao buscar empresas:', erro);
        mostrarMensagem('Erro', 'Falha ao buscar empresas com dados processados.');
    }
}

function renderizarListaEmpresasExportacao(empresas) {
    const container = document.getElementById('exportEmpresasList');
    container.innerHTML = '';
    empresas.forEach(emp => {
        container.innerHTML += `
            <div style="display: flex; align-items: center; gap: 10px; padding: 8px; border-bottom: 1px solid #eee;">
                <input type="checkbox" id="exp_emp_${emp.codigo_empresa}" value="${emp.codigo_empresa}" checked>
                <label for="exp_emp_${emp.codigo_empresa}" style="font-size: 13px; cursor: pointer; margin: 0;">${emp.codigo_empresa} - ${emp.nome_empresa}</label>
            </div>
        `;
    });
    document.getElementById('exportEmpresasContainer').style.display = 'block';
    document.getElementById('btnGerarTXT').style.display = 'block';
}

async function gerarArquivoTXT() {
    const comp = document.getElementById('exportCompetencia').value;
    const tipoProcesso = document.getElementById('exportTipoProcesso').value;
    const checkboxes = document.querySelectorAll('#exportEmpresasList input[type="checkbox"]:checked');
    const empresasSelecionadas = Array.from(checkboxes).map(cb => cb.value);
    if (empresasSelecionadas.length === 0) {
        mostrarMensagem('Erro', 'Selecione pelo menos uma empresa.');
        return;
    }
    try {
        const { data: savesData, error: errSaves } = await supabaseClient
            .from('saves')
            .select('*')
            .in('empresa_codigo', empresasSelecionadas)
            .eq('competencia', comp)
            .order('data_criacao', { ascending: false });
        if (errSaves) throw errSaves;
        const ultimasVersoes = {};
        savesData.forEach(reg => {
            const chave = `${reg.empresa_codigo}_${reg.nome_trabalhador}`;
            if (!ultimasVersoes[chave]) ultimasVersoes[chave] = reg;
        });
        const { data: empregadosData, error: errEmpregados } = await supabaseClient
            .from('empregados')
            .select('codigo_empresa, codigo_empregado, nome_empregado')
            .in('codigo_empresa', empresasSelecionadas);
        if (errEmpregados) throw errEmpregados;
        let conteudoTXT = '';
        const fixo = "10";
        const compParts = comp.split('/');
        const compFormatada = compParts[1] + compParts[0];
        const tipoProcFormatado = String(tipoProcesso).padStart(2, '0');
        Object.values(ultimasVersoes).forEach(save => {
            const empCodigo = save.empresa_codigo;
            const nomeTrab = save.nome_trabalhador;
            const empregadoInfo = empregadosData.find(e => e.codigo_empresa === empCodigo && e.nome_empregado === nomeTrab);
            if (!empregadoInfo) return;
            const codEmpregadoFormatado = String(empregadoInfo.codigo_empregado).padStart(10, '0');
            const codEmpresaFormatada = String(empCodigo).padStart(10, '0');
            const folhaTemp = { nome: nomeTrab, empregadoId: empregadoInfo.codigo_empregado, dados: JSON.parse(save.dados_json) };
            const stateTemp = { jornada: save.jornada, ruleExtra100Optional: save.rule_extra_100_opcional, feriados: JSON.parse(save.feriados_json) };
            const jornadaMinutos = converterHoraParaMinutos(stateTemp.jornada);
            let tTrab = 0, tEx50 = 0, tEx100 = 0, tNot = 0, tDev = 0;
            folhaTemp.dados.forEach(dia => {
                const isFeriado = stateTemp.feriados.some(f => f.data === dia.data);
                const isDomingo = dia.diaSemana === 'Dom';
                const isDiaDescanso = isFeriado || isDomingo;
                const minTrab = calcularHorasTrabalhadas(dia.entrada1, dia.saida1) + calcularHorasTrabalhadas(dia.entrada2, dia.saida2);
                const minNot = calcularHorasNoturnas(dia.entrada1, dia.saida1, dia.entrada2, dia.saida2);
                let ex50 = 0, ex100 = 0, dev = 0;
                if (minTrab > 0) {
                    if (isDiaDescanso) {
                        ex100 = minTrab;
                    } else {
                        if (minTrab > jornadaMinutos) {
                            const minEx = minTrab - jornadaMinutos;
                            if (stateTemp.ruleExtra100Optional) {
                                if (minEx <= 120) ex50 = minEx;
                                else { ex50 = 120; ex100 = minEx - 120; }
                            } else {
                                ex50 = minEx;
                            }
                        } else if (minTrab < jornadaMinutos) {
                            dev = jornadaMinutos - minTrab;
                        }
                    }
                } else if (!isDiaDescanso) {
                    dev = jornadaMinutos;
                }
                tTrab += minTrab;
                tEx50 += ex50;
                tEx100 += ex100;
                tNot += minNot;
                tDev += dev;
            });
            const gerarLinha = (eventoNome, valorMinutos) => {
                if (valorMinutos <= 0) return;
                const horasDecimais = (valorMinutos / 60).toFixed(2);
                const valorLimpo = horasDecimais.replace('.', '');
                const valFormatado = String(valorLimpo).padStart(9, '0');
                conteudoTXT += `${fixo}${codEmpregadoFormatado}${compFormatada}0000000000${tipoProcFormatado}${valFormatado}${codEmpresaFormatada}\n`;
            };
            gerarLinha('horasTrabalhadas', tTrab);
            gerarLinha('horasExtras50', tEx50);
            gerarLinha('horasExtras100', tEx100);
            gerarLinha('horasNoturnaConvertida', tNot);
            gerarLinha('horasDevidas', tDev);
        });
        if (!conteudoTXT) {
            mostrarMensagem('Aviso', 'Nenhum dado gerado.');
            return;
        }
        const blob = new Blob([conteudoTXT], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Exportacao_Folha_${compFormatada}_${Date.now()}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        fecharModalExportacaoTXT();
        mostrarMensagem('Sucesso', 'Arquivo TXT gerado e baixado com sucesso!');
    } catch (erro) {
        console.error('Erro ao gerar TXT:', erro);
        mostrarMensagem('Erro', 'Falha ao gerar o arquivo TXT: ' + erro.message);
    }
}

// --- NAVEGAÇÃO E UTILITÁRIOS ---
function mostrarTela(telaId) {
    document.getElementById('selectionScreen').style.display = 'none';
    document.getElementById('mainScreen').style.display = 'none';
    document.getElementById('resultsScreen').style.display = 'none';
    document.getElementById(telaId).style.display = 'block';
}

function voltarParaEdicao() {
    mostrarTela('mainScreen');
}

function mostrarMensagem(titulo, mensagem) {
    document.getElementById('messageTitle').textContent = titulo;
    document.getElementById('messageText').textContent = mensagem;
    document.getElementById('messageModal').classList.add('active');
}

function fecharModalMensagem() {
    document.getElementById('messageModal').classList.remove('active');
}

let confirmCallback = null;
function mostrarConfirmacao(titulo, mensagem, callback) {
    document.getElementById('confirmTitle').textContent = titulo;
    document.getElementById('confirmMessage').textContent = mensagem;
    confirmCallback = callback;
    document.getElementById('confirmModal').classList.add('active');
}

function confirmarAcao() {
    document.getElementById('confirmModal').classList.remove('active');
    if (confirmCallback) confirmCallback();
}

function fecharModalConfirmacao() {
    document.getElementById('confirmModal').classList.remove('active');
    confirmCallback = null;
}

// --- FORMATADORES ---
function formatarCompetencia(valor) {
    let v = valor.replace(/\D/g, '');
    if (v.length >= 2) v = v.substring(0, 2) + '/' + v.substring(2, 6);
    return v;
}

function formatarHora(valor) {
    let v = valor.replace(/\D/g, '');
    if (v.length >= 2) v = v.substring(0, 2) + ':' + v.substring(2, 4);
    return v;
}

function formatarData(valor) {
    let v = valor.replace(/\D/g, '');
    if (v.length >= 2) v = v.substring(0, 2) + '/' + v.substring(2);
    if (v.length >= 5) v = v.substring(0, 5) + '/' + v.substring(5, 9);
    return v;
}

function validarCompetencia(competencia) {
    return /^(0[1-9]|1[0-2])\/\d{4}$/.test(competencia);
}

function validarHora(hora) {
    if (!hora) return true;
    const regex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    return regex.test(hora);
}

function validarData(data) {
    return /^(0[1-9]|[12]\d|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/.test(data);
}

function converterHoraParaMinutos(hora) {
    if (!hora) return 0;
    const [h, m] = hora.split(':').map(Number);
    return (h * 60) + m;
}

function converterMinutosParaHora(minutos) {
    if (minutos === 0) return '00:00';
    const h = Math.floor(minutos / 60);
    const m = minutos % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function gerarDiasDoMes(competencia) {
    if (!competencia) return [];
    const [mes, ano] = competencia.split('/');
    const mesInt = parseInt(mes);
    const anoInt = parseInt(ano);
    const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
    const mesStr = String(mesInt).padStart(2, '0');
    const anoStr = String(anoInt);
    const ultimoDia = new Date(anoInt, mesInt, 0).getDate();
    const dias = [];
    for (let i = 1; i <= ultimoDia; i++) {
        const data = new Date(anoInt, mesInt - 1, i);
        dias.push({
            data: `${String(i).padStart(2, '0')}/${mesStr}/${anoStr}`,
            diaSemana: diasSemana[data.getDay()],
            entrada1: '',
            saida1: '',
            entrada2: '',
            saida2: ''
        });
    }
    return dias;
}