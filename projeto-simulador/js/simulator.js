/**
 * SIMULADOR - Cálculos de financiamento PRICE e SAC
 */

class LoanSimulator {
    constructor() {
        this.results = null;
    }

    /**
     * Calcula simulação completa
     */
    simulate(params) {
        const {
            loanAmount,
            interestRate,
            loanTerm,
            startDate,
            amortizationType,
            insuranceRate = 0,
            feesAmount = 0
        } = params;

        // Validações básicas
        if (!loanAmount || !interestRate || !loanTerm) {
            throw new Error('Parâmetros inválidos');
        }

        // Converte taxa mensal para decimal
        const monthlyRate = interestRate / 100;

        // Calcula amortização
        let amortizationSchedule;
        if (amortizationType === 'price') {
            amortizationSchedule = this.calculatePRICE(
                loanAmount,
                monthlyRate,
                loanTerm,
                startDate,
                insuranceRate,
                feesAmount
            );
        } else {
            amortizationSchedule = this.calculateSAC(
                loanAmount,
                monthlyRate,
                loanTerm,
                startDate,
                insuranceRate,
                feesAmount
            );
        }

        // Calcula resumo
        const summary = this.calculateSummary(amortizationSchedule, loanAmount);

        this.results = {
            params,
            amortizationSchedule,
            summary,
            amortizationType
        };

        return this.results;
    }

    /**
     * Calcula tabela PRICE (parcelas iguais)
     */
    calculatePRICE(principal, monthlyRate, months, startDate, insuranceRate = 0, feesAmount = 0) {
        // Calcula parcela fixa
        const monthlyPayment = this.calculateMonthlyPayment(principal, monthlyRate, months);

        const schedule = [];
        let balance = principal;
        let currentDate = new Date(startDate);

        for (let i = 1; i <= months; i++) {
            // Calcula juros
            const interest = balance * monthlyRate;

            // Calcula seguro
            const insurance = (principal * (insuranceRate / 100)) / months;

            // Calcula amortização
            const amortization = monthlyPayment - interest;

            // Calcula taxa administrativa (apenas na primeira parcela)
            const fee = i === 1 ? feesAmount : 0;

            // Novo saldo
            const newBalance = Math.max(0, balance - amortization);

            // Parcela total
            const totalPayment = monthlyPayment + insurance + fee;

            schedule.push({
                installment: i,
                date: new Date(currentDate),
                previousBalance: balance,
                amortization: Utils.round(amortization, 2),
                interest: Utils.round(interest, 2),
                insurance: Utils.round(insurance, 2),
                fee: Utils.round(fee, 2),
                payment: Utils.round(totalPayment, 2),
                balance: Utils.round(newBalance, 2)
            });

            balance = newBalance;
            currentDate = Utils.addMonths(currentDate, 1);
        }

        return schedule;
    }

    /**
     * Calcula tabela SAC (amortização constante)
     */
    calculateSAC(principal, monthlyRate, months, startDate, insuranceRate = 0, feesAmount = 0) {
        // Amortização fixa
        const fixedAmortization = principal / months;

        const schedule = [];
        let balance = principal;
        let currentDate = new Date(startDate);

        for (let i = 1; i <= months; i++) {
            // Calcula juros
            const interest = balance * monthlyRate;

            // Calcula seguro
            const insurance = (principal * (insuranceRate / 100)) / months;

            // Amortização é sempre a mesma
            const amortization = fixedAmortization;

            // Taxa administrativa (apenas na primeira parcela)
            const fee = i === 1 ? feesAmount : 0;

            // Novo saldo
            const newBalance = Math.max(0, balance - amortization);

            // Parcela total
            const totalPayment = amortization + interest + insurance + fee;

            schedule.push({
                installment: i,
                date: new Date(currentDate),
                previousBalance: balance,
                amortization: Utils.round(amortization, 2),
                interest: Utils.round(interest, 2),
                insurance: Utils.round(insurance, 2),
                fee: Utils.round(fee, 2),
                payment: Utils.round(totalPayment, 2),
                balance: Utils.round(newBalance, 2)
            });

            balance = newBalance;
            currentDate = Utils.addMonths(currentDate, 1);
        }

        return schedule;
    }

    /**
     * Calcula parcela mensal PRICE
     */
    calculateMonthlyPayment(principal, monthlyRate, months) {
        if (monthlyRate === 0) {
            return principal / months;
        }

        const numerator = principal * monthlyRate * Math.pow(1 + monthlyRate, months);
        const denominator = Math.pow(1 + monthlyRate, months) - 1;

        return numerator / denominator;
    }

    /**
     * Calcula resumo da simulação
     */
    calculateSummary(schedule, principal) {
        const totalInterest = schedule.reduce((sum, row) => sum + row.interest, 0);
        const totalInsurance = schedule.reduce((sum, row) => sum + row.insurance, 0);
        const totalFees = schedule.reduce((sum, row) => sum + row.fee, 0);
        const totalPayment = schedule.reduce((sum, row) => sum + row.payment, 0);
        const averagePayment = totalPayment / schedule.length;

        const firstInstallment = schedule[0].payment;
        const lastInstallment = schedule[schedule.length - 1].payment;
        const difference = Math.abs(firstInstallment - lastInstallment);

        // Calcula CET (Custo Efetivo Total)
        const cet = this.calculateCET(schedule, principal);

        return {
            principal: Utils.round(principal, 2),
            totalInterest: Utils.round(totalInterest, 2),
            totalInsurance: Utils.round(totalInsurance, 2),
            totalFees: Utils.round(totalFees, 2),
            totalPayment: Utils.round(totalPayment, 2),
            averagePayment: Utils.round(averagePayment, 2),
            firstInstallment: Utils.round(firstInstallment, 2),
            lastInstallment: Utils.round(lastInstallment, 2),
            difference: Utils.round(difference, 2),
            cet: Utils.round(cet, 2),
            months: schedule.length
        };
    }

    /**
     * Calcula CET (Custo Efetivo Total)
     */
    calculateCET(schedule, principal) {
        // Implementação simplificada do CET
        // CET real requer cálculo de TIR (Taxa Interna de Retorno)
        const totalCost = schedule.reduce((sum, row) => sum + row.interest + row.insurance + row.fee, 0);
        const cetMonthly = (totalCost / principal) / schedule.length * 100;
        const cetAnnual = cetMonthly * 12;

        return cetAnnual;
    }

    /**
     * Obtém resultados
     */
    getResults() {
        return this.results;
    }

    /**
     * Obtém cronograma de amortização
     */
    getSchedule() {
        return this.results?.amortizationSchedule || [];
    }

    /**
     * Obtém resumo
     */
    getSummary() {
        return this.results?.summary || null;
    }

    /**
     * Compara PRICE vs SAC
     */
    compareAmortizationTypes(params) {
        const priceResults = this.simulate({
            ...params,
            amortizationType: 'price'
        });

        const sacResults = this.simulate({
            ...params,
            amortizationType: 'sac'
        });

        return {
            price: priceResults,
            sac: sacResults,
            comparison: {
                priceTotal: priceResults.summary.totalPayment,
                sacTotal: sacResults.summary.totalPayment,
                difference: priceResults.summary.totalPayment - sacResults.summary.totalPayment,
                percentageDifference: ((priceResults.summary.totalPayment - sacResults.summary.totalPayment) / sacResults.summary.totalPayment) * 100
            }
        };
    }
}

// Exporta para uso global
window.LoanSimulator = LoanSimulator;