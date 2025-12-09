import { GoogleGenAI, Type, Schema, Modality } from "@google/genai";
import { RECIPE_GENERATION_SYSTEM_INSTRUCTION } from "../constants";
import { Recipe } from "../types";

// Helper to get API key
const getApiKey = () => process.env.API_KEY || '';

// Define Schema for structured output
const recipeSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    description: { type: Type.STRING },
    cuisineStyle: { type: Type.STRING },
    difficulty: { type: Type.STRING, enum: ['Easy', 'Medium', 'Hard', 'Expert'] },
    totalTime: { type: Type.STRING },
    ingredientsFound: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING } 
    },
    pantryItemsNeeded: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING } 
    },
    steps: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          instruction: { type: Type.STRING },
          tip: { type: Type.STRING },
          duration: { type: Type.STRING }
        },
        required: ['instruction']
      }
    }
  },
  required: ['title', 'description', 'difficulty', 'ingredientsFound', 'steps']
};

export const generateRecipeFromInput = async (
  images: string[], 
  audioBase64: string | null,
  audioMimeType?: string,
  textPrompt?: string,
  constraints: string[] = []
): Promise<Recipe> => {
  if (!getApiKey()) throw new Error("API Key missing");

  const ai = new GoogleGenAI({ apiKey: getApiKey() });

  const parts: any[] = [];
  
  // Add images
  images.forEach(img => {
    parts.push({
      inlineData: {
        mimeType: 'image/jpeg',
        data: img
      }
    });
  });

  // Add audio if present
  if (audioBase64) {
    parts.push({
      inlineData: {
        mimeType: audioMimeType || 'audio/wav',
        data: audioBase64
      }
    });
  }

  // Construct constraint string
  const constraintText = constraints.length > 0 
    ? `CRITICAL CONSTRAINTS: The user has the following limitations: ${constraints.join(', ')}. You MUST strictly adhere to these. Do not use equipment that is restricted (e.g. if 'No Stove', use microwave, oven, or raw prep only).`
    : "";

  // Add text prompt or default instruction
  if (textPrompt) {
    parts.push({ text: `User text request: "${textPrompt}". ${constraintText} Create a recipe based on this.` });
  } else if (!audioBase64) {
    parts.push({ text: `I have these ingredients. ${constraintText} Make me something delicious.` });
  } else {
    // If audio is present, just append constraints to context
    parts.push({ text: constraintText });
  }

  // Add final prompt
  parts.push({ text: "Analyze the ingredients and the user request. Create a recipe." });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', // Updated to 3-pro for thinking
      contents: { parts },
      config: {
        systemInstruction: RECIPE_GENERATION_SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: recipeSchema,
        thinkingConfig: { thinkingBudget: 32768 }, // Max thinking budget for deep reasoning
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response generated");
    
    const rawRecipe = JSON.parse(text);
    
    // Enrich with local data
    return {
      ...rawRecipe,
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
      createdAt: Date.now(),
      constraints: constraints // Store constraints in the recipe
    } as Recipe;

  } catch (error) {
    console.error("Recipe Generation Error:", error);
    throw error;
  }
};

export const generateDishImage = async (title: string, description: string): Promise<string> => {
  if (!getApiKey()) throw new Error("API Key missing");

  const ai = new GoogleGenAI({ apiKey: getApiKey() });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{
          text: `A beautiful, appetizing, professional food photo of ${title}. ${description}. Cinematic lighting, 4k.`
        }]
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData && part.inlineData.data) {
        return part.inlineData.data;
      }
    }
    throw new Error("No image data found in response");
  } catch (error) {
    console.error("Image Gen Error:", error);
    throw error; 
  }
};

export const generateTTS = async (text: string): Promise<string> => {
  if (!getApiKey()) throw new Error("API Key missing");
  const ai = new GoogleGenAI({ apiKey: getApiKey() });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' }, 
          },
        },
      },
    });

    const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!audioData) throw new Error("No audio generated");
    return audioData;

  } catch (error) {
    console.error("TTS Error:", error);
    throw error;
  }
};