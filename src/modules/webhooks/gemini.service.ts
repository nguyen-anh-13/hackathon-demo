import { Injectable } from '@nestjs/common';
import { GeminiApiClient } from '../../clients/gemini/gemini-api.client';

/** Nest façade over {@link GeminiApiClient} for webhooks / GitLab flows. */
@Injectable()
export class GeminiService {
  constructor(private readonly geminiApiClient: GeminiApiClient) {}

  translateText(text: string): Promise<string> {
    return this.geminiApiClient.translateText(text);
  }

  summarizeVietnameseTitle(text: string, maxWords = 10): Promise<string> {
    return this.geminiApiClient.summarizeVietnameseTitle(text, maxWords);
  }
}
