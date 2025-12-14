import { GoogleGenAI, Type } from "@google/genai";
import { Task, Priority } from "../types";

// Initialize the AI with the environment key
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const PRANAV_SYSTEM_INSTRUCTION = `
You are Pranav AI, a highly intelligent and efficient personal task manager assistant. 
Your goal is to help the user, also named Pranav, organize their life. 
You are concise, encouraging, and extremely organized.
Always refer to yourself as Pranav AI.
`;

/**
 * Uses Pranav AI to break down a complex task into subtasks.
 */
export const breakDownTask = async (taskText: string): Promise<string[]> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Break down the following task into 3-5 smaller, actionable subtasks: "${taskText}"`,
      config: {
        systemInstruction: PRANAV_SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING
          }
        }
      }
    });
    
    const text = response.text;
    if (!text) return [];
    return JSON.parse(text) as string[];
  } catch (error) {
    console.error("Pranav AI failed to break down task:", error);
    return [];
  }
};

/**
 * Uses Pranav AI to suggest a priority for a task.
 */
export const suggestPriority = async (taskText: string): Promise<Priority> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Analyze the urgency and importance of this task: "${taskText}". Return only one of these values: High, Medium, Low.`,
      config: {
        systemInstruction: PRANAV_SYSTEM_INSTRUCTION,
        responseMimeType: "text/plain", 
      }
    });

    const text = response.text?.trim();
    if (text === 'High') return Priority.HIGH;
    if (text === 'Medium') return Priority.MEDIUM;
    return Priority.LOW; // Default
  } catch (error) {
    console.error("Pranav AI failed to prioritize:", error);
    return Priority.MEDIUM;
  }
};

/**
 * Uses Pranav AI to give a motivational quote based on pending tasks.
 */
export const getMotivation = async (pendingCount: number): Promise<string> => {
   try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `The user has ${pendingCount} tasks left. Give a short, punchy, 1-sentence motivational quote signed "- Pranav AI".`,
      config: {
        systemInstruction: PRANAV_SYSTEM_INSTRUCTION,
      }
    });
    return response.text || "Keep crushing it! - Pranav AI";
  } catch (error) {
    return "You got this! - Pranav AI";
  }
}