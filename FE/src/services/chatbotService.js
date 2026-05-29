import httpClient from './httpClient.js';

const chatbotService = {
  query: (message) => {
    return httpClient.post('/customer/chatbot/query', { message });
  }
};

export default chatbotService;
