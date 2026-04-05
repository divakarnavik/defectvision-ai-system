/**
 * AI Service Module - Multi-provider AI integration
 * Supports: Google Gemini Vision API & Groq (Llama Vision)
 */

import { DefectType } from '../types';

// --- Storage Keys ---
const API_KEY_STORAGE = 'defectvision_gemini_api_key';
const GROQ_KEY_STORAGE = 'defectvision_groq_api_key';
const AI_ENABLED_STORAGE = 'defectvision_ai_enabled';
const AI_PROVIDER_STORAGE = 'defectvision_ai_provider';

// --- API URLs ---
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

export type AIProvider = 'gemini' | 'groq';

export interface AIDetectedDefect {
  type: DefectType;
  confidence: number;
  x: number;
  y: number;
  w: number;
  h: number;
  description: string;
}

export interface AIAnalysisResult {
  success: boolean;
  defects: AIDetectedDefect[];
  summary: string;
  error?: string;
  provider?: AIProvider;
}

// --- Provider Management ---

export function getProvider(): AIProvider {
  return (localStorage.getItem(AI_PROVIDER_STORAGE) as AIProvider) || 'gemini';
}

export function setProvider(provider: AIProvider): void {
  localStorage.setItem(AI_PROVIDER_STORAGE, provider);
}

// --- API Key Management ---

export function setApiKey(key: string, provider?: AIProvider): void {
  const p = provider || getProvider();
  if (p === 'groq') {
    localStorage.setItem(GROQ_KEY_STORAGE, key.trim());
  } else {
    localStorage.setItem(API_KEY_STORAGE, key.trim());
  }
}

export function getApiKey(provider?: AIProvider): string {
  const p = provider || getProvider();
  if (p === 'groq') {
    return localStorage.getItem(GROQ_KEY_STORAGE) || '';
  }
  return localStorage.getItem(API_KEY_STORAGE) || '';
}

export function clearApiKey(provider?: AIProvider): void {
  const p = provider || getProvider();
  if (p === 'groq') {
    localStorage.removeItem(GROQ_KEY_STORAGE);
  } else {
    localStorage.removeItem(API_KEY_STORAGE);
  }
}

export function setAIEnabled(enabled: boolean): void {
  localStorage.setItem(AI_ENABLED_STORAGE, enabled ? 'true' : 'false');
}

export function isAIEnabled(): boolean {
  const provider = getProvider();
  const key = getApiKey(provider);
  const enabled = localStorage.getItem(AI_ENABLED_STORAGE);
  return key.length > 0 && enabled !== 'false';
}

// --- Image Conversion ---

function dataUrlToBase64(dataUrl: string): { base64: string; mimeType: string } {
  const match = dataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
  if (!match) {
    const parts = dataUrl.split(',');
    const mimeMatch = parts[0]?.match(/data:(image\/\w+)/);
    return {
      mimeType: mimeMatch ? mimeMatch[1] : 'image/png',
      base64: parts[1] || '',
    };
  }
  return { mimeType: match[1], base64: match[2] };
}

// --- Shared Prompt ---

const DEFECT_ANALYSIS_PROMPT = `You are an expert industrial quality inspector AI. Analyze this image for surface defects, damages, and imperfections.

DEFECT CATEGORIES (use exactly these labels):
- "crack" — Visible fracture lines, stress fractures, hairline cracks
- "scratches" — Linear surface marks, scuffs, abrasion marks, tool marks
- "damage" — Dents, gouges, impact marks, surface degradation, corrosion
- "broken" — Structural fracture, chipped edges, shattered sections, missing material

INSTRUCTIONS:
1. Carefully examine the ENTIRE image for any defects
2. For each defect found, estimate its bounding box as normalized coordinates (0.0 to 1.0 relative to image dimensions)
3. Assign a confidence score (0.0 to 1.0) based on how certain you are
4. If the image shows a clean/perfect surface with NO defects, return an empty defects array
5. Be accurate — do NOT hallucinate defects on clean surfaces, but DO catch subtle real defects

RESPOND ONLY with valid JSON in this exact format (no markdown, no code fences):
{
  "defects": [
    {
      "type": "crack",
      "confidence": 0.92,
      "x": 0.15,
      "y": 0.20,
      "w": 0.30,
      "h": 0.05,
      "description": "Hairline crack running diagonally across upper surface"
    }
  ],
  "summary": "Brief overall assessment of the surface condition"
}

If no defects are found:
{
  "defects": [],
  "summary": "Surface appears clean with no visible defects"
}`;

// --- Gemini Vision API ---

async function analyzeWithGemini(imageDataUrl: string): Promise<AIAnalysisResult> {
  const apiKey = getApiKey('gemini');
  if (!apiKey) {
    return { success: false, defects: [], summary: '', error: 'No Gemini API key configured', provider: 'gemini' };
  }

  const { base64, mimeType } = dataUrlToBase64(imageDataUrl);
  if (!base64) {
    return { success: false, defects: [], summary: '', error: 'Invalid image data', provider: 'gemini' };
  }

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: DEFECT_ANALYSIS_PROMPT },
            { inlineData: { mimeType, data: base64 } },
          ],
        }],
        generationConfig: { temperature: 0.1, topP: 0.8, maxOutputTokens: 2048 },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const errorMsg = errorData?.error?.message || `API error: ${response.status}`;
      if (response.status === 400) return { success: false, defects: [], summary: '', error: 'Invalid Gemini API key', provider: 'gemini' };
      if (response.status === 429) return { success: false, defects: [], summary: '', error: 'Gemini rate limit exceeded. Try again shortly.', provider: 'gemini' };
      return { success: false, defects: [], summary: '', error: errorMsg, provider: 'gemini' };
    }

    const data = await response.json();
    const textContent = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textContent) return { success: false, defects: [], summary: '', error: 'Empty response from Gemini', provider: 'gemini' };

    return { ...parseAIResponse(textContent), provider: 'gemini' };
  } catch (err) {
    return { success: false, defects: [], summary: '', error: `Gemini error: ${(err as Error).message}`, provider: 'gemini' };
  }
}

// --- Groq (Llama Vision) API ---

async function analyzeWithGroq(imageDataUrl: string): Promise<AIAnalysisResult> {
  const apiKey = getApiKey('groq');
  if (!apiKey) {
    return { success: false, defects: [], summary: '', error: 'No Groq API key configured', provider: 'groq' };
  }

  const { base64, mimeType } = dataUrlToBase64(imageDataUrl);
  if (!base64) {
    return { success: false, defects: [], summary: '', error: 'Invalid image data', provider: 'groq' };
  }

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-4-scout-17b-16e-instruct',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: DEFECT_ANALYSIS_PROMPT },
              {
                type: 'image_url',
                image_url: { url: `data:${mimeType};base64,${base64}` },
              },
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: 2048,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const errorMsg = errorData?.error?.message || `API error: ${response.status}`;
      if (response.status === 401) return { success: false, defects: [], summary: '', error: 'Invalid Groq API key', provider: 'groq' };
      if (response.status === 429) return { success: false, defects: [], summary: '', error: 'Groq rate limit exceeded. Try again shortly.', provider: 'groq' };
      return { success: false, defects: [], summary: '', error: errorMsg, provider: 'groq' };
    }

    const data = await response.json();
    const textContent = data?.choices?.[0]?.message?.content;
    if (!textContent) return { success: false, defects: [], summary: '', error: 'Empty response from Groq', provider: 'groq' };

    return { ...parseAIResponse(textContent), provider: 'groq' };
  } catch (err) {
    return { success: false, defects: [], summary: '', error: `Groq error: ${(err as Error).message}`, provider: 'groq' };
  }
}

// --- Unified Analyze Function ---

export async function analyzeImageWithAI(imageDataUrl: string): Promise<AIAnalysisResult> {
  const provider = getProvider();
  if (provider === 'groq') {
    return analyzeWithGroq(imageDataUrl);
  }
  return analyzeWithGemini(imageDataUrl);
}

// --- Validate API Key ---

export async function validateApiKey(key: string, provider?: AIProvider): Promise<{ valid: boolean; error?: string }> {
  const p = provider || getProvider();

  try {
    if (p === 'groq') {
      const response = await fetch('https://api.groq.com/openai/v1/models', {
        headers: { 'Authorization': `Bearer ${key}` },
      });
      if (response.ok) return { valid: true };
      if (response.status === 401) return { valid: false, error: 'Invalid Groq API key' };
      return { valid: false, error: `Validation failed: ${response.status}` };
    } else {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`,
        { method: 'GET' }
      );
      if (response.ok) return { valid: true };
      if (response.status === 400 || response.status === 403) return { valid: false, error: 'Invalid Gemini API key' };
      return { valid: false, error: `Validation failed: ${response.status}` };
    }
  } catch {
    return { valid: false, error: 'Network error — cannot reach API' };
  }
}

// --- Response Parser ---

function parseAIResponse(textContent: string): { success: boolean; defects: AIDetectedDefect[]; summary: string; error?: string } {
  try {
    let jsonStr = textContent.trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
    }

    const parsed = JSON.parse(jsonStr);

    const defects: AIDetectedDefect[] = (parsed.defects || [])
      .filter((d: Record<string, unknown>) => d && typeof d.type === 'string')
      .map((d: Record<string, unknown>) => ({
        type: validateDefectType(d.type as string),
        confidence: clamp(Number(d.confidence) || 0.5, 0, 1),
        x: clamp(Number(d.x) || 0, 0, 1),
        y: clamp(Number(d.y) || 0, 0, 1),
        w: clamp(Number(d.w) || 0.05, 0.01, 1),
        h: clamp(Number(d.h) || 0.05, 0.01, 1),
        description: String(d.description || ''),
      }));

    return { success: true, defects, summary: String(parsed.summary || 'Analysis complete') };
  } catch {
    return { success: false, defects: [], summary: '', error: 'Failed to parse AI response' };
  }
}

// --- Helpers ---

function validateDefectType(type: string): DefectType {
  const normalized = type.toLowerCase().trim();
  if (normalized === 'crack' || normalized === 'cracks') return 'crack';
  if (normalized === 'scratch' || normalized === 'scratches') return 'scratches';
  if (normalized === 'broken' || normalized === 'break') return 'broken';
  return 'damage';
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
