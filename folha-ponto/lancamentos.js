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

// --- FUNÇÕES DE INTERFACE E UTILITÁRIOS ---

function mostrarMensagem(titulo, mensagem) {
    document.getElementById('messageTitle').textContent = titulo;
    document.getElementById('messageText').textContent = mensagem;
    document.getElementById('messageModal').classList.add('active');
}

function fecharModalMensagem() { 
    document.getElementById('messageModal').classList.remove('active'); 
}

function ativarStep(stepId) {
    const step = document.getElementById(stepId);
    step.style.display = 'block';
    step.style.opacity = '1';
    step.style.pointerEvents = 'auto';
    step.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Filtra as listas de checkboxes em tempo real
function filtrarLista(inputId, listId) {
    const input = document.getElementById(inputId);
    const filter = input.value.toLowerCase();
    const container = document.getElementById(listId);
    const items = container.getElementsByClassName('checkbox-item');

    for (let i = 0; i < items.length; i++) {
        const label = items[i].getElementsByTagName('label')[0];
        if (label) {
            const textValue = label.textContent || label.innerText;
            if (textValue.toLowerCase().indexOf(filter) > -1) {
                items[i].style.display = "";
            } else {
                items[i].style.display = "none";
            }
        }
    }
}

// Seleciona apenas os checkboxes que estão visíveis (não filtrados)
function selecionarTodos(containerId, selecionar) {
    const container = document.getElementById(containerId);
    const items = container.getElementsByClassName('checkbox-item');
    
    for (let i = 0; i < items.length; i++) {
        // Verifica se o item não está oculto pelo filtro
        if (items[i].style.display !== "none") {
            const checkbox = items[i].querySelector('input[type="checkbox"]');
            if (checkbox) {
                checkbox.checked = selecionar;
            }
        }
    }
}

// --- LÓGICA DE DADOS (SUPABASE) ---

async function carregarEmpresas() {
    try {
        const { data, error } = await supabaseClient
            .from('empresas')
            .select('codigo_empresa, nome_empresa')
            .order('nome_empresa', { ascending: true });
            
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
        document.getElementById('buscaEmpregado').value = ''; // Limpa a busca anterior

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
    
    // Valida se é um número inteiro maior que zero
    if (!valorRaw || parseInt(valorRaw) <= 0) { 
        mostrarMensagem('Erro', 'Informe um valor numérico inteiro maior que zero.'); 
        return; 
    }

    // Formatações Layout Rigoroso
    const compParts = competenciaRaw.split('/');
    const compFormatada = compParts[1] + compParts[0]; // AAAAMM
    
    const fixo = "10";
    const rubFormatada = String(rubrica).padStart(9, '0');
    const tipoProcFormatado = String(tipoProcesso).padStart(2, '0');
    
    // O valor já vem limpo do HTML (apenas dígitos), basta preencher com zeros
    const valFormatado = String(valorRaw).padStart(9, '0');

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