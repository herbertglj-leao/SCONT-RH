/**
 * VALIDADOR - Sistema de validação de formulários
 */

class FormValidator {
    constructor() {
        this.rules = {
            loanAmount: {
                required: true,
                min: 1000,
                max: 1000000,
                message: 'Valor deve estar entre R$ 1.000 e R$ 1.000.000'
            },
            interestRate: {
                required: true,
                min: 0.01,
                max: 100,
                message: 'Taxa deve estar entre 0,01% e 100%'
            },
            loanTerm: {
                required: true,
                min: 1,
                max: 360,
                message: 'Prazo deve estar entre 1 e 360 meses'
            },
            insuranceRate: {
                required: false,
                min: 0,
                max: 10,
                message: 'Taxa de seguro deve estar entre 0% e 10%'
            },
            feesAmount: {
                required: false,
                min: 0,
                max: 1000000,
                message: 'Valor de taxa deve ser válido'
            }
        };

        this.errors = {};
    }

    /**
     * Valida um campo específico
     */
    validate(fieldName, value) {
        const rule = this.rules[fieldName];
        if (!rule) return { valid: true };

        // Validação obrigatória
        if (rule.required && (value === null || value === undefined || value === '')) {
            return {
                valid: false,
                message: 'Campo obrigatório'
            };
        }

        // Se não obrigatório e vazio, passa
        if (!rule.required && (value === null || value === undefined || value === '')) {
            return { valid: true };
        }

        // Converte para número
        let numValue = value;
        if (typeof value === 'string') {
            numValue = Utils.parseCurrency(value);
        }

        // Validação de mínimo
        if (rule.min !== undefined && numValue < rule.min) {
            return {
                valid: false,
                message: `Valor mínimo: ${rule.min}`
            };
        }

        // Validação de máximo
        if (rule.max !== undefined && numValue > rule.max) {
            return {
                valid: false,
                message: `Valor máximo: ${rule.max}`
            };
        }

        return { valid: true };
    }

    /**
     * Valida todos os campos do formulário
     */
    validateAll(formData) {
        this.errors = {};
        let isValid = true;

        for (const [fieldName, value] of Object.entries(formData)) {
            const result = this.validate(fieldName, value);
            if (!result.valid) {
                this.errors[fieldName] = result.message;
                isValid = false;
            }
        }

        return isValid;
    }

    /**
     * Mostra erro em campo
     */
    showError(fieldElement, message) {
        if (!fieldElement) return;

        fieldElement.classList.add('error');
        const errorElement = fieldElement.querySelector('.field-error');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }
    }

    /**
     * Limpa erro de campo
     */
    clearError(fieldElement) {
        if (!fieldElement) return;

        fieldElement.classList.remove('error');
        const errorElement = fieldElement.querySelector('.field-error');
        if (errorElement) {
            errorElement.style.display = 'none';
            errorElement.textContent = '';
        }
    }

    /**
     * Mostra sucesso em campo
     */
    showSuccess(fieldElement) {
        if (!fieldElement) return;

        fieldElement.classList.add('success');
        this.clearError(fieldElement);
    }

    /**
     * Limpa sucesso de campo
     */
    clearSuccess(fieldElement) {
        if (!fieldElement) return;
        fieldElement.classList.remove('success');
    }

    /**
     * Obtém todos os erros
     */
    getErrors() {
        return this.errors;
    }

    /**
     * Limpa todos os erros
     */
    clearAllErrors() {
        this.errors = {};
    }
}

// Exporta para uso global
window.FormValidator = FormValidator;