/**
 * APP - Inicialização principal da aplicação
 */

class App {
    constructor() {
        this.simulator = new LoanSimulator();
        this.validator = new FormValidator();
        this.uiManager = new UIManager();
        this.exportManager = new ExportManager();
    }

    /**
     * Inicializa a aplicação
     */
    init() {
        console.log('🚀 Iniciando HL Soluções Financeiras - Simulador de Financiamento');

        // Expõe globalmente
        window.simulator = this.simulator;
        window.formValidator = this.validator;
        window.uiManager = this.uiManager;
        window.exportManager = this.exportManager;

        // Inicializa UI
        this.uiManager.init();

        // Carrega dados salvos (se houver)
        this.loadSavedData();

        // Event listeners globais
        this.setupGlobalListeners();

        console.log('✅ Aplicação inicializada com sucesso');
    }

    /**
     * Carrega dados salvos do localStorage
     */
    loadSavedData() {
        const savedParams = Utils.getLocalStorage('lastSimulationParams');
        if (savedParams) {
            document.getElementById('loan-amount').value = Utils.formatCurrency(savedParams.loanAmount);
            document.getElementById('interest-rate').value = savedParams.interestRate;
            document.getElementById('loan-term').value = savedParams.loanTerm;

            if (savedParams.startDate) {
                document.getElementById('start-date').value = savedParams.startDate;
            }

            const amortizationRadio = document.querySelector(`input[name="amortization-type"][value="${savedParams.amortizationType}"]`);
            if (amortizationRadio) {
                amortizationRadio.checked = true;
            }
        }
    }

    /**
     * Configura event listeners globais
     */
    setupGlobalListeners() {
        // Salva parâmetros ao sair
        window.addEventListener('beforeunload', () => {
            const formData = this.uiManager.collectFormData();
            Utils.setLocalStorage('lastSimulationParams', formData);
        });

        // Trata erros não capturados
        window.addEventListener('error', (event) => {
            console.error('Erro não capturado:', event.error);
            Utils.showNotification('Ocorreu um erro inesperado', 'error');
        });

        // Trata rejeições de promessas não capturadas
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Rejeição não capturada:', event.reason);
            Utils.showNotification('Ocorreu um erro inesperado', 'error');
        });
    }
}

// Inicializa quando o DOM está pronto
document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.init();
});