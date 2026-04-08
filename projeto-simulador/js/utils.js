/**
 * UTILITÁRIOS - Funções auxiliares gerais
 */

class Utils {
    /**
     * Formata número como moeda brasileira
     */
    static formatCurrency(value) {
        if (typeof value !== 'number') {
            value = parseFloat(String(value).replace(/\D/g, '')) / 100;
        }
        
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value);
    }

    /**
     * Converte string de moeda para número
     */
    static parseCurrency(value) {
        if (typeof value === 'number') return value;
        return parseFloat(String(value).replace(/\D/g, '')) / 100;
    }

    /**
     * Formata número com separadores de milhar
     */
    static formatNumber(value, decimals = 2) {
        return new Intl.NumberFormat('pt-BR', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        }).format(value);
    }

    /**
     * Formata percentual
     */
    static formatPercent(value, decimals = 2) {
        return `${this.formatNumber(value, decimals)}%`;
    }

    /**
     * Formata data
     */
    static formatDate(date, format = 'dd/mm/yyyy') {
        if (typeof date === 'string') {
            date = new Date(date);
        }

        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();

        if (format === 'dd/mm/yyyy') {
            return `${day}/${month}/${year}`;
        } else if (format === 'yyyy-mm-dd') {
            return `${year}-${month}-${day}`;
        }

        return date.toLocaleDateString('pt-BR');
    }

    /**
     * Adiciona meses a uma data
     */
    static addMonths(date, months) {
        const result = new Date(date);
        result.setMonth(result.getMonth() + months);
        return result;
    }

    /**
     * Calcula diferença em dias entre duas datas
     */
    static daysBetween(date1, date2) {
        const oneDay = 24 * 60 * 60 * 1000;
        return Math.round(Math.abs((date1 - date2) / oneDay));
    }

    /**
     * Debounce para funções
     */
    static debounce(func, wait = 300) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Throttle para funções
     */
    static throttle(func, limit = 300) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    /**
     * Copia texto para clipboard
     */
    static copyToClipboard(text) {
        return navigator.clipboard.writeText(text).then(() => {
            this.showNotification('Copiado para clipboard!', 'success');
        }).catch(err => {
            console.error('Erro ao copiar:', err);
            this.showNotification('Erro ao copiar', 'error');
        });
    }

    /**
     * Mostra notificação
     */
    static showNotification(message, type = 'info', duration = 3000) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 16px 24px;
            background: white;
            border-left: 4px solid;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 1000;
            animation: slideDown 0.3s ease;
        `;

        if (type === 'success') {
            notification.style.borderLeftColor = '#27AE60';
        } else if (type === 'error') {
            notification.style.borderLeftColor = '#E74C3C';
        } else if (type === 'warning') {
            notification.style.borderLeftColor = '#E67E22';
        } else {
            notification.style.borderLeftColor = '#3498DB';
        }

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, duration);
    }

    /**
     * Gera ID único
     */
    static generateId() {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Valida email
     */
    static isValidEmail(email) {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    }

    /**
     * Valida CPF
     */
    static isValidCPF(cpf) {
        cpf = cpf.replace(/\D/g, '');
        if (cpf.length !== 11) return false;
        if (/^(\d)\1{10}$/.test(cpf)) return false;

        let sum = 0;
        let remainder;

        for (let i = 1; i <= 9; i++) {
            sum += parseInt(cpf.substring(i - 1, i)) * (11 - i);
        }

        remainder = (sum * 10) % 11;
        if (remainder === 10 || remainder === 11) remainder = 0;
        if (remainder !== parseInt(cpf.substring(9, 10))) return false;

        sum = 0;
        for (let i = 1; i <= 10; i++) {
            sum += parseInt(cpf.substring(i - 1, i)) * (12 - i);
        }

        remainder = (sum * 10) % 11;
        if (remainder === 10 || remainder === 11) remainder = 0;
        if (remainder !== parseInt(cpf.substring(10, 11))) return false;

        return true;
    }

    /**
     * Arredonda número para N casas decimais
     */
    static round(value, decimals = 2) {
        return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
    }

    /**
     * Clona objeto profundamente
     */
    static deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    /**
     * Mescla objetos
     */
    static mergeObjects(target, source) {
        return { ...target, ...source };
    }

    /**
     * Obtém valor aninhado de objeto
     */
    static getNestedValue(obj, path) {
        return path.split('.').reduce((current, prop) => current?.[prop], obj);
    }

    /**
     * Define valor aninhado em objeto
     */
    static setNestedValue(obj, path, value) {
        const keys = path.split('.');
        let current = obj;
        for (let i = 0; i < keys.length - 1; i++) {
            if (!current[keys[i]]) {
                current[keys[i]] = {};
            }
            current = current[keys[i]];
        }
        current[keys[keys.length - 1]] = value;
    }

    /**
     * Aguarda tempo especificado
     */
    static sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Verifica se elemento está visível na viewport
     */
    static isElementInViewport(el) {
        const rect = el.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    }

    /**
     * Scroll suave para elemento
     */
    static scrollToElement(element, offset = 0) {
        const top = element.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: 'smooth' });
    }

    /**
     * Armazena dados no localStorage
     */
    static setLocalStorage(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            console.error('Erro ao salvar no localStorage:', e);
        }
    }

    /**
     * Recupera dados do localStorage
     */
    static getLocalStorage(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (e) {
            console.error('Erro ao recuperar do localStorage:', e);
            return defaultValue;
        }
    }

    /**
     * Remove dados do localStorage
     */
    static removeLocalStorage(key) {
        try {
            localStorage.removeItem(key);
        } catch (e) {
            console.error('Erro ao remover do localStorage:', e);
        }
    }
}

// Exporta para uso global
window.Utils = Utils;