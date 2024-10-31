// Importação das bibliotecas necessárias
import fetch from 'node-fetch';
import fetchCookie from 'fetch-cookie';
import { CookieJar } from 'tough-cookie';
import { htmlToText } from 'html-to-text'; // Biblioteca para converter HTML em texto

class EmailProcessor {
    // URL da API do Guerrilla Mail
    EMAIL_API = 'http://api.guerrillamail.com/ajax.php';

    // Parâmetros comuns
    COMMON_PARAMS = {
        lang: 'pt', // Defina para 'en' se preferir inglês
        ip: '127.0.0.1', // Substitua pelo IP real se disponível
        agent: 'Mozilla/5.0 (Node.js)' // Substitua pelo user-agent real se necessário
    };

    // Inicializa um jar de cookies para gerenciar sessões
    jar = new CookieJar();

    // Envolve o fetch com o gerenciamento de cookies
    fetchWithCookies = fetchCookie(fetch, this.jar);

    constructor() {
        // Inicia o loop eterno ao instanciar a classe
        this.startLoop();
    }

    /**
     * Define o usuário de e-mail para um valor específico.
     * @param {string} emailUser - A parte do usuário do e-mail (antes do @).
     * @returns {Promise<string>} - O endereço de e-mail completo definido.
     */
    async setEmailUser(emailUser) {
        const params = new URLSearchParams({
            f: 'set_email_user',
            email_user: emailUser,
            ...this.COMMON_PARAMS
        });

        const url = `${this.EMAIL_API}?${params.toString()}`;

        try {
            const response = await this.fetchWithCookies(url, {
                method: 'POST'
            });

            if (!response.ok) {
                throw new Error(`Erro HTTP! Status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Endereço de e-mail definido:', data.email_addr);

            // Verifique se o e-mail foi definido corretamente
            if (data.email_addr) {
                return data.email_addr;
            } else {
                throw new Error('Falha ao definir o usuário do e-mail.');
            }
        } catch (error) {
            console.error('Erro ao definir o usuário de e-mail:', error);
            throw error;
        }
    }

    /**
     * Busca o conteúdo completo de um e-mail específico.
     * @param {string|number} mailId - O ID do e-mail a ser buscado.
     * @returns {Promise<string|null>} - O conteúdo completo do e-mail em texto ou null se não encontrado.
     */
    async fetchEmail(mailId) {
        const params = new URLSearchParams({
            f: 'fetch_email',
            email_id: mailId,
            ...this.COMMON_PARAMS
        });

        const url = `${this.EMAIL_API}?${params.toString()}`;

        try {
            const response = await this.fetchWithCookies(url);
            if (!response.ok) {
                throw new Error(`Erro HTTP ao buscar e-mail! Status: ${response.status}`);
            }

            const data = await response.json();

            // Verifique se o e-mail foi encontrado e possui conteúdo
            if (data.mail_body) {
                // Converte o conteúdo HTML para texto simples
                const textContent = htmlToText(data.mail_body, {
                    wordwrap: 130,
                    ignoreHref: true, // Ignora links
                    ignoreImage: true // Ignora imagens
                });
                return textContent;
            } else {
                console.warn(`E-mail ID ${mailId} não possui conteúdo.`);
                return null;
            }
        } catch (error) {
            console.error(`Erro ao buscar o conteúdo do e-mail ID ${mailId}:`, error);
            return null; // Retorna null em vez de lançar erro
        }
    }

    /**
     * Extrai o código de transação de um texto utilizando expressão regular.
     * @param {string} text - O texto do qual extrair o código.
     * @returns {string|null} - O código de transação ou null se não encontrado.
     */
    extractTransactionCode(text) {
        const regex = /Código da Transação:\s*(\d+)/i;
        const match = text.match(regex);
        return match ? match[1] : null;
    }

    /**
     * Envia uma requisição POST para o endpoint especificado com os dados fornecidos.
     * @param {string} url - O URL para enviar a requisição POST.
     * @param {Object} data - Os dados a serem enviados no corpo da requisição.
     * @returns {Promise<boolean>} - Retorna true se a requisição for bem-sucedida (status 200), caso contrário, false.
     */
    async postData(url, data) {
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (response.status === 200) {
                console.log(`Requisição POST bem-sucedida para ${url}.`);
                return true;
            } else {
                console.warn(`Requisição POST falhou com status ${response.status} para ${url}.`);
                return false;
            }
        } catch (error) {
            console.error(`Erro ao enviar POST para ${url}:`, error);
            return false;
        }
    }

    /**
     * Remove um e-mail específico utilizando o método 'del_email' da API.
     * @param {string|number} mailId - O ID do e-mail a ser removido.
     * @returns {Promise<boolean>} - Retorna true se o e-mail foi removido com sucesso, caso contrário, false.
     */
    async deleteEmail(mailId) {
        const params = new URLSearchParams({
            f: 'del_email',
            'email_ids[]': mailId, // Formato para array
            ...this.COMMON_PARAMS
        });

        const url = `${this.EMAIL_API}?${params.toString()}`;

        try {
            const response = await this.fetchWithCookies(url, {
                method: 'POST'
            });

            if (!response.ok) {
                throw new Error(`Erro HTTP ao deletar e-mail! Status: ${response.status}`);
            }

            const data = await response.json();
            console.log(`E-mail deletado com sucesso: ${mailId}`, data);

            // Verifique se o e-mail foi realmente deletado
            if (data.deleted_ids && data.deleted_ids.includes(mailId.toString())) {
                return true;
            } else {
                console.warn(`E-mail ID ${mailId} não foi deletado.`);
                return false;
            }
        } catch (error) {
            console.error(`Erro ao deletar o e-mail ID ${mailId}:`, error);
            return false;
        }
    }

    /**
     * Busca a lista de e-mails, extrai os códigos de transação, envia a requisição POST e remove o e-mail
     * após receber uma resposta bem-sucedida.
     */
    async processTransactionEmails() {
        try {
            // Define o usuário de e-mail para 'nhobzkpo'
            const email = await this.setEmailUser('nhobzkpo');

            // Parâmetros para buscar a lista de e-mails
            const params = new URLSearchParams({
                f: 'get_email_list',
                offset: '0',
                ...this.COMMON_PARAMS
            });

            const url = `${this.EMAIL_API}?${params.toString()}`;

            const response = await this.fetchWithCookies(url);
            if (!response.ok) {
                throw new Error(`Erro HTTP! Status: ${response.status}`);
            }

            const data = await response.json();
            // console.log('Dados da Lista de E-mails:', JSON.stringify(data, null, 2));

            // Verifica se há e-mails retornados
            if (data.list && data.list.length > 0) {
                // Exibir todos os e-mails recebidos para depuração
                console.log("Todos os E-mails Recebidos:");
                data.list.forEach(email => {
                    console.log(`ID: ${email.mail_id}`);
                    console.log(`Assunto: ${email.mail_subject || '(Sem Assunto)'}`);
                    console.log(`Remetente: ${email.mail_from}`);
                    console.log(`Conteúdo (trecho): ${email.mail_excerpt.trim()}`);
                    console.log(`Data: ${email.mail_date}`);
                    console.log('----------------------------');
                });

                // Processa todos os e-mails sem filtrar pelo remetente
                console.log("Processando todos os e-mails recebidos:");

                // Uso de Promise.all para processar e-mails em paralelo
                await Promise.all(data.list.map(async (email) => {
                    // Buscar o conteúdo completo do e-mail
                    const fullContent = await this.fetchEmail(email.mail_id);

                    if (!fullContent) {
                        // Se não foi possível obter o conteúdo, pule este e-mail
                        console.warn(`Pular e-mail ID ${email.mail_id} devido à falta de conteúdo.`);
                        console.log('----------------------------');
                        return;
                    }

                    // Extrair o código de transação
                    const transactionCode = this.extractTransactionCode(fullContent);

                    if (transactionCode) {
                        console.log(`Código da Transação: ${transactionCode}`);

                        // **Modificação Iniciada Aqui**
                        // Cria a URL com o código da transação
                        const postUrl = `http://localhost:4563/qrcodes/transaction/${transactionCode}/conclude`;

                        // Dados a serem enviados no corpo da requisição (se necessário)
                        const postDataPayload = {
                            completed: true
                        };
                        // **Modificação Finalizada Aqui**

                        // Enviar a requisição POST para a nova URL
                        const postSuccess = await this.postData(postUrl, postDataPayload);

                        if (postSuccess) {
                            // Remover o e-mail após receber 200
                            const deleteSuccess = await this.deleteEmail(email.mail_id);
                            if (deleteSuccess) {
                                console.log(`E-mail ID ${email.mail_id} removido com sucesso.`);
                            } else {
                                console.log(`Falha ao remover o e-mail ID ${email.mail_id}.`);
                            }
                        } else {
                            console.log(`Requisição POST falhou para o código de transação: ${transactionCode}.`);
                        }
                    } else {
                        console.log(`Código de Transação não encontrado no e-mail ID ${email.mail_id}.`);
                    }

                    console.log('----------------------------');
                }));
            } else {
                console.log('Nenhum e-mail encontrado.');
            }
        } catch (error) {
            console.error('Erro ao processar e-mails:', error);
        }
    }

    /**
     * Inicia o loop eterno que processa os e-mails a cada 10 segundos.
     */
    startLoop() {
        // Executa imediatamente na inicialização
        this.processTransactionEmails();

        // Configura o intervalo para executar a cada 10 segundos (10000 milissegundos)
        setInterval(() => {
            this.processTransactionEmails();
        }, 10000);
    }
}

// Instancia a classe para iniciar o processamento
new EmailProcessor();
