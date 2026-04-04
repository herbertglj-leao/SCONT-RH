/**
 * SCONT - Lançamentos em Lote
 * Arquivo: lancamentos.js
 */

const SUPABASE_URL = 'https://udnikmolgryzczalcbbz.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkbmlrbW9sZ3J5emN6YWxjYmJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxNDQzNTUsImV4cCI6MjA5MDcyMDM1NX0.9vCwDkmxhrLAc-UxKpUxiVHF0BBh8OIdGZPKpTWu-lI';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let conteudoTXTGerado = ''; // Armazena o conteúdo final para download

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Verificar Autenticação
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
        window.location.href = './index.html';
        return;
    }

    // 2. Formatar input de competência
    document.getElementById('lanCompetencia').addEventListener('input', (e) => {
        let v = e.target.value.replace(/\D/g, '');
        if (v.length >= 2) v = v.substring(0, 2) + '/' + v.substring(2, 6);
        e.target.value = v;
    });

    // 3. Carregar Empresas Iniciais
    carregarEmpresas();
});

// --- FUNÇÕES DE INTERFACE ---

function mostrarMensagem(titulo, mensagem) {
    document.getElementById('messageTitle').textContent = titulo;
    document.getElementById('messageText').textContent = mensagem;
    document.getElementById('messageModal').classList.add('active');
}
function fecharModalMensagem() { document.getElementById('messageModal').classList.remove('active'); }

function selecionarTodos(containerId, selecionar) {
    const checkboxes = document.querySelectorAll(`#${containerId} input[type="checkbox"]`);
    checkboxes.forEach(cb => cb.checked = selecionar);
}

function formatarMoeda(input) {
    let valor = input.value.replace(/\D/g, '');
    if (valor === '') { input.value = ''; return; }
    valor = (parseInt(valor) / 100).toFixed(2);
    input.value = valor;
}

function ativarStep(stepId) {
    const step = document.getElementById(stepId);
    step.style.display = 'block';
    step.style.opacity = '1';
    step.style.pointerEvents = 'auto';
    step.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// --- LÓGICA DE DADOS ---

async function carregarEmpresas() {
    try {
        const { data, error } = await supabaseClient.from('empresas').select('codigo_empresa, nome_empresa').order('nome_empresa', { ascending: true });
        if (error) throw error;
        
        const container = document.getElementById('listaEmpresas');
        container.innerHTML = '';
        
        if (!data || data.length === 0) {
            container.innerHTML = '<div style="padding: 10px; color: red;">Nenhuma empresa cadastrada.</div>';
            return;
        }

        data.forEach(emp => {
            container.innerHTML += `
                <div class="checkbox-item">
                    <input type="checkbox" id="emp_${emp.codigo_empresa}" value="${emp.codigo_empresa}" data-nome="${emp.nome_empresa}">
                    <label for="emp_${emp.codigo_empresa}">${emp.codigo_empresa} - ${emp.nome_empresa}</label>
                </div>
            `;
        });
    } catch (erro) {
        mostrarMensagem('Erro', 'Falha ao carregar empresas.');
    }
}

async function buscarEmpregados() {
    const competencia = document.getElementById('lanCompetencia').value;
    if (!/^(0[1-9]|1[0-2])\/\d{4}$/.test(competencia)) {
        mostrarMensagem('Erro', 'Informe uma competência válida (MM/AAAA).'); return;
    }

    const empresasSelecionadas = Array.from(document.querySelectorAll('#listaEmpresas input:checked')).map(cb => cb.value);
    if (empresasSelecionadas.length === 0) {
        mostrarMensagem('Erro', 'Selecione pelo menos uma empresa.'); return;
    }

    try {
        const { data, error } = await supabaseClient
            .from('empregados')
            .select('codigo_empresa, codigo_empregado, nome_empregado')
            .in('codigo_empresa', empresasSelecionadas)
            .order('codigo_empresa', { ascending: true })
            .order('nome_empregado', { ascending: true });

        if (error) throw error;

        const container = document.getElementById('listaEmpregados');
        container.innerHTML = '';

        if (!data || data.length === 0) {
            container.innerHTML = '<div style="padding: 10px; color: red;">Nenhum empregado encontrado para as empresas selecionadas.</div>';
            return;
        }

        data.forEach(emp => {
            container.innerHTML += `
                <div class="checkbox-item">
                    <input type="checkbox" id="func_${emp.codigo_empregado}" value="${emp.codigo_empregado}" data-empresa="${emp.codigo_empresa}">
                    <label for="func_${emp.codigo_empregado}">[Empresa ${emp.codigo_empresa}] ${emp.codigo_empregado} - ${emp.nome_empregado}</label>
                </div>
            `;
        });

        ativarStep('step2');

    } catch (erro) {
        mostrarMensagem('Erro', 'Falha ao buscar empregados.');
    }
}

function avancarParaParametros() {
    const empregadosSelecionados = document.querySelectorAll('#listaEmpregados input:checked');
    if (empregadosSelecionados.length === 0) {
        mostrarMensagem('Erro', 'Selecione pelo menos um empregado.'); return;
    }
    ativarStep('step3');
}

// --- GERAÇÃO DO TXT ---

function gerarPrevia() {
    const competenciaRaw = document.getElementById('lanCompetencia').value;
    const tipoProcesso = document.getElementById('lanTipoProcesso').value;
    const rubrica = document.getElementById('lanRubrica').value;
    const valorRaw = document.getElementById('lanValor').value;
    const empregadosSelecionados = document.querySelectorAll('#listaEmpregados input:checked');

    // Validações
    if (!tipoProcesso) { mostrarMensagem('Erro', 'Selecione o Tipo do Processo.'); return; }
    if (!rubrica) { mostrarMensagem('Erro', 'Informe o Código da Rubrica.'); return; }
    if (!valorRaw || parseFloat(valorRaw) <= 0) { mostrarMensagem('Erro', 'Informe um valor válido maior que zero.'); return; }

    // Formatações Layout Rigoroso
    const compParts = competenciaRaw.split('/');
    const compFormatada = compParts[1] + compParts[0]; // AAAAMM
    
    const fixo = "10";
    const rubFormatada = String(rubrica).padStart(9, '0');
    const tipoProcFormatado = String(tipoProcesso).padStart(2, '0');
    
    // Valor: Remove ponto/vírgula e preenche com zeros (ex: 150.50 -> 15050 -> 000015050)
    const valorLimpo = valorRaw.replace(/\D/g, '');
    const valFormatado = String(valorLimpo).padStart(9, '0');

    conteudoTXTGerado = '';
    let previaHTML = '';

    empregadosSelecionados.forEach(cb => {
        const codEmpregado = cb.value;
        const codEmpresa = cb.getAttribute('data-empresa');

        const empFormatado = String(codEmpregado).padStart(10, '0');
        const empresaFormatada = String(codEmpresa).padStart(10, '0');

        // Montagem da Linha
        const linha = `${fixo}${empFormatado}${compFormatada}${rubFormatada}${tipoProcFormatado}${valFormatado}${empresaFormatada}`;
        
        conteudoTXTGerado += linha + '\n';
        previaHTML += linha + '\n';
    });

    document.getElementById('previaTxt').textContent = previaHTML;
    ativarStep('step4');
}

function voltarParaEdicao() {
    document.getElementById('step4').style.display = 'none';
    document.getElementById('step3').scrollIntoView({ behavior: 'smooth' });
}

function baixarTXT() {
    if (!conteudoTXTGerado) {
        mostrarMensagem('Erro', 'Nenhum conteúdo gerado para exportação.'); return;
    }

    const competenciaRaw = document.getElementById('lanCompetencia').value;
    const compFormatada = competenciaRaw.split('/')[1] + competenciaRaw.split('/')[0];

    const blob = new Blob([conteudoTXTGerado], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Lancamentos_Lote_${compFormatada}_${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    mostrarMensagem('Sucesso', 'Arquivo TXT baixado com sucesso!');
}