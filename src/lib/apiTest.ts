/**
 * Test file for OpenRouter API connectivity
 */

export async function testOpenRouterConnection() {
  try {
    const apiKey = "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";
    
    console.log("Starting OpenRouter API test with key:", apiKey);
    
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": "https://eco-glide-dashboard.com",
        "X-Title": "ESGenius Dashboard"
      },
      body: JSON.stringify({
        model: "deepseek/deepseek-r1-0528:free",
        messages: [
          {
            role: "user",
            content: "Hello, this is a test message"
          }
        ],
        temperature: 0.7,
        max_tokens: 100
      })
    });
    
    console.log("Test response status:", response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Raw error response:", errorText);
      return {
        success: false,
        error: errorText
      };
    }
    
    const data = await response.json();
    return {
      success: true,
      data
    };
  } catch (error) {
    console.error("Test connection error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
} 