import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function getChatResponse(message: string, history: any[]) {
  const result = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: history.concat([{ role: 'user', parts: [{ text: message }] }]),
    config: {
      systemInstruction: "You are Aravalli AI, a helpful assistant specialized in environmental conservation, ecological data, and the Aravalli Range. Help users understand monitoring data, report illegal activities, and learn about conservation efforts.",
    },
  });

  return result.text;
}

export async function getAISuggestions() {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [{ role: 'user', parts: [{ text: "Generate 3 smart AI suggestions for Aravalli Range conservation. Each suggestion should have a title, description, impact level (High/Medium), and category (Conservation/Policy/Community). Return as JSON array." }] }],
    config: {
      responseMimeType: "application/json",
    }
  });
  return JSON.parse(response.text || "[]");
}

export async function analyzeSatelliteImage(base64Data: string, mimeType: string) {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: {
      parts: [
        {
          inlineData: {
            data: base64Data,
            mimeType: mimeType,
          },
        },
        {
          text: `Analyze this image. 
          If it is a satellite image of the Aravalli Hills, provide a very concise environmental summary based on:
          1. Geomorphological factors (slope profile, stability)
          2. Vegetation cover and health
          3. Structural factors (drainage patterns, tone/color)
          4. Surrounding features and visible threats.
          
          Keep the output extremely simple, easy to understand, and avoid long lists of bullet points. Use a few short sentences or a very brief summary.
          
          If it is NOT a satellite image of the Aravalli Hills (e.g., a selfie, a cat, food, or a different landscape), give a cute, funny, and slightly sassy reply explaining that this isn't the Aravalli surveillance feed we're looking for. Be creative and charming!`,
        },
      ],
    },
    config: {
      systemInstruction: "You are the Aravalli Satellite Intelligence System. You only care about the Aravalli Range. You have a moderation layer: if the image is not a satellite view of the Aravallis, you must be funny and cute in your rejection. If it is, be a world-class environmental scientist providing rapid, high-impact terrain assessments.",
    },
  });

  return response.text;
}

export async function generateActionPlan(suggestion: any) {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [{ role: 'user', parts: [{ text: `Generate a detailed action plan for this conservation suggestion: "${suggestion.title} - ${suggestion.description}". The plan should include 3-4 clear steps, estimated timeline, and required resources. Keep it concise and professional.` }] }],
    config: {
      systemInstruction: "You are a senior environmental policy advisor. You provide actionable, realistic conservation plans.",
    }
  });
  return response.text;
}

export async function analyzeRegion(coordinates: any) {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [{ role: 'user', parts: [{ text: `Analyze this specific region of the Aravalli Range for potential environmental anomalies. Coordinates: ${JSON.stringify(coordinates)}. Provide a concise assessment of potential risks like illegal mining, deforestation, or urban encroachment in this specific area. Keep it professional and actionable.` }] }],
    config: {
      systemInstruction: "You are the Aravalli Regional Intelligence Analyst. You provide precise, data-driven assessments of specific geographic regions within the Aravalli Range.",
    }
  });
  return response.text;
}

export async function generateCodePatch(prompt: string) {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [{ role: 'user', parts: [{ text: `Based on the following request, suggest the exact file path and the code block to be added or modified. Request: "${prompt}". Return as a JSON object with keys: "filePath", "code", and "explanation".` }] }],
    config: {
      responseMimeType: "application/json",
      systemInstruction: "You are a world-class senior full-stack engineer. You help developers generate precise code patches for the Aravalli Intelligence Platform. Always suggest realistic file paths like 'src/components/NewComponent.tsx' or 'src/App.tsx'.",
    }
  });
  return JSON.parse(response.text || "{}");
}
