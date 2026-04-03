/**
 * SCONT - Sistema de Gestão de Ponto
 * Arquivo: admin.js
 * Descrição: Administração de Empresas e Empregados
 */

// ============================================
// CONFIGURAÇÃO SUPABASE
// ============================================
const SUPABASE_URL = 'https://udnikmolgryzczalcbbz.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkbmlrbW9sZ3J5emN6YWxjYmJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxNDQzNTUsImV4cCI6MjA5MDcyMDM1NX0.9vCwDkmxhrLAc-UxKpUxiVHF0BBh8OIdGZPKpTWu-lI';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ============================================
// INICIALIZAÇÃO
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Inicializando administração...');
    
    const { data: { user } } = await supabaseClient.auth.getUser();
    
    if (!user) {
        window.location.href = './ponto_eletronico.html';
        return;
    }
    
    carregarEmpresas();
    carregarEmpregados();
    configurarUpload();
});

// ============================================
// NAVEGAÇÃO DE ABAS
// ============================================
function abrirAba(abaId) {
    document.querySelectorAll('.admin-tab-content').forEach(aba => {
        aba.classList.remove('active');
    });
    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    document.getElementById(abaId).classList.add('active');
    event.target.classList.add('active');
}

// ============================================
// EMPRESAS
// ============================================

async function carregarEmpresas() {
    try {
        const { data, error } = await supabaseClient
            .from('empresas')
            .select('*')
            .order('data_criacao', { ascending: false });
        
        if (error) throw error;
        
        renderizarTabelaEmpresas(data || []);
        atualizarSelectEmpresas(data || []);
        
    } catch (erro) {
        console.error('❌ Erro ao carregar empresas:', erro);
        mostrarMensagem('Erro', 'Erro ao carregar empresas.');
    }
}

function renderizarTabelaEmpresas(empresas) {
    const tbody = document.getElementById('empresasTableBody');
    tbody.innerHTML = '';
    
    if (empresas.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #95A5A6;">Nenhuma empresa cadastrada</td></tr>';
        return;
    }
    
    empresas.forEach(empresa => {
        const dataCriacao = new Date(empresa.data_criacao).toLocaleDateString('pt-BR');
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${empresa.codigo_empresa}</strong></td>
            <td>${empresa.nome_empresa}</td>
            <td>${dataCriacao}</td>
            <td>
                <button type="button" class="btn-edit" onclick="editarEmpresa('${empresa.codigo_empresa}')">Editar</button>
                <button type="button" class="btn-delete" onclick="deletarEmpresa('${empresa.codigo_empresa}')">Deletar</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function atualizarSelectEmpresas(empresas) {
    const select = document.getElementById('empresaSelect');
    const opcaoAtual = select.value;
    
    select.innerHTML = '<option value="">Selecione uma empresa...</option>';
    
    empresas.forEach(empresa => {
        const option = document.createElement('option');
        option.value = empresa.codigo_empresa;
        option.textContent = `${empresa.codigo_empresa} - ${empresa.nome_empresa}`;
        select.appendChild(option);
    });
    
    select.value = opcaoAtual;
}

async function adicionarEmpresa() {
    const codigo = document.getElementById('codigoEmpresa').value.trim();
    const nome = document.getElementById('nomeEmpresa').value.trim();
    
    if (!codigo || !nome) {
        mostrarStatus('statusEmpresas', 'Preencha todos os campos', 'error');
        return;
    }
    
    try {
        const { error } = await supabaseClient
            .from('empresas')
            .insert([{
                codigo_empresa: codigo,
                nome_empresa: nome
            }]);
        
        if (error) throw error;
        
        document.getElementById('codigoEmpresa').value = '';
        document.getElementById('nomeEmpresa').value = '';
        
        mostrarStatus('statusEmpresas', '✅ Empresa adicionada com sucesso!', 'success');
        carregarEmpresas();
        
    } catch (erro) {
        console.error('❌ Erro:', erro);
        mostrarStatus('statusEmpresas', 'Erro ao adicionar empresa: ' + erro.message, 'error');
    }
}

async function deletarEmpresa(codigo) {
    if (!confirm('Tem certeza que deseja deletar esta empresa?')) {
        return;
    }
    
    try {
        const { error } = await supabaseClient
            .from('empresas')
            .delete()
            .eq('codigo_empresa', codigo);
        
        if (error) throw error;
        
        mostrarStatus('statusEmpresas', '✅ Empresa deletada com sucesso!', 'success');
        carregarEmpresas();
        
    } catch (erro) {
        console.error('❌ Erro:', erro);
        mostrarStatus('statusEmpresas', 'Erro ao deletar empresa: ' + erro.message, 'error');
    }
}

function editarEmpresa(codigo) {
    mostrarMensagem('Editar Empresa', 'Funcionalidade em desenvolvimento');
}

// ============================================
// EMPREGADOS
// ============================================

async function carregarEmpregados() {
    try {
        const { data, error } = await supabaseClient
            .from('empregados')
            .select('*')
            .order('data_criacao', { ascending: false });
        
        if (error) throw error;
        
        renderizarTabelaEmpregados(data || []);
        
    } catch (erro) {
        console.error('❌ Erro ao carregar empregados:', erro);
        mostrarMensagem('Erro', 'Erro ao carregar empregados.');
    }
}

function renderizarTabelaEmpregados(empregados) {
    const tbody = document.getElementById('empregadosTableBody');
    tbody.innerHTML = '';
    
    if (empregados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #95A5A6;">Nenhum empregado cadastrado</td></tr>';
        return;
    }
    
    empregados.forEach(empregado => {
        const dataCriacao = new Date(empregado.data_criacao).toLocaleDateString('pt-BR');
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${empregado.codigo_empresa}</strong></td>
            <td>${empregado.codigo_empregado}</td>
            <td>${empregado.nome_empregado}</td>
            <td>${dataCriacao}</td>
            <td>
                <button type="button" class="btn-edit" onclick="editarEmpregado('${empregado.id}')">Editar</button>
                <button type="button" class="btn-delete" onclick="deletarEmpregado(${empregado.id})">Deletar</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function atualizarSelectEmpresa() {
    // Função para atualizar select quando empresa é selecionada
}

async function adicionarEmpregado() {
    const codigoEmpresa = document.getElementById('empresaSelect').value;
    const codigoEmpregado = document.getElementById('codigoEmpregado').value.trim();
    const nomeEmpregado = document.getElementById('nomeEmpregado').value.trim();
    
    if (!codigoEmpresa || !codigoEmpregado || !nomeEmpregado) {
        mostrarStatus('statusEmpregados', 'Preencha todos os campos', 'error');
        return;
    }
    
    try {
        const { error } = await supabaseClient
            .from('empregados')
            .insert([{
                codigo_empresa: codigoEmpresa,
                codigo_empregado: codigoEmpregado,
                nome_empregado: nomeEmpregado
            }]);
        
        if (error) throw error;
        
        document.getElementById('codigoEmpregado').value = '';
        document.getElementById('nomeEmpregado').value = '';
        
        mostrarStatus('statusEmpregados', '✅ Empregado adicionado com sucesso!', 'success');
        carregarEmpregados();
        
    } catch (erro) {
        console.error('❌ Erro:', erro);
        mostrarStatus('statusEmpregados', 'Erro ao adicionar empregado: ' + erro.message, 'error');
    }
}

async function deletarEmpregado(id) {
    if (!confirm('Tem certeza que deseja deletar este empregado?')) {
        return;
    }
    
    try {
        const { error } = await supabaseClient
            .from('empregados')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
        
        mostrarStatus('statusEmpregados', '✅ Empregado deletado com sucesso!', 'success');
        carregarEmpregados();
        
    } catch (erro) {
        console.error('❌ Erro:', erro);
        mostrarStatus('statusEmpregados', 'Erro ao deletar empregado: ' + erro.message, 'error');
    }
}

function editarEmpregado(id) {
    mostrarMensagem('Editar Empregado', 'Funcionalidade em desenvolvimento');
}

// ============================================
// IMPORTAÇÃO DE ARQUIVO
// ============================================

function configurarUpload() {
    const uploadArea = document.getElementById('uploadArea');
    
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            processarArquivo(files[0]);
        }
    });
}

function handleFileSelect(event) {
    const files = event.target.files;
    if (files.length > 0) {
        processarArquivo(files[0]);
    }
}

async function processarArquivo(file) {
    try {
        console.log('📥 Processando arquivo:', file.name);
        
        mostrarStatus('statusImportar', 'Lendo arquivo...', 'info');
        document.getElementById('importProgress').style.display = 'block';
        
        const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
        
        // Processar aba de empresas
        const empresasSheet = workbook.Sheets['Empresas'];
        if (!empresasSheet) {
            throw new Error('Aba "Empresas" não encontrada na planilha');
        }
        
        const empresasData = XLSX.utils.sheet_to_json(empresasSheet, {
            header: ['codigo_empresa', 'nome_empresa'],
            defval: ''
        }).filter(row => row.codigo_empresa && row.nome_empresa);
        
        // Processar aba de empregados
        const empregadosSheet = workbook.Sheets['Empregados'];
        if (!empregadosSheet) {
            throw new Error('Aba "Empregados" não encontrada na planilha');
        }
        
        const empregadosData = XLSX.utils.sheet_to_json(empregadosSheet, {
            header: ['codigo_empresa', 'codigo_empregado', 'nome_empregado'],
            defval: ''
        }).filter(row => row.codigo_empresa && row.codigo_empregado && row.nome_empregado);
        
        console.log('📊 Empresas encontradas:', empresasData.length);
        console.log('👥 Empregados encontrados:', empregadosData.length);
        
        // Limpar dados existentes
        mostrarStatus('statusImportar', 'Limpando dados existentes...', 'info');
        document.getElementById('progressBar').style.width = '25%';
        
        await supabaseClient.from('empregados').delete().neq('id', 0);
        await supabaseClient.from('empresas').delete().neq('id', 0);
        
        // Inserir empresas
        mostrarStatus('statusImportar', 'Importando empresas...', 'info');
        document.getElementById('progressBar').style.width = '50%';
        
        if (empresasData.length > 0) {
            const { error: empresasError } = await supabaseClient
                .from('empresas')
                .insert(empresasData);
            
            if (empresasError) throw empresasError;
        }
        
        // Inserir empregados
        mostrarStatus('statusImportar', 'Importando empregados...', 'info');
        document.getElementById('progressBar').style.width = '75%');
        
        if (empregadosData.length > 0) {
            const { error: empregadosError } = await supabaseClient
                .from('empregados')
                .insert(empregadosData);
            
            if (empregadosError) throw empregadosError;
        }
        
        document.getElementById('progressBar').style.width = '100%');
        
        setTimeout(() => {
            document.getElementById('importProgress').style.display = 'none';
            mostrarStatus('statusImportar', `✅ Importação concluída com sucesso!\n${empresasData.length} empresas e ${empregadosData.length} empregados importados.`, 'success');
            
            carregarEmpresas();
            carregarEmpregados();
            
            document.getElementById('fileInput').value = '';
        }, 1000);
        
    } catch (erro) {
        console.error('❌ Erro ao processar arquivo:', erro);
        document.getElementById('importProgress').style.display = 'none';
        mostrarStatus('statusImportar', 'Erro ao importar: ' + erro.message, 'error');
    }
}

// ============================================
// UTILITÁRIOS
// ============================================

function mostrarStatus(elementId, mensagem, tipo) {
    const element = document.getElementById(elementId);
    element.textContent = mensagem;
    element.className = 'status-message ' + tipo;
}

function mostrarMensagem(titulo, mensagem) {
    document.getElementById('messageTitle').textContent = titulo;
    document.getElementById('messageText').textContent = mensagem;
    document.getElementById('messageModal').classList.add('active');
}

function fecharModalMensagem() {
    document.getElementById('messageModal').classList.remove('active');
}

function voltarParaPonto() {
    window.location.href = './ponto_eletronico.html';
}