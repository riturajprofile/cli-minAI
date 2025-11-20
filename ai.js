export class AIClient {
    constructor(apiKey, baseURL) {
        this.apiKey = apiKey;
        this.baseURL = baseURL || 'https://api.openai.com/v1';
    }

    async sendMessage(messages) {
        try {
            let url = this.baseURL;
            if (!url.endsWith('/chat/completions')) {
                url = `${url.replace(/\/$/, '')}/chat/completions`;
            }

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: 'gpt-4o',
                    messages: messages
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error?.message || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data.choices[0].message;
        } catch (error) {
            console.error('Error calling AI API:', error);
            throw error;
        }
    }
}
