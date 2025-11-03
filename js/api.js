/**
 * API client for OpenAI-compatible endpoints
 * Handles communication with LLM backends (llama.cpp, llama-swap, etc.)
 */

/**
 * API Client class
 */
class APIClient {
  constructor(endpoint) {
    this.endpoint = endpoint;
  }

  /**
   * Get list of available models
   * @returns {Promise<Array>} Array of model objects
   */
  async getModels() {
    try {
      const response = await fetch(`${this.endpoint}/models`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Handle different response formats
      if (data.data && Array.isArray(data.data)) {
        return data.data.map(model => ({
          id: model.id || model.model,
          name: model.id || model.model,
          created: model.created,
          ownedBy: model.owned_by || model.ownedBy || 'local'
        }));
      }
      
      return [];
    } catch (error) {
      console.error('Failed to fetch models:', error);
      throw error;
    }
  }

  /**
   * Send chat completion request with streaming
   * @param {Array} messages - Array of message objects
   * @param {Object} options - Request options
   * @param {Function} onChunk - Callback for each streamed chunk
   * @param {Function} onStats - Callback for stats updates
   * @returns {Promise<Object>} Complete response
   */
  async chatCompletion(messages, options = {}, onChunk = null, onStats = null) {
    const {
      model,
      temperature = 0.7,
      maxTokens = 2048,
      topP = 0.9,
      stream = true,
      systemPrompt = null
    } = options;

    // Build messages array with system prompt if provided
    const apiMessages = [];
    if (systemPrompt) {
      apiMessages.push({
        role: 'system',
        content: systemPrompt
      });
    }
    apiMessages.push(...messages);

    const requestBody = {
      model,
      messages: apiMessages,
      temperature,
      max_tokens: maxTokens,
      top_p: topP,
      stream
    };

    try {
      const startTime = Date.now();
      let firstTokenTime = null;
      let totalTokens = 0;
      let completeContent = '';

      const response = await fetch(`${this.endpoint}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      if (!stream) {
        // Non-streaming response
        const data = await response.json();
        const content = data.choices[0]?.message?.content || '';
        
        if (onStats) {
          onStats({
            totalTokens: data.usage?.total_tokens || 0,
            promptTokens: data.usage?.prompt_tokens || 0,
            completionTokens: data.usage?.completion_tokens || 0,
            totalTime: Date.now() - startTime
          });
        }
        
        return {
          content,
          usage: data.usage,
          model: data.model
        };
      }

      // Streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === 'data: [DONE]') continue;
          
          if (trimmed.startsWith('data: ')) {
            try {
              const jsonStr = trimmed.substring(6);
              const data = JSON.parse(jsonStr);
              
              const delta = data.choices[0]?.delta?.content;
              if (delta) {
                if (!firstTokenTime) {
                  firstTokenTime = Date.now();
                }
                
                totalTokens++;
                completeContent += delta;
                
                if (onChunk) {
                  onChunk(delta, completeContent);
                }
                
                // Update stats periodically
                if (onStats && totalTokens % 5 === 0) {
                  const currentTime = Date.now();
                  const totalTime = currentTime - startTime;
                  const generationTime = currentTime - (firstTokenTime || startTime);
                  
                  onStats({
                    totalTokens,
                    tokensPerSecond: generationTime > 0 ? (totalTokens / (generationTime / 1000)).toFixed(2) : 0,
                    timeToFirstToken: firstTokenTime ? firstTokenTime - startTime : 0,
                    totalTime
                  });
                }
              }

              // Check for finish reason
              if (data.choices[0]?.finish_reason) {
                break;
              }
            } catch (e) {
              console.warn('Failed to parse streaming chunk:', e, trimmed);
            }
          }
        }
      }

      const totalTime = Date.now() - startTime;
      const generationTime = (firstTokenTime || startTime) - startTime;

      // Final stats update
      if (onStats) {
        onStats({
          totalTokens,
          tokensPerSecond: generationTime > 0 ? (totalTokens / (generationTime / 1000)).toFixed(2) : 0,
          timeToFirstToken: firstTokenTime ? firstTokenTime - startTime : 0,
          totalTime,
          complete: true
        });
      }

      return {
        content: completeContent,
        usage: {
          completion_tokens: totalTokens
        }
      };
    } catch (error) {
      console.error('Chat completion failed:', error);
      throw error;
    }
  }

  /**
   * Test connection to the endpoint
   * @returns {Promise<boolean>} Connection status
   */
  async testConnection() {
    try {
      const response = await fetch(`${this.endpoint}/models`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      return response.ok;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  /**
   * Update endpoint URL
   * @param {string} endpoint - New endpoint URL
   */
  setEndpoint(endpoint) {
    this.endpoint = endpoint;
  }

  /**
   * Get current endpoint
   * @returns {string} Current endpoint URL
   */
  getEndpoint() {
    return this.endpoint;
  }
}

/**
 * Create API client from storage settings
 * @param {Object} storage - Storage instance
 * @returns {APIClient} API client instance
 */
export function createClientFromStorage(storage) {
  const endpoint = storage.getActiveEndpoint();
  if (!endpoint) {
    throw new Error('No active endpoint configured');
  }
  return new APIClient(endpoint.url);
}

export default APIClient;
