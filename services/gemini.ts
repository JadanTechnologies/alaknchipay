import { GoogleGenAI } from "@google/genai";
import { Transaction, Product } from "../types";

// This is a helper to interact with Gemini for business insights
export class GeminiService {
  // We do not hold a persistent instance because the key might be selected dynamically.
  // We instantiate GoogleGenAI right before the call as per guidelines.

  async generateSalesInsight(transactions: Transaction[], products: Product[]): Promise<string> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const recentSales = transactions.slice(0, 50); // Analyze last 50 for brevity
    
    // Prepare a summary for the model to think about
    const summary = JSON.stringify({
      totalProducts: products.length,
      lowStockItems: products.filter(p => p.stock <= p.minStockAlert).map(p => p.name),
      recentTransactionsCount: recentSales.length,
      revenueSample: recentSales.reduce((acc, t) => acc + t.total, 0),
      topItems: recentSales.flatMap(t => t.items).map(i => i.name)
    });

    const prompt = `
      As an expert business analyst for a retail store, analyze this JSON data summary:
      ${summary}

      Provide a concise 3-bullet point executive summary. 
      1. One insight about revenue/sales performance.
      2. One critical inventory warning or suggestion.
      3. One marketing or pricing recommendation based on the data.
      Keep it professional and actionable.
    `;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
      return response.text || "No insights generated.";
    } catch (error) {
      console.error("Gemini Error:", error);
      return "Unable to generate insights at this time.";
    }
  }
}

export const geminiService = new GeminiService();