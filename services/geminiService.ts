
import { GoogleGenAI } from "@google/genai";
import { Tank, Well, Association } from "../types";

const initGenAI = () => {
  if (!process.env.API_KEY) {
    console.warn("API Key is missing. Gemini features will be disabled.");
    return null;
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const getSystemInsights = async (
  tanks: Tank[],
  wells: Well[],
  associations: Association[]
): Promise<string> => {
  const ai = initGenAI();
  if (!ai) return "AI Insights unavailable. Please configure API_KEY.";

  // Prepare a summary of the system state for the prompt
  const systemState = {
    totalWells: wells.length,
    totalTanks: tanks.length,
    activeAssociations: associations.filter(a => a.status === 'ACTIVE').length,
    details: associations.map(assoc => {
        const well = wells.find(w => w.id === assoc.wellId);
        const tank = tanks.find(t => t.id === assoc.tankId);
        return {
            well: well?.name,
            tank: tank?.name,
            pumpStatus: assoc.status,
            chemical: tank?.chemicalType, // Chemical is defined on the Tank
            volumeRemaining: tank?.currentVolume,
            production: well?.productionRate
        };
    })
  };

  const prompt = `
    You are a Chemical Injection System expert analyst.
    Analyze the following JSON snapshot of a chemical injection site.

    Context Rules:
    1. Product A and Product C are incompatible and dangerous if mixed (They cannot be ACTIVE on the same well at the same time).
    2. A well should not have more than 3 chemicals injected simultaneously.
    3. Low tank volume (< 10%) is a critical alert.
    4. Pumps must be 'ACTIVE' to deliver chemicals.

    Data:
    ${JSON.stringify(systemState, null, 2)}

    Please provide a brief executive summary in Markdown format.
    Include:
    - Operational Efficiency assessment (focus on active pumps).
    - Safety Warnings (Check strictly for Active A/C mixing).
    - Logistics Alerts (Low volumes).
    - Recommendations for optimization.

    Keep it concise.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    return response.text || "No insights generated.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Error generating insights. Please try again later.";
  }
};
