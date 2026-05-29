import axios from 'axios';
import db from '../models/index.js';

/**
 * Handle incoming chat message from user, proxy it to the Python RAG service
 */
export const query = async (req, res) => {
  try {
    const { message, restaurantId } = req.body;
    const sessionId = req.customerSessionId;
    
    if (!message) {
      return res.status(400).json({ success: false, error: 'Message is required' });
    }

    let history = [];
    let conversation = null;

    // Lấy hoặc tạo lịch sử hội thoại nếu có sessionId
    if (sessionId) {
      conversation = await db.ChatbotConversation.findOne({
        where: { sessionId, isActive: true },
        order: [['created_at', 'DESC']]
      });

      if (!conversation) {
        conversation = await db.ChatbotConversation.create({
          sessionId,
          restaurantId: restaurantId || 1, // Fallback to 1 if not provided
          isActive: true
        });
      } else {
        // Lấy 5 tin nhắn gần nhất
        const lastMessages = await db.ChatbotMessage.findAll({
          where: { conversationId: conversation.id },
          order: [['created_at', 'DESC']],
          limit: 5
        });
        
        history = lastMessages.reverse().map(msg => ({
          role: msg.senderType === 'bot' ? 'assistant' : 'user',
          content: msg.message
        }));
      }

      // Lưu tin nhắn của user
      await db.ChatbotMessage.create({
        conversationId: conversation.id,
        senderType: 'customer',
        message: message
      });
    }

    const vectorServiceUrl = process.env.VECTOR_SERVICE_URL || 'http://127.0.0.1:8001';
    
    // Call the Python FastAPI service
    const aiResponse = await axios.post(`${vectorServiceUrl}/chat`, {
      message: message,
      restaurantId: restaurantId || null,
      history: history.length > 0 ? history : null
    });

    const aiText = aiResponse.data.response;

    // Lưu phản hồi của AI
    if (conversation && aiText) {
      await db.ChatbotMessage.create({
        conversationId: conversation.id,
        senderType: 'bot',
        message: aiText
      });
    }

    return res.status(200).json({
      success: true,
      data: aiResponse.data
    });
  } catch (error) {
    console.error('Error proxying chat to AI service:', error.response?.data || error.message);
    
    return res.status(500).json({ 
      success: false, 
      error: 'AI Service is currently unavailable or encountered an error.',
      details: error.response?.data?.detail || error.message
    });
  }
};

export default {
  query
};
