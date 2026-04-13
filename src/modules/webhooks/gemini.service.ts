import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../../configs/env.config';

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly modelName = env.gemini.model;
  private readonly client: GoogleGenerativeAI | null;

  constructor() {
    this.client = env.gemini.apiKey ? new GoogleGenerativeAI(env.gemini.apiKey) : null;
  }

  async translateBatch(texts: string[]): Promise<string[]> {
    if (!texts.length) {
      return [];
    }
    if (!this.client) {
      this.logger.warn('Missing GEMINI_API_KEY, fallback to original texts');
      return texts;
    }

    const model = this.client.getGenerativeModel({ model: this.modelName });
    const prompt = [
      'Translate the following Japanese texts into Vietnamese.',
      'Return ONLY a JSON array of translated strings in the same order.',
      'Do not include markdown, explanation, or extra keys.',
      '',
      JSON.stringify(texts)
    ].join('\n');

    try {
      const result = await model.generateContent(prompt);
      const raw = result.response.text().trim();
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) {
        throw new Error('Gemini response is not array');
      }
      return parsed.map((item, index) => (typeof item === 'string' && item.trim() ? item : texts[index]));
    } catch (error: any) {
      this.logger.error(`Gemini translate failed: ${error?.message || error}`);
      return texts;
    }
  }

  async summarizeVietnameseTitle(text: string, maxWords = 10): Promise<string> {
    if (!text.trim()) {
      return 'Khong co noi dung';
    }
    if (!this.client) {
      return this.limitWords(text, maxWords);
    }

    const model = this.client.getGenerativeModel({ model: this.modelName });
    let currentInstruction = text;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const prompt = [
        'Hay tom tat va dich sang tieng Viet thanh tieu de ngan gon.',
        `Bat buoc toi da ${maxWords} chu.`,
        'Chi tra ve duy nhat mot dong text, khong markdown, khong giai thich.',
        '',
        currentInstruction
      ].join('\n');

      try {
        const result = await model.generateContent(prompt);
        const candidate = result.response.text().replace(/\s+/g, ' ').trim();
        if (this.countWords(candidate) <= maxWords) {
          return candidate;
        }
        currentInstruction = `Van ban truoc qua dai (${this.countWords(candidate)} chu). Hay viet lai ngan hon, toi da ${maxWords} chu: ${candidate}`;
      } catch (error: any) {
        this.logger.error(`Gemini summarize failed: ${error?.message || error}`);
        break;
      }
    }

    return this.limitWords(text, maxWords);
  }

  private countWords(input: string): number {
    if (!input.trim()) {
      return 0;
    }
    return input.trim().split(/\s+/).length;
  }

  private limitWords(input: string, maxWords: number): string {
    return input
      .trim()
      .split(/\s+/)
      .slice(0, maxWords)
      .join(' ');
  }
}
