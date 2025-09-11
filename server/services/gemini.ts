import { GoogleGenAI } from "@google/genai";

console.log('Initializing Gemini AI with key:', {
  keyExists: !!process.env.GEMINI_API_KEY,
  keyPrefix: process.env.GEMINI_API_KEY?.substring(0, 10) + '...',
  viteKeyExists: !!process.env.VITE_GEMINI_API_KEY
});

const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || "" 
});

export interface ExtractedBetData {
  sport: string;
  event: string;
  betType: string;
  odds: string;
  stake: string;
  potentialPayout: string;
  confidence: number;
}

export async function extractBetDataFromImage(imageBuffer: Buffer, mimeType: string): Promise<ExtractedBetData> {
  try {
    console.log('Starting Gemini AI processing with:', {
      bufferSize: imageBuffer.length,
      mimeType,
      apiKeyExists: !!process.env.GEMINI_API_KEY
    });

    // Test simple text generation first
    try {
      const testResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: "Say 'API connection works'"
      });
      console.log('API test successful:', testResponse.text);
    } catch (testError) {
      console.error('API test failed:', testError);
      throw testError;
    }

    const systemPrompt = `You are a sports betting data extraction expert. 
Analyze the betting slip screenshot and extract the following information:
- sport: The sport type (NFL, NBA, MLB, NHL, Soccer, etc.)
- event: The teams or event name (e.g., "Lakers vs Warriors", "Patriots vs Bills")
- betType: Type of bet (Moneyline, Spread, Over/Under, Parlay, etc.)
- odds: The odds format (+155, -110, 2.50, etc.)
- stake: The amount wagered (extract number only, no currency symbol)
- potentialPayout: The potential payout amount (extract number only, no currency symbol)
- confidence: Your confidence in the extraction accuracy (0-1)

Respond with JSON in the exact format specified. If you cannot extract certain fields, use reasonable defaults or indicate uncertainty.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            sport: { type: "string" },
            event: { type: "string" },
            betType: { type: "string" },
            odds: { type: "string" },
            stake: { type: "string" },
            potentialPayout: { type: "string" },
            confidence: { type: "number" }
          },
          required: ["sport", "event", "betType", "odds", "stake", "potentialPayout", "confidence"]
        }
      },
      contents: [
        {
          inlineData: {
            data: imageBuffer.toString("base64"),
            mimeType: mimeType,
          },
        },
        "Extract all betting information from this screenshot with high accuracy."
      ]
    });

    const rawJson = response.text;
    if (!rawJson) {
      throw new Error("Empty response from Gemini");
    }

    const extractedData: ExtractedBetData = JSON.parse(rawJson);
    console.log('Successfully extracted data:', extractedData);
    return extractedData;

  } catch (error) {
    console.error("Gemini extraction error:", error);
    throw new Error(`Failed to extract bet data: ${error}`);
  }
}

export async function validateBetData(data: ExtractedBetData): Promise<boolean> {
  // Basic validation of extracted data
  if (!data.sport || !data.event || !data.odds || !data.stake) {
    return false;
  }
  
  // Check if stake is a valid number
  const stakeNum = parseFloat(data.stake);
  if (isNaN(stakeNum) || stakeNum <= 0) {
    return false;
  }
  
  // Check if potential payout is valid
  const payoutNum = parseFloat(data.potentialPayout);
  if (isNaN(payoutNum) || payoutNum <= 0) {
    return false;
  }
  
  return true;
}
