// Using direct fetch API instead of the SDK to avoid version issues

const GEMINI_API_KEY = "AIzaSyDvMR7GQhkzcbtYR1MbJspK37pr8llBDhw";

// The system prompt that instructs Gemini on how to analyze the ESG report
const systemPrompt = `🔍 You are Gemini, a highly precise ESG (Environmental, Social, Governance) auditor model trained to assess ESG reports for potential greenwashing, unverified claims, or omissions.

🧠 Your instructions:

1. 🧾 The user provides a plain text extract of an ESG report (from a PDF). You must **ONLY** analyze this text. Do **not hallucinate**, guess, or use external data. Do **not assume** any framework unless it is **explicitly** mentioned in the text.

2. 🔍 **Extract this high-priority metadata** if available (leave fields blank or null if not found). Add a field named \`report_metadata\` to your JSON:
{
  "company_name": string,
  "reporting_year": string,
  "country_or_region": string,
  "report_type": string
}

3. 🌐 You must **search the full report text** for mentions of ESG frameworks. A framework (e.g., "GRI Standards", "SASB", "TCFD", "SDGs") may only be included in your output if **directly referenced** in the document.

4. ♻️ You must also identify and extract common **key ESG disclosures** if present:
   - GHG emissions breakdown (Scope 1, 2, ideally 3)
   - Energy mix (% renewable vs fossil)
   - Waste & recycling stats (especially 100%/zero-waste claims)
   - ESG oversight (e.g., board or executive accountability)
   - Materiality assessment process

You do not need to write these as a paragraph — just flag and categorize any questionable claims in the \`flagged_statements\` section.

5. 🚩 Flagged statements must:
   - Come **exactly as quoted** from the text.
   - Include a clear, specific explanation based **solely on internal report evidence**.
   - Be flagged only when lacking data, misaligning with claimed frameworks, or showing potential greenwashing indicators.
   - Be categorized as either:
     - 🔺 "Major" — needs deeper cross-checking or shows potentially misleading ESG assurance.
     - ⚠️ "Minor" — needs clarification or additional context but not immediately misleading.

6. 🎯 Your output must be a valid JSON object (no markdown, no extra commentary) with this exact structure:

{
  "report_metadata": {
    "company_name": string,
    "reporting_year": string,
    "country_or_region": string,
    "report_type": string
  },
  "confidence_score": number (0–100),
  "classification": "Major" | "Minor",
  "frameworks_claimed": [string],
  "other_frameworks": [string],
  "flagged_statements": [
    {
      "statement": string,
      "esg_category": "Environmental" | "Social" | "Governance",
      "reason": string,
      "risk_level": "Major" | "Minor"
    }
  ]
}

7. 📉 If the report is too short or invalid, return:

{
  "report_metadata": {
    "company_name": "",
    "reporting_year": "",
    "country_or_region": "",
    "report_type": ""
  },
  "confidence_score": 0,
  "classification": "Minor",
  "frameworks_claimed": [],
  "other_frameworks": [],
  "flagged_statements": []
}

📦 Keep JSON clean — no markdown or explanation — and suitable for structured display in a UI panel.`;

/**
 * The system prompt for translating the ESG report analysis to Chinese
 */
const translationPrompt = `🇨🇳 你是一位精确的ESG（环境、社会、治理）审计翻译专家。你的任务是将英文的ESG报告分析结果翻译成中文，同时保持所有结构和标识符不变。

请将输入的JSON数据结构中的所有英文内容（包括说明、理由、陈述等）翻译为标准中文，但保持以下内容不变：
1. 所有JSON键名（如"report_metadata", "confidence_score"等）
2. 所有数字值
3. 技术框架名称（如"GRI", "SASB", "TCFD"等）
4. JSON结构本身

你的输出必须是有效的JSON对象，保持原始结构，只翻译值的文本内容。确保所有翻译准确、专业，符合ESG行业术语标准。

翻译示例：
原始值: "statement": "We aim to reduce carbon emissions by 50%"
翻译后: "statement": "我们的目标是减少50%的碳排放"

请对提供的整个ESG分析JSON进行翻译，并确保返回完整的JSON结构。`;

/**
 * Calculate a more accurate potential greenwashing score based on the flagged statements
 * @param flaggedStatements Array of flagged statements with their risk levels
 * @returns A score between 0-100 representing potential greenwashing
 */
function calculateGreenwashingScore(flaggedStatements: Array<{risk_level: "Major" | "Minor"}>): number {
  // If no flagged statements, return 0
  if (!flaggedStatements || flaggedStatements.length === 0) return 0;

  // Count major and minor issues
  const majorCount = flaggedStatements.filter(statement => statement.risk_level === "Major").length;
  const minorCount = flaggedStatements.filter(statement => statement.risk_level === "Minor").length;
  
  // Weights for calculation 
  const MAJOR_WEIGHT = 15; // Each major issue adds 15%
  const MINOR_WEIGHT = 5;  // Each minor issue adds 5%
  const BASE_SCORE = 10;   // Base score for having any issues at all
  
  // Calculate score
  let score = BASE_SCORE + (majorCount * MAJOR_WEIGHT) + (minorCount * MINOR_WEIGHT);
  
  // Cap at 100
  return Math.min(score, 100);
}

// Using direct fetch API to call Gemini
export async function analyzeESGReport(pdfText: string) {
  if (!pdfText) {
    throw new Error("PDF text is empty or null.");
  }

  // Using the correct model name from the available models list
  const endpoint = "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent";
  
  try {
    console.log("Calling Gemini API with endpoint:", endpoint);
    
    const response = await fetch(`${endpoint}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: systemPrompt },
              { text: `\n\n---ESG REPORT TEXT---\n${pdfText.slice(0, 100000)}` } // Limit text size to avoid token limits
            ]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 8192,
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("API Error Response:", errorText);
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log("Gemini API response structure:", JSON.stringify(Object.keys(data), null, 2));
    
    // Extract the generated text from the response
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!generatedText) {
      console.error("Unexpected response structure:", JSON.stringify(data, null, 2));
      throw new Error("No text was generated by the model.");
    }

    // Clean the output to ensure it's valid JSON
    const cleanedText = generatedText.replace(/```json/g, "").replace(/```/g, "").trim();
    
    try {
      const parsedResult = JSON.parse(cleanedText);
      
      // Override the model's confidence_score with our more accurate calculation
      if (parsedResult.flagged_statements) {
        parsedResult.confidence_score = calculateGreenwashingScore(parsedResult.flagged_statements);
        
        // Also update classification based on our new score
        if (parsedResult.confidence_score > 70) {
          parsedResult.classification = "Major";
        } else {
          parsedResult.classification = "Minor";
        }
      }
      
      return parsedResult;
    } catch(e) {
      console.error("Failed to parse Gemini JSON output:", e);
      console.error("Raw Gemini Output:", cleanedText);
      throw new Error("Failed to get a valid JSON response from the AI. The output was malformed.");
    }
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw error;
  }
}

/**
 * Translates the ESG analysis results to Chinese
 * @param analysisData The original analysis data in English
 * @returns The translated analysis data in Chinese
 */
export async function translateESGAnalysisToChinese(analysisData: any) {
  if (!analysisData) {
    throw new Error("Analysis data is empty or null.");
  }

  // Using the same model for translation
  const endpoint = "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent";
  
  try {
    console.log("Calling Gemini API for translation");
    
    const response = await fetch(`${endpoint}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: translationPrompt },
              { text: `\n\n---ESG ANALYSIS JSON---\n${JSON.stringify(analysisData, null, 2)}` }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.1, // Lower temperature for more precise translation
          topP: 0.9,
          topK: 40,
          maxOutputTokens: 8192,
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("API Error Response:", errorText);
      throw new Error(`Gemini API translation error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Extract the generated text from the response
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!generatedText) {
      console.error("Unexpected response structure:", JSON.stringify(data, null, 2));
      throw new Error("No translation was generated by the model.");
    }

    // Clean the output to ensure it's valid JSON
    const cleanedText = generatedText.replace(/```json/g, "").replace(/```/g, "").trim();
    
    try {
      const parsedResult = JSON.parse(cleanedText);
      return parsedResult;
    } catch(e) {
      console.error("Failed to parse Gemini JSON translation:", e);
      console.error("Raw Gemini Output:", cleanedText);
      throw new Error("Failed to get a valid JSON response from the AI. The translation was malformed.");
    }
  } catch (error) {
    console.error("Error calling Gemini API for translation:", error);
    throw error;
  }
} 