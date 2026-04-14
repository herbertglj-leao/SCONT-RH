// ============================================
// MÓDULO DE AUTENTICAÇÃO E GESTÃO DE USUÁRIOS
// ============================================

/**
 * Módulo Usuario
 * Gerencia autenticação, registro, login e operações de usuário
 * 
 * @module usuario
 * @requires app.js (Estado global da aplicação)
 */

// ============================================
// CONSTANTES E CONFIGURAÇÃO
// ============================================

const USUARIO_CONFIG = {
    API_BASE_URL: 'http://localhost:8080/api',
    TOKEN_KEY: 'auth_token',
    USER_KEY: 'current_user',
    REFRESH_TOKEN_KEY: 'refresh_token',
    TOKEN_EXPIRY_KEY: 'token_expiry',
    SESSION_TIMEOUT: 24 * 60 * 60 * 1000, // 24 horas em ms
    PASSWORD_MIN_LENGTH: 8,
    PASSWORD_REGEX: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
};

// ============================================
// ESTADO DO USUÁRIO
// ============================================

let usuarioState = {
    autenticado: false,
    usuario: null,
    token: null,
    refreshToken: null,
    tokenExpiry: null,
    carregando: false,
    erro: null,
    ultimaAtividade: Date.now()
};

// ============================================
// INICIALIZAÇÃO
// ============================================

/**
 * Inicializa o módulo de usuário
 * Verifica se há token salvo e valida a sessão
 */
function inicializarUsuario() {
    console.log('[USUARIO] Inicializando módulo de autenticação...');
    
    const token = obterToken();
    const usuario = obterUsuarioSalvo();
    
    if (token && usuario) {
        usuarioState.autenticado = true;
        usuarioState.usuario = usuario;
        usuarioState.token = token;
        
        // Validar token com backend
        validarTokenComBackend();
        
        // Configurar auto-logout por inatividade
        configurarTimeoutSessao();
        
        console.log('[USUARIO] Sessão restaurada para:', usuario.email);
    } else {
        redirecionarParaLogin();
    }
}

/**
 * Configura timeout de sessão por inatividade
 */
function configurarTimeoutSessao() {
    document.addEventListener('mousemove', resetarTimeoutSessao);
    document.addEventListener('keypress', resetarTimeoutSessao);
    document.addEventListener('click', resetarTimeoutSessao);
    
    // Verificar inatividade a cada 5 minutos
    setInterval(verificarInatividade, 5 * 60 * 1000);
}

/**
 * Reseta o timer de inatividade
 */
function resetarTimeoutSessao() {
    usuarioState.ultimaAtividade = Date.now();
}

/**
 * Verifica se a sessão expirou por inatividade
 */
function verificarInatividade() {
    const tempoInativo = Date.now() - usuarioState.ultimaAtividade;
    
    if (tempoInativo > USUARIO_CONFIG.SESSION_TIMEOUT) {
        console.warn('[USUARIO] Sessão expirada por inatividade');
        logout('Sua sessão expirou por inatividade. Faça login novamente.');
    }
}

// ============================================
// LOGIN
// ============================================

/**
 * Realiza login do usuário
 * @param {string} email - Email do usuário
 * @param {string} senha - Senha do usuário
 * @returns {Promise<Object>} Dados do usuário autenticado
 */
/**
 * Realiza login do usuário (VERSÃO SIMULADA PARA TESTES FRONTEND)
 */
async function login(email, senha) {
    try {
        usuarioState.carregando = true;
        usuarioState.erro = null;
        
        // Validar entrada
        if (!validarEmail(email)) {
            throw new Error('Email inválido');
        }
        
        if (!senha || senha.length < 3) {
            throw new Error('Senha inválida');
        }
        
        console.log('[USUARIO] Simulando login para:', email);
        
        // SIMULAÇÃO DE ESPERA DA REDE (1 segundo)
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // DADOS FALSOS DE SUCESSO (Mock)
        const dadosMock = {
            token: "token_falso_para_testes_12345",
            refreshToken: "refresh_falso_67890",
            expiresIn: 86400,
            usuario: {
                id: "user-123",
                nome: "Administrador Teste",
                email: email,
                papel: "ADMIN",
                permissoes: ["ALL"]
            }
        };
        
        // Salvar credenciais
        salvarToken(dadosMock.token);
        salvarRefreshToken(dadosMock.refreshToken);
        salvarUsuario(dadosMock.usuario);
        
        usuarioState.autenticado = true;
        usuarioState.usuario = dadosMock.usuario;
        usuarioState.token = dadosMock.token;
        
        console.log('[USUARIO] Login simulado com sucesso!');
        
        return dadosMock.usuario;
        
    } catch (erro) {
        usuarioState.erro = erro.message;
        console.error('[USUARIO] Erro no login:', erro);
        throw erro;
    } finally {
        usuarioState.carregando = false;
    }
}

// ============================================
// REGISTRO
// ============================================

/**
 * Registra novo usuário
 * @param {Object} dados - Dados do novo usuário
 * @returns {Promise<Object>} Dados do usuário criado
 */
async function registrar(dados) {
    try {
        usuarioState.carregando = true;
        usuarioState.erro = null;
        
        // Validar dados
        const errosValidacao = validarDadosRegistro(dados);
        if (errosValidacao.length > 0) {
            throw new Error(errosValidacao.join(', '));
        }
        
        console.log('[USUARIO] Registrando novo usuário:', dados.email);
        
        const response = await fetch(`${USUARIO_CONFIG.API_BASE_URL}/auth/registrar`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: dados.email.toLowerCase().trim(),
                nome: dados.nome.trim(),
                senha: dados.senha,
                confirmacaoSenha: dados.confirmacaoSenha
            })
        });
        
        if (!response.ok) {
            const erro = await response.json();
            throw new Error(erro.mensagem || 'Erro ao registrar usuário');
        }
        
        const usuarioCriado = await response.json();
        
        console.log('[USUARIO] Usuário registrado com sucesso:', dados.email);
        
        // Disparar evento
        dispararEventoUsuario('registro', usuarioCriado);
        
        return usuarioCriado;
        
    } catch (erro) {
        usuarioState.erro = erro.message;
        console.error('[USUARIO] Erro no registro:', erro);
        throw erro;
    } finally {
        usuarioState.carregando = false;
    }
}

// ============================================
// LOGOUT
// ============================================

/**
 * Realiza logout do usuário
 * @param {string} mensagem - Mensagem opcional para exibir
 */
async function logout(mensagem = null) {
    try {
        console.log('[USUARIO] Realizando logout...');
        
        // Notificar backend
        if (usuarioState.token) {
            try {
                await fetch(`${USUARIO_CONFIG.API_BASE_URL}/auth/logout`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${usuarioState.token}`
                    }
                });
            } catch (erro) {
                console.warn('[USUARIO] Erro ao notificar logout no backend:', erro);
            }
        }
        
        // Limpar estado
        limparSessao();
        
        // Disparar evento
        dispararEventoUsuario('logout', null);
        
        // Redirecionar
        if (mensagem) {
            mostrarNotificacao(mensagem, 'info');
        }
        
        redirecionarParaLogin();
        
    } catch (erro) {
        console.error('[USUARIO] Erro no logout:', erro);
        redirecionarParaLogin();
    }
}

// ============================================
// VALIDAÇÃO DE TOKEN
// ============================================

/**
 * Valida o token com o backend
 * @returns {Promise<boolean>} True se token é válido
 */
async function validarTokenComBackend() {
    try {
        const token = obterToken();
        
        if (!token) {
            return false;
        }
        
        const response = await fetch(`${USUARIO_CONFIG.API_BASE_URL}/auth/validar-token`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            // Token inválido, tentar refresh
            return await renovarToken();
        }
        
        return true;
        
    } catch (erro) {
        console.error('[USUARIO] Erro ao validar token:', erro);
        return false;
    }
}

/**
 * Renova o token usando refresh token
 * @returns {Promise<boolean>} True se renovação bem-sucedida
 */
async function renovarToken() {
    try {
        const refreshToken = obterRefreshToken();
        
        if (!refreshToken) {
            logout('Sua sessão expirou. Faça login novamente.');
            return false;
        }
        
        console.log('[USUARIO] Renovando token...');
        
        const response = await fetch(`${USUARIO_CONFIG.API_BASE_URL}/auth/refresh-token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                refreshToken: refreshToken
            })
        });
        
        if (!response.ok) {
            logout('Sua sessão expirou. Faça login novamente.');
            return false;
        }
        
        const dados = await response.json();
        
        // Atualizar token
        salvarToken(dados.token);
        usuarioState.token = dados.token;
        usuarioState.tokenExpiry = dados.expiresIn;
        
        console.log('[USUARIO] Token renovado com sucesso');
        
        return true;
        
    } catch (erro) {
        console.error('[USUARIO] Erro ao renovar token:', erro);
        logout('Erro ao renovar sessão. Faça login novamente.');
        return false;
    }
}

// ============================================
// PERFIL DO USUÁRIO
// ============================================

/**
 * Obtém dados do perfil do usuário autenticado
 * @returns {Promise<Object>} Dados do perfil
 */
async function obterPerfil() {
    try {
        const response = await fetch(`${USUARIO_CONFIG.API_BASE_URL}/usuarios/perfil`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${obterToken()}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Erro ao obter perfil');
        }
        
        const perfil = await response.json();
        
        // Atualizar estado
        usuarioState.usuario = perfil;
        salvarUsuario(perfil);
        
        return perfil;
        
    } catch (erro) {
        console.error('[USUARIO] Erro ao obter perfil:', erro);
        throw erro;
    }
}

/**
 * Atualiza dados do perfil do usuário
 * @param {Object} dados - Dados a atualizar
 * @returns {Promise<Object>} Dados atualizados
 */
async function atualizarPerfil(dados) {
    try {
        usuarioState.carregando = true;
        
        // Validar dados
        if (dados.nome && dados.nome.trim().length < 3) {
            throw new Error('Nome deve ter pelo menos 3 caracteres');
        }
        
        console.log('[USUARIO] Atualizando perfil...');
        
        const response = await fetch(`${USUARIO_CONFIG.API_BASE_URL}/usuarios/perfil`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${obterToken()}`
            },
            body: JSON.stringify(dados)
        });
        
        if (!response.ok) {
            const erro = await response.json();
            throw new Error(erro.mensagem || 'Erro ao atualizar perfil');
        }
        
        const perfilAtualizado = await response.json();
        
        // Atualizar estado
        usuarioState.usuario = perfilAtualizado;
        salvarUsuario(perfilAtualizado);
        
        console.log('[USUARIO] Perfil atualizado com sucesso');
        
        // Disparar evento
        dispararEventoUsuario('perfilAtualizado', perfilAtualizado);
        
        return perfilAtualizado;
        
    } catch (erro) {
        console.error('[USUARIO] Erro ao atualizar perfil:', erro);
        throw erro;
    } finally {
        usuarioState.carregando = false;
    }
}

// ============================================
// ALTERAÇÃO DE SENHA
// ============================================

/**
 * Altera a senha do usuário
 * @param {string} senhaAtual - Senha atual
 * @param {string} novaSenha - Nova senha
 * @param {string} confirmacaoSenha - Confirmação da nova senha
 * @returns {Promise<void>}
 */
async function alterarSenha(senhaAtual, novaSenha, confirmacaoSenha) {
    try {
        usuarioState.carregando = true;
        
        // Validar entrada
        if (!senhaAtual || senhaAtual.length < 3) {
            throw new Error('Senha atual inválida');
        }
        
        if (!validarSenha(novaSenha)) {
            throw new Error(
                'Nova senha deve ter: ' +
                '- Mínimo 8 caracteres\n' +
                '- Pelo menos uma letra maiúscula\n' +
                '- Pelo menos uma letra minúscula\n' +
                '- Pelo menos um número\n' +
                '- Pelo menos um caractere especial (@$!%*?&)'
            );
        }
        
        if (novaSenha !== confirmacaoSenha) {
            throw new Error('As senhas não coincidem');
        }
        
        console.log('[USUARIO] Alterando senha...');
        
        const response = await fetch(`${USUARIO_CONFIG.API_BASE_URL}/usuarios/alterar-senha`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${obterToken()}`
            },
            body: JSON.stringify({
                senhaAtual: senhaAtual,
                novaSenha: novaSenha,
                confirmacaoSenha: confirmacaoSenha
            })
        });
        
        if (!response.ok) {
            const erro = await response.json();
            throw new Error(erro.mensagem || 'Erro ao alterar senha');
        }
        
        console.log('[USUARIO] Senha alterada com sucesso');
        
        // Disparar evento
        dispararEventoUsuario('senhaAlterada', null);
        
    } catch (erro) {
        console.error('[USUARIO] Erro ao alterar senha:', erro);
        throw erro;
    } finally {
        usuarioState.carregando = false;
    }
}

// ============================================
// RECUPERAÇÃO DE SENHA
// ============================================

/**
 * Solicita recuperação de senha
 * @param {string} email - Email do usuário
 * @returns {Promise<void>}
 */
async function solicitarRecuperacaoSenha(email) {
    try {
        usuarioState.carregando = true;
        
        if (!validarEmail(email)) {
            throw new Error('Email inválido');
        }
        
        console.log('[USUARIO] Solicitando recuperação de senha para:', email);
        
        const response = await fetch(`${USUARIO_CONFIG.API_BASE_URL}/auth/recuperar-senha`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: email.toLowerCase().trim()
            })
        });
        
        if (!response.ok) {
            const erro = await response.json();
            throw new Error(erro.mensagem || 'Erro ao solicitar recuperação');
        }
        
        console.log('[USUARIO] Email de recuperação enviado');
        
    } catch (erro) {
        console.error('[USUARIO] Erro ao solicitar recuperação:', erro);
        throw erro;
    } finally {
        usuarioState.carregando = false;
    }
}

/**
 * Reseta a senha usando token de recuperação
 * @param {string} token - Token de recuperação
 * @param {string} novaSenha - Nova senha
 * @param {string} confirmacaoSenha - Confirmação da nova senha
 * @returns {Promise<void>}
 */
async function resetarSenha(token, novaSenha, confirmacaoSenha) {
    try {
        usuarioState.carregando = true;
        
        if (!validarSenha(novaSenha)) {
            throw new Error('Senha inválida');
        }
        
        if (novaSenha !== confirmacaoSenha) {
            throw new Error('As senhas não coincidem');
        }
        
        console.log('[USUARIO] Resetando senha...');
        
        const response = await fetch(`${USUARIO_CONFIG.API_BASE_URL}/auth/resetar-senha`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                token: token,
                novaSenha: novaSenha,
                confirmacaoSenha: confirmacaoSenha
            })
        });
        
        if (!response.ok) {
            const erro = await response.json();
            throw new Error(erro.mensagem || 'Erro ao resetar senha');
        }
        
        console.log('[USUARIO] Senha resetada com sucesso');
        
    } catch (erro) {
        console.error('[USUARIO] Erro ao resetar senha:', erro);
        throw erro;
    } finally {
        usuarioState.carregando = false;
    }
}

// ============================================
// VALIDAÇÕES
// ============================================

/**
 * Valida formato de email
 * @param {string} email - Email a validar
 * @returns {boolean} True se email é válido
 */
function validarEmail(email) {
    return USUARIO_CONFIG.EMAIL_REGEX.test(email);
}

/**
 * Valida força da senha
 * @param {string} senha - Senha a validar
 * @returns {boolean} True se senha é válida
 */
function validarSenha(senha) {
    if (!senha || senha.length < USUARIO_CONFIG.PASSWORD_MIN_LENGTH) {
        return false;
    }
    return USUARIO_CONFIG.PASSWORD_REGEX.test(senha);
}

/**
 * Valida dados de registro
 * @param {Object} dados - Dados a validar
 * @returns {Array<string>} Array de erros encontrados
 */
function validarDadosRegistro(dados) {
    const erros = [];
    
    if (!dados.email || !validarEmail(dados.email)) {
        erros.push('Email inválido');
    }
    
    if (!dados.nome || dados.nome.trim().length < 3) {
        erros.push('Nome deve ter pelo menos 3 caracteres');
    }
    
    if (!validarSenha(dados.senha)) {
        erros.push(
            'Senha deve ter: ' +
            '- Mínimo 8 caracteres\n' +
            '- Pelo menos uma letra maiúscula\n' +
            '- Pelo menos uma letra minúscula\n' +
            '- Pelo menos um número\n' +
            '- Pelo menos um caractere especial (@$!%*?&)'
        );
    }
    
    if (dados.senha !== dados.confirmacaoSenha) {
        erros.push('As senhas não coincidem');
    }
    
    return erros;
}

// ============================================
// ARMAZENAMENTO LOCAL
// ============================================

/**
 * Salva token no localStorage
 * @param {string} token - Token JWT
 */
function salvarToken(token) {
    localStorage.setItem(USUARIO_CONFIG.TOKEN_KEY, token);
}

/**
 * Obtém token do localStorage
 * @returns {string|null} Token JWT ou null
 */
function obterToken() {
    return localStorage.getItem(USUARIO_CONFIG.TOKEN_KEY);
}

/**
 * Salva refresh token no localStorage
 * @param {string} token - Refresh token
 */
function salvarRefreshToken(token) {
    localStorage.setItem(USUARIO_CONFIG.REFRESH_TOKEN_KEY, token);
}

/**
 * Obtém refresh token do localStorage
 * @returns {string|null} Refresh token ou null
 */
function obterRefreshToken() {
    return localStorage.getItem(USUARIO_CONFIG.REFRESH_TOKEN_KEY);
}

/**
 * Salva dados do usuário no localStorage
 * @param {Object} usuario - Dados do usuário
 */
function salvarUsuario(usuario) {
    localStorage.setItem(USUARIO_CONFIG.USER_KEY, JSON.stringify(usuario));
}

/**
 * Obtém dados do usuário do localStorage
 * @returns {Object|null} Dados do usuário ou null
 */
function obterUsuarioSalvo() {
    const usuario = localStorage.getItem(USUARIO_CONFIG.USER_KEY);
    return usuario ? JSON.parse(usuario) : null;
}

/**
 * Limpa toda a sessão
 */
function limparSessao() {
    localStorage.removeItem(USUARIO_CONFIG.TOKEN_KEY);
    localStorage.removeItem(USUARIO_CONFIG.REFRESH_TOKEN_KEY);
    localStorage.removeItem(USUARIO_CONFIG.USER_KEY);
    localStorage.removeItem(USUARIO_CONFIG.TOKEN_EXPIRY_KEY);
    
    usuarioState.autenticado = false;
    usuarioState.usuario = null;
    usuarioState.token = null;
    usuarioState.refreshToken = null;
    usuarioState.tokenExpiry = null;
    usuarioState.erro = null;
}

// ============================================
// GETTERS E HELPERS
// ============================================

/**
 * Obtém o usuário autenticado atual
 * @returns {Object|null} Dados do usuário ou null
 */
function obterUsuarioAtual() {
    return usuarioState.usuario;
}

/**
 * Verifica se usuário está autenticado
 * @returns {boolean} True se autenticado
 */
function estaAutenticado() {
    return usuarioState.autenticado && usuarioState.token !== null;
}

/**
 * Obtém o ID do usuário atual
 * @returns {string|null} ID do usuário ou null
 */
function obterIdUsuario() {
    return usuarioState.usuario ? usuarioState.usuario.id : null;
}

/**
 * Obtém o email do usuário atual
 * @returns {string|null} Email do usuário ou null
 */
function obterEmailUsuario() {
    return usuarioState.usuario ? usuarioState.usuario.email : null;
}

/**
 * Obtém o nome do usuário atual
 * @returns {string|null} Nome do usuário ou null
 */
function obterNomeUsuario() {
    return usuarioState.usuario ? usuarioState.usuario.nome : null;
}

/**
 * Verifica se usuário tem uma permissão específica
 * @param {string} permissao - Nome da permissão
 * @returns {boolean} True se tem permissão
 */
function temPermissao(permissao) {
    if (!usuarioState.usuario || !usuarioState.usuario.permissoes) {
        return false;
    }
    return usuarioState.usuario.permissoes.includes(permissao);
}

/**
 * Verifica se usuário tem um papel específico
 * @param {string} papel - Nome do papel
 * @returns {boolean} True se tem papel
 */
function temPapel(papel) {
    if (!usuarioState.usuario) {
        return false;
    }
    return usuarioState.usuario.papel === papel;
}

/**
 * Obtém o estado atual do usuário
 * @returns {Object} Estado do usuário
 */
function obterEstadoUsuario() {
    return {
        autenticado: usuarioState.autenticado,
        usuario: usuarioState.usuario,
        carregando: usuarioState.carregando,
        erro: usuarioState.erro
    };
}

// ============================================
// EVENTOS
// ============================================

/**
 * Dispara evento de usuário
 * @param {string} tipo - Tipo do evento
 * @param {*} dados - Dados do evento
 */
function dispararEventoUsuario(tipo, dados) {
    const evento = new CustomEvent('usuario:' + tipo, {
        detail: dados
    });
    document.dispatchEvent(evento);
}

/**
 * Escuta eventos de usuário
 * @param {string} tipo - Tipo do evento
 * @param {Function} callback - Função a executar
 */
function escutarEventoUsuario(tipo, callback) {
    document.addEventListener('usuario:' + tipo, (evento) => {
        callback(evento.detail);
    });
}

// ============================================
// REDIRECIONAMENTO
// ============================================


/**
 * Redireciona para página de login
 */
function redirecionarParaLogin() {
    // Verifica se JÁ ESTAMOS na página de login para evitar loop infinito
    const paginaAtual = window.location.pathname;
    if (!paginaAtual.includes('login.html')) {
        window.location.href = '/login.html';
    }
}
// ============================================
// INTERCEPTOR DE REQUISIÇÕES
// ============================================

/**
 * Cria um interceptor para adicionar token em requisições
 * @param {string} url - URL da requisição
 * @param {Object} opcoes - Opções da requisição
 * @returns {Object} Opções modificadas
 */
function adicionarTokenEmRequisicao(url, opcoes = {}) {
    const token = obterToken();
    
    if (token) {
        opcoes.headers = opcoes.headers || {};
        opcoes.headers['Authorization'] = `Bearer ${token}`;
    }
    
    return opcoes;
}

/**
 * Fetch wrapper com autenticação automática
 * @param {string} url - URL da requisição
 * @param {Object} opcoes - Opções da requisição
 * @returns {Promise<Response>} Resposta da requisição
 */
async function fetchComAutenticacao(url, opcoes = {}) {
    // Adicionar token
    opcoes = adicionarTokenEmRequisicao(url, opcoes);
    
    let response = await fetch(url, opcoes);
    
    // Se token expirou, tentar renovar
    if (response.status === 401) {
        const renovado = await renovarToken();
        
        if (renovado) {
            // Tentar novamente com novo token
            opcoes = adicionarTokenEmRequisicao(url, opcoes);
            response = await fetch(url, opcoes);
        } else {
            // Falha na renovação, fazer logout
            logout('Sua sessão expirou. Faça login novamente.');
        }
    }
    
    return response;
}

// ============================================
// INICIALIZAÇÃO AUTOMÁTICA
// ============================================

// Inicializar quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializarUsuario);
} else {
    inicializarUsuario();
}

// ============================================
// EXPORTAR FUNÇÕES (para uso em outros módulos)
// ============================================

// Se usando módulos ES6
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        // Autenticação
        login,
        registrar,
        logout,
        
        // Perfil
        obterPerfil,
        atualizarPerfil,
        
        // Senha
        alterarSenha,
        solicitarRecuperacaoSenha,
        resetarSenha,
        
        // Token
        validarTokenComBackend,
        renovarToken,
        
        // Getters
        obterUsuarioAtual,
        estaAutenticado,
        obterIdUsuario,
        obterEmailUsuario,
        obterNomeUsuario,
        temPermissao,
        temPapel,
        obterEstadoUsuario,
        obterToken,
        
        // Eventos
        escutarEventoUsuario,
        
        // Utilitários
        fetchComAutenticacao,
        validarEmail,
        validarSenha
    };
}

// Adicione isso no final do arquivo usuario.js
function redirecionarParaDashboard() {
    window.location.href = 'index.html';
}