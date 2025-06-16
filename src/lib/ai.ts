// DeepSeek API integration for the ESGenius chatbot via OpenRouter

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Calls the DeepSeek API with the provided messages and PDF context via OpenRouter
 * @param messages - Array of chat messages
 * @param pdfContext - The extracted text from the PDF (optional)
 * @returns The AI response text
 */
export async function callDeepSeek(messages: Message[], pdfContext: string | null): Promise<string> {
  try {
    // Hardcoded API key - copied directly from the provided key
    const apiKey = "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";
    
    // Prepare the system message with PDF context if available
    let systemMessage = "You are ESGenius Assistant, an AI specialized in analyzing ESG (Environmental, Social, and Governance) reports. Provide helpful, accurate information about ESG topics and assist with understanding the content of ESG reports.";
    
    if (pdfContext) {
      systemMessage += "\n\nHere is the content of the current ESG report for reference:\n\n" + pdfContext;
    }

    // Prepare the message array for the API
    const messageArray = [
      {
        role: "system",
        content: systemMessage
      },
      ...messages
    ];

    console.log("Using API key:", apiKey);
    console.log("Making request to OpenRouter API");

    // Make the API request to OpenRouter
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": window.location.origin || "https://eco-glide-dashboard.com",
        "X-Title": "ESGenius Dashboard"
      },
      body: JSON.stringify({
        model: "deepseek/deepseek-r1-0528:free",
        messages: messageArray,
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    console.log("Response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Raw error response:", errorText);
      
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: { message: "Failed to parse error response" }};
      }
      
      throw new Error(`OpenRouter API error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error("Error calling DeepSeek API via OpenRouter:", error);
    throw error;
  }
} 