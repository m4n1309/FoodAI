import axios from 'axios';

const RAG_SERVICE_URL = process.env.VECTOR_SERVICE_URL || 'http://127.0.0.1:8001';

/**
 * Trigger RAG service ingestion for a specific restaurant or all restaurants.
 * This runs asynchronously to avoid blocking the main server response.
 * 
 * @param {string|number|null} restaurantId 
 */
export const triggerRAGSync = async (restaurantId = null) => {
  try {
    const payload = {
      restaurantId: restaurantId ? parseInt(restaurantId, 10) : null
    };
    
    // Call the ingest endpoint on python_rag_service
    axios.post(`${RAG_SERVICE_URL}/ingest`, payload)
      .then((res) => {
        console.log(`[RAG Sync] Success for restaurant ${restaurantId || 'All'}:`, res.data);
      })
      .catch((err) => {
        console.error(`[RAG Sync] Failed for restaurant ${restaurantId || 'All'}:`, err.response?.data || err.message);
      });
      
  } catch (error) {
    console.error(`[RAG Sync] Error triggering sync for restaurant ${restaurantId || 'All'}:`, error.message);
  }
};

export default {
  triggerRAGSync
};
