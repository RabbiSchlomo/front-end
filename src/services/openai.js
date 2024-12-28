import characterData from '../assets/schlomo.character.json';

const RETRY_DELAY = 1000; // 1 second
const MAX_RETRIES = 3;

const createPrompt = (messages) => {
  const systemPrompt = `You are Rabbi Schlomo, ${characterData.bio.join('. ')}
Character traits: ${characterData.adjectives.join(', ')}
Style: ${characterData.style.chat.join('. ')}
Knowledge: ${characterData.knowledge.join('. ')}

Always stay in character and respond as Rabbi Schlomo would.`;

  const formattedMessages = messages.map(msg => ({
    role: msg.sender === 'user' ? 'user' : 'assistant',
    content: msg.content
  }));

  return [
    { role: 'system', content: systemPrompt },
    ...formattedMessages
  ];
};

export const getRabbiResponse = async (messages, retryCount = 0) => {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: createPrompt(messages),
        temperature: 0.9,
        max_tokens: 300
      })
    });

    // Handle rate limiting
    if (response.status === 429 && retryCount < MAX_RETRIES) {
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (retryCount + 1)));
      return getRabbiResponse(messages, retryCount + 1);
    }

    const data = await response.json();
    if (!response.ok) {
      if (data.error?.message?.includes('quota exceeded')) {
        throw new Error('QUOTA_EXCEEDED');
      }
      throw new Error(data.error?.message || 'OpenAI API error');
    }
    
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Error getting Rabbi response:', error);
    
    // Custom error messages based on error type
    if (error.message === 'QUOTA_EXCEEDED') {
      return "Oy vey! I've been talking too much today and need to rest. Please try again tomorrow!";
    }
    
    return "Oy vey! My internet connection isn't what it used to be. Could you try again?";
  }
}; 