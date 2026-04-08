/**
 * EXPORTAÇÃO - Exporta resultados em PDF, Excel e CSV
 */

class ExportManager {
    constructor() {
        this.simulationData = null;
    }

    /**
     * Define dados da simulação
     */
    setSimulationData(data) {
        this.simulationData = data;
    }

    /**
     * Exporta para PDF
     */
    exportPDF() {
        if (!this.simulationData) {
            Utils.showNotification('Nenhuma simulação para exportar', 'warning');
            return;
        }

        const element = document.getElementById('results-section');
        if (!element) {
            Utils.showNotification('Seção de resultados não encontrada', 'error');
            return;
        }

        const opt = {
            margin: 10,
            filename: `simulacao_${new Date().toISOString().split('T')[0]}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
        };

        html2pdf().set(opt).from(element).save();
        Utils.showNotification('PDF exportado com sucesso!', 'success');
    }

    /**
     * Exporta para Excel
     */
    exportExcel() {
        if (!this.simulationData) {
            Utils.showNotification('Nenhuma simulação para exportar', 'warning');
            return;
        }

        const { summary, amortizationSchedule } = this.simulationData;

        // Prepara dados da tabela
        const tableData = amortizationSchedule.map(row => ({
            'Parcela': row.installment,
            'Data': Utils.formatDate(row.date),
            'Saldo Anterior': row.previousBalance,
            'Amortização': row.amortization,
            'Juros': row.interest,
            'Seguro': row.insurance,
            'Taxa': row.fee,
            'Parcela': row.payment,
            'Saldo Devedor': row.balance
        }));

        // Cria workbook
        const workbook = XLSX.utils.book_new();

        // Adiciona planilha de resumo
        const summaryData = [
            ['RESUMO DA SIMULAÇÃO'],
            [],
            ['Valor do Empréstimo', Utils.formatCurrency(summary.principal)],
            ['Taxa de Juros (% a.m.)', this.simulationData.params.interestRate],
            ['Prazo (meses)', summary.months],
            ['Juros Totais', Utils.formatCurrency(summary.totalInterest)],
            ['Seguro Total', Utils.formatCurrency(summary.totalInsurance)],
            ['Taxas Totais', Utils.formatCurrency(summary.totalFees)],
            ['Valor Total a Pagar', Utils.formatCurrency(summary.totalPayment)],
            ['Parcela Média', Utils.formatCurrency(summary.averagePayment)],
            ['Primeira Parcela', Utils.formatCurrency(summary.firstInstallment)],
            ['Última Parcela', Utils.formatCurrency(summary.lastInstallment)],
            ['CET (%)', summary.cet]
        ];

        const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumo');

        // Adiciona planilha de amortização
        const amortizationSheet = XLSX.utils.json_to_sheet(tableData);
        XLSX.utils.book_append_sheet(workbook, amortizationSheet, 'Amortização');

        // Salva arquivo
        const fileName = `simulacao_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(workbook, fileName);
        Utils.showNotification('Excel exportado com sucesso!', 'success');
    }

    /**
     * Exporta para CSV
     */
    exportCSV() {
        if (!this.simulationData) {
            Utils.showNotification('Nenhuma simulação para exportar', 'warning');
            return;
        }

        const { summary, amortizationSchedule } = this.simulationData;

        // Cabeçalho
        let csv = 'SIMULAÇÃO DE FINANCIAMENTO\n';
        csv += `Data da Exportação: ${Utils.formatDate(new Date())}\n\n`;

        // Resumo
        csv += 'RESUMO\n';
        csv += `Valor do Empréstimo,${summary.principal}\n`;
        csv += `Taxa de Juros (% a.m.),${this.simulationData.params.interestRate}\n`;
        csv += `Prazo (meses),${summary.months}\n`;
        csv += `Juros Totais,${summary.totalInterest}\n`;
        csv += `Seguro Total,${summary.totalInsurance}\n`;
        csv += `Taxas Totais,${summary.totalFees}\n`;
        csv += `Valor Total a Pagar,${summary.totalPayment}\n`;
        csv += `Parcela Média,${summary.averagePayment}\n\n`;

        // Tabela de amortização
        csv += 'TABELA DE AMORTIZAÇÃO\n';
        csv += 'Parcela,Data,Saldo Anterior,Amortização,Juros,Seguro,Taxa,Parcela,Saldo Devedor\n';

        amortizationSchedule.forEach(row => {
            csv += `${row.installment},`;
            csv += `${Utils.formatDate(row.date)},`;
            csv += `${row.previousBalance},`;
            csv += `${row.amortization},`;
            csv += `${row.interest},`;
            csv += `${row.insurance},`;
            csv += `${row.fee},`;
            csv += `${row.payment},`;
            csv += `${row.balance}\n`;
        });

        // Cria blob e download
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `simulacao_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();

        Utils.showNotification('CSV exportado com sucesso!', 'success');
    }

    /**
     * Exporta para JSON
     */
    exportJSON() {
        if (!this.simulationData) {
            Utils.showNotification('Nenhuma simulação para exportar', 'warning');
            return;
        }

        const json = JSON.stringify(this.simulationData, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `simulacao_${new Date().toISOString().split('T')[0]}.json`;
        link.click();

        Utils.showNotification('JSON exportado com sucesso!', 'success');
    }

    /**
     * Copia tabela para clipboard
     */
    copyTableToClipboard() {
        if (!this.simulationData) {
            Utils.showNotification('Nenhuma simulação para copiar', 'warning');
            return;
        }

        const { amortizationSchedule } = this.simulationData;

        let text = 'Parcela\tData\tSaldo Anterior\tAmortização\tJuros\tSeguro\tTaxa\tParcela\tSaldo Devedor\n';

        amortizationSchedule.forEach(row => {
            text += `${row.installment}\t`;
            text += `${Utils.formatDate(row.date)}\t`;
            text += `${row.previousBalance}\t`;
            text += `${row.amortization}\t`;
            text += `${row.interest}\t`;
            text += `${row.insurance}\t`;
            text += `${row.fee}\t`;
            text += `${row.payment}\t`;
            text += `${row.balance}\n`;
        });

        Utils.copyToClipboard(text);
    }
}

// Exporta para uso global
window.ExportManager = ExportManager;