/**
 * UI - Gerenciamento da interface do usuário
 */

class UIManager {
    constructor() {
        this.currentPage = 1;
        this.rowsPerPage = 10;
        this.allScheduleData = [];
        this.filteredScheduleData = [];
        this.chart = null;
    }

    /**
     * Inicializa elementos da UI
     */
    init() {
        this.setupEventListeners();
        this.setupInputMasks();
        this.setDefaultDate();
    }

    /**
     * Configura event listeners
     */
    setupEventListeners() {
        // Campos de entrada
        const loanAmountInput = document.getElementById('loan-amount');
        const loanSlider = document.getElementById('loan-amount-slider');
        const interestRateInput = document.getElementById('interest-rate');
        const loanTermInput = document.getElementById('loan-term');

        // Sincroniza input e slider
        if (loanAmountInput && loanSlider) {
            loanAmountInput.addEventListener('input', (e) => {
                const value = Utils.parseCurrency(e.target.value);
                loanSlider.value = value;
                this.updateSliderBackground(loanSlider);
            });

            loanSlider.addEventListener('input', (e) => {
                const value = Utils.formatCurrency(e.target.value);
                loanAmountInput.value = value;
                this.updateSliderBackground(loanSlider);
            });
        }

        // Validação em tempo real
        if (loanAmountInput) {
            loanAmountInput.addEventListener('blur', (e) => {
                this.validateField('loanAmount', e.target);
            });
        }

        if (interestRateInput) {
            interestRateInput.addEventListener('blur', (e) => {
                this.validateField('interestRate', e.target);
            });
        }

        if (loanTermInput) {
            loanTermInput.addEventListener('blur', (e) => {
                this.validateField('loanTerm', e.target);
            });
        }

        // Checkbox de seguro
        const includeInsurance = document.getElementById('include-insurance');
        const insuranceRateGroup = document.getElementById('insurance-rate-group');
        if (includeInsurance) {
            includeInsurance.addEventListener('change', (e) => {
                if (insuranceRateGroup) {
                    insuranceRateGroup.style.display = e.target.checked ? 'block' : 'none';
                }
            });
        }

        // Checkbox de taxas
        const includeFees = document.getElementById('include-fees');
        const feesAmountGroup = document.getElementById('fees-amount-group');
        if (includeFees) {
            includeFees.addEventListener('change', (e) => {
                if (feesAmountGroup) {
                    feesAmountGroup.style.display = e.target.checked ? 'block' : 'none';
                }
            });
        }

        // Botões de simulação
        const simulateBtn = document.getElementById('simulate-btn');
        const simulateMainBtn = document.getElementById('simulate-main');
        if (simulateBtn) simulateBtn.addEventListener('click', () => this.handleSimulate());
        if (simulateMainBtn) simulateMainBtn.addEventListener('click', () => this.handleSimulate());

        // Botões de limpeza
        const resetBtn = document.getElementById('reset-params');
        const clearAllBtn = document.getElementById('clear-all');
        if (resetBtn) resetBtn.addEventListener('click', () => this.clearParameters());
        if (clearAllBtn) clearAllBtn.addEventListener('click', () => this.clearParameters());

        // Botão voltar
        const backBtn = document.getElementById('back-to-params');
        if (backBtn) {
            backBtn.addEventListener('click', () => this.showParametersSection());
        }

        // Exportação
        const exportPdfBtn = document.getElementById('export-pdf');
        const exportExcelBtn = document.getElementById('export-excel');
        const exportCsvBtn = document.getElementById('export-csv');

        if (exportPdfBtn) exportPdfBtn.addEventListener('click', () => window.exportManager.exportPDF());
        if (exportExcelBtn) exportExcelBtn.addEventListener('click', () => window.exportManager.exportExcel());
        if (exportCsvBtn) exportCsvBtn.addEventListener('click', () => window.exportManager.exportCSV());

        // Tabela
        const tableSearch = document.getElementById('table-search');
        const tableRowsPerPage = document.getElementById('table-rows-per-page');
        const prevPageBtn = document.getElementById('prev-page');
        const nextPageBtn = document.getElementById('next-page');

        if (tableSearch) {
            tableSearch.addEventListener('input', Utils.debounce((e) => {
                this.filterTable(e.target.value);
            }, 300));
        }

        if (tableRowsPerPage) {
            tableRowsPerPage.addEventListener('change', (e) => {
                this.rowsPerPage = parseInt(e.target.value);
                this.currentPage = 1;
                this.renderTable();
            });
        }

        if (prevPageBtn) {
            prevPageBtn.addEventListener('click', () => this.previousPage());
        }

        if (nextPageBtn) {
            nextPageBtn.addEventListener('click', () => this.nextPage());
        }

        // Collapse avançado
        const collapseBtn = document.getElementById('collapse-advanced');
        const advancedContent = document.getElementById('advanced-content');
        if (collapseBtn && advancedContent) {
            collapseBtn.addEventListener('click', () => {
                const isExpanded = collapseBtn.getAttribute('aria-expanded') === 'true';
                collapseBtn.setAttribute('aria-expanded', !isExpanded);
                advancedContent.classList.toggle('collapsed');
            });
        }
    }

    /**
     * Configura máscaras de entrada
     */
    setupInputMasks() {
        const currencyInputs = document.querySelectorAll('.input-currency');
        currencyInputs.forEach(input => {
            input.addEventListener('input', (e) => {
                let value = e.target.value.replace(/\D/g, '');
                if (value) {
                    value = (parseInt(value) / 100).toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL'
                    });
                    e.target.value = value;
                }
            });
        });
    }

    /**
     * Define data padrão (hoje)
     */
    setDefaultDate() {
        const startDateInput = document.getElementById('start-date');
        if (startDateInput) {
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            startDateInput.value = `${year}-${month}-${day}`;
        }
    }

    /**
     * Atualiza background do slider
     */
    updateSliderBackground(slider) {
        const value = (slider.value - slider.min) / (slider.max - slider.min) * 100;
        slider.style.background = `linear-gradient(to right, var(--color-primary-medium) 0%, var(--color-primary-medium) ${value}%, var(--color-gray-200) ${value}%, var(--color-gray-200) 100%)`;
    }

    /**
     * Valida campo
     */
    validateField(fieldName, element) {
        const validator = window.formValidator;
        const value = element.value;
        const result = validator.validate(fieldName, value);

        const fieldGroup = element.closest('.field-group');
        if (!fieldGroup) return;

        if (!result.valid) {
            validator.showError(fieldGroup, result.message);
        } else {
            validator.clearError(fieldGroup);
            validator.showSuccess(fieldGroup);
        }
    }

    /**
     * Coleta dados do formulário
     */
    collectFormData() {
        const loanAmount = Utils.parseCurrency(document.getElementById('loan-amount').value);
        const interestRate = parseFloat(document.getElementById('interest-rate').value);
        const loanTerm = parseInt(document.getElementById('loan-term').value);
        const startDate = document.getElementById('start-date').value;
        const amortizationType = document.querySelector('input[name="amortization-type"]:checked').value;

        let insuranceRate = 0;
        let feesAmount = 0;

        const includeInsurance = document.getElementById('include-insurance').checked;
        if (includeInsurance) {
            insuranceRate = parseFloat(document.getElementById('insurance-rate').value) || 0;
        }

        const includeFees = document.getElementById('include-fees').checked;
        if (includeFees) {
            feesAmount = Utils.parseCurrency(document.getElementById('fees-amount').value) || 0;
        }

        return {
            loanAmount,
            interestRate,
            loanTerm,
            startDate,
            amortizationType,
            insuranceRate,
            feesAmount
        };
    }

    /**
     * Manipula simulação
     */
    handleSimulate() {
        const formData = this.collectFormData();
        const validator = window.formValidator;

        // Valida todos os campos
        if (!validator.validateAll(formData)) {
            const errors = validator.getErrors();
            for (const [fieldName, message] of Object.entries(errors)) {
                const fieldId = this.getFieldIdByName(fieldName);
                const element = document.getElementById(fieldId);
                if (element) {
                    const fieldGroup = element.closest('.field-group');
                    validator.showError(fieldGroup, message);
                }
            }
            Utils.showNotification('Preencha todos os campos obrigatórios corretamente', 'warning');
            return;
        }

        try {
            // Simula
            const simulator = window.simulator;
            const results = simulator.simulate(formData);

            // Atualiza UI
            this.displayResults(results);
            this.showResultsSection();

            // Salva dados para exportação
            window.exportManager.setSimulationData(results);

            Utils.showNotification('Simulação realizada com sucesso!', 'success');
        } catch (error) {
            console.error('Erro na simulação:', error);
            Utils.showNotification('Erro ao realizar simulação: ' + error.message, 'error');
        }
    }

    /**
     * Obtém ID do campo pelo nome
     */
    getFieldIdByName(fieldName) {
        const mapping = {
            loanAmount: 'loan-amount',
            interestRate: 'interest-rate',
            loanTerm: 'loan-term',
            insuranceRate: 'insurance-rate',
            feesAmount: 'fees-amount'
        };
        return mapping[fieldName] || fieldName;
    }

    /**
     * Exibe resultados
     */
    displayResults(results) {
        const { summary, amortizationSchedule } = results;

        // KPI Cards
        document.getElementById('kpi-loan-amount').textContent = Utils.formatCurrency(summary.principal);
        document.getElementById('kpi-total-interest').textContent = Utils.formatCurrency(summary.totalInterest);
        document.getElementById('kpi-total-amount').textContent = Utils.formatCurrency(summary.totalPayment);
        document.getElementById('kpi-avg-installment').textContent = Utils.formatCurrency(summary.averagePayment);

        // Análise Detalhada
        document.getElementById('analysis-first-installment').textContent = Utils.formatCurrency(summary.firstInstallment);
        document.getElementById('analysis-last-installment').textContent = Utils.formatCurrency(summary.lastInstallment);
        document.getElementById('analysis-difference').textContent = Utils.formatCurrency(summary.difference);
        document.getElementById('analysis-cet').textContent = Utils.formatPercent(summary.cet, 2);

        // Tabela de Amortização
        this.allScheduleData = amortizationSchedule;
        this.filteredScheduleData = amortizationSchedule;
        this.currentPage = 1;
        this.renderTable();

        // Gráfico
        this.renderChart(amortizationSchedule);
    }

    /**
     * Renderiza tabela de amortização
     */
    renderTable() {
        const tbody = document.getElementById('table-body');
        if (!tbody) return;

        tbody.innerHTML = '';

        const start = (this.currentPage - 1) * this.rowsPerPage;
        const end = start + this.rowsPerPage;
        const pageData = this.filteredScheduleData.slice(start, end);

        pageData.forEach(row => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${row.installment}</td>
                <td>${Utils.formatDate(row.date)}</td>
                <td class="currency">${Utils.formatCurrency(row.previousBalance)}</td>
                <td class="currency">${Utils.formatCurrency(row.amortization)}</td>
                <td class="currency">${Utils.formatCurrency(row.interest)}</td>
                <td class="currency">${Utils.formatCurrency(row.payment)}</td>
                <td class="currency">${Utils.formatCurrency(row.balance)}</td>
            `;
            tbody.appendChild(tr);
        });

        // Atualiza paginação
        this.updatePagination();
    }

    /**
     * Filtra tabela
     */
    filterTable(searchTerm) {
        if (!searchTerm) {
            this.filteredScheduleData = this.allScheduleData;
        } else {
            const term = searchTerm.toLowerCase();
            this.filteredScheduleData = this.allScheduleData.filter(row => {
                return (
                    row.installment.toString().includes(term) ||
                    Utils.formatDate(row.date).includes(term)
                );
            });
        }

        this.currentPage = 1;
        this.renderTable();
    }

    /**
     * Atualiza paginação
     */
    updatePagination() {
        const totalPages = Math.ceil(this.filteredScheduleData.length / this.rowsPerPage);
        document.getElementById('current-page').textContent = this.currentPage;
        document.getElementById('total-pages').textContent = totalPages;

        const prevBtn = document.getElementById('prev-page');
        const nextBtn = document.getElementById('next-page');

        if (prevBtn) prevBtn.disabled = this.currentPage === 1;
        if (nextBtn) nextBtn.disabled = this.currentPage === totalPages;
    }

    /**
     * Página anterior
     */
    previousPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.renderTable();
            Utils.scrollToElement(document.getElementById('amortization-table'), 100);
        }
    }

    /**
     * Próxima página
     */
    nextPage() {
        const totalPages = Math.ceil(this.filteredScheduleData.length / this.rowsPerPage);
        if (this.currentPage < totalPages) {
            this.currentPage++;
            this.renderTable();
            Utils.scrollToElement(document.getElementById('amortization-table'), 100);
        }
    }

    /**
     * Renderiza gráfico
     */
    renderChart(schedule) {
        const ctx = document.getElementById('comparison-chart');
        if (!ctx) return;

        const labels = schedule.map((_, i) => i + 1);
        const balanceData = schedule.map(row => row.balance);
        const paymentData = schedule.map(row => row.payment);

        if (this.chart) {
            this.chart.destroy();
        }

        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Saldo Devedor',
                        data: balanceData,
                        borderColor: '#2E5C8A',
                        backgroundColor: 'rgba(46, 92, 138, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4,
                        yAxisID: 'y'
                    },
                    {
                        label: 'Parcela',
                        data: paymentData,
                        borderColor: '#E67E22',
                        backgroundColor: 'rgba(230, 126, 34, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            font: {
                                family: 'Inter, sans-serif',
                                size: 12
                            },
                            padding: 15,
                            usePointStyle: true
                        }
                    }
                },
                scales: {
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Saldo Devedor (R$)',
                            font: {
                                size: 12,
                                weight: 'bold'
                            }
                        },
                        ticks: {
                            callback: function(value) {
                                return 'R$ ' + value.toLocaleString('pt-BR');
                            }
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Parcela (R$)',
                            font: {
                                size: 12,
                                weight: 'bold'
                            }
                        },
                        grid: {
                            drawOnChartArea: false
                        },
                        ticks: {
                            callback: function(value) {
                                return 'R$ ' + value.toLocaleString('pt-BR');
                            }
                        }
                    }
                }
            }
        });
    }

    /**
     * Limpa parâmetros
     */
    clearParameters() {
        document.getElementById('loan-amount').value = '';
        document.getElementById('interest-rate').value = '';
        document.getElementById('loan-term').value = '';
        document.getElementById('insurance-rate').value = '';
        document.getElementById('fees-amount').value = '';
        document.getElementById('include-insurance').checked = false;
        document.getElementById('include-fees').checked = false;
        document.getElementById('insurance-rate-group').style.display = 'none';
        document.getElementById('fees-amount-group').style.display = 'none';

        // Limpa erros
        const fieldGroups = document.querySelectorAll('.field-group');
        fieldGroups.forEach(group => {
            window.formValidator.clearError(group);
            window.formValidator.clearSuccess(group);
        });

        this.setDefaultDate();
        Utils.showNotification('Parâmetros limpos', 'info');
    }

    /**
     * Mostra seção de parâmetros
     */
    showParametersSection() {
        document.getElementById('parameters-section').style.display = 'block';
        document.getElementById('results-section').style.display = 'none';
        Utils.scrollToElement(document.getElementById('parameters-section'), 100);
    }

    /**
     * Mostra seção de resultados
     */
    showResultsSection() {
        document.getElementById('parameters-section').style.display = 'none';
        document.getElementById('results-section').style.display = 'block';
        Utils.scrollToElement(document.getElementById('results-section'), 100);
    }
}

// Exporta para uso global
window.UIManager = UIManager;