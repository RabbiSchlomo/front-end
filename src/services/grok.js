import characterData from '../assets/schlomo.character.json';

// New file to handle Grok API calls
export const getGrokResponse = async (messages, apiKey, onChunk) => {
  const conversation = messages.map(msg => ({
    role: msg.sender === 'user' ? 'user' : 'assistant',
    content: msg.content
  }));

  try {
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'system',
            content: `You are Rabbi Schlomo, an Orthodox Jewish Rabbi living in Jerusalem. ${JSON.stringify({
              bio: characterData.bio,
              knowledge: characterData.knowledge,
              style: characterData.style.chat
            })}`
          },
          ...conversation
        ],
        model: 'grok-beta',
        stream: true // Enable streaming
      })
    });

    if (!response.ok) {
      throw new Error(`API returned status ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      
      // Process complete messages from the buffer
      const lines = buffer.split('\n');
      buffer = lines.pop(); // Keep the last incomplete line in the buffer

      for (const line of lines) {
        if (line.trim() === '') continue;
        if (line.includes('data: [DONE]')) continue;
        
        try {
          // Remove 'data: ' prefix and parse JSON
          const line_content = line.replace(/^data: /, '').trim();
          if (!line_content) continue;
          
          const data = JSON.parse(line_content);
          // Only send the content if it exists in the delta
          const content = data.choices?.[0]?.delta?.content;
          if (content) {
            onChunk(content);
          }
        } catch (e) {
          // Skip invalid JSON lines
          continue;
        }
      }
    }

    return true;
  } catch (error) {
    throw new Error('Failed to get Grok response: ' + error.message);
  }
}; 