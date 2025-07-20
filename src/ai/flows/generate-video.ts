'use server';

/**
 * @fileOverview Video generation flow for recipes.
 *
 * - generateVideo - A function that generates a video for a recipe.
 */

import { ai } from '@/ai/genkit';
import { googleAI } from '@genkit-ai/googleai';
import type { MediaPart } from 'genkit/model';
import { GenerateVideoInput, GenerateVideoInputSchema, GenerateVideoOutputSchema } from '@/ai/schemas/video-schemas';

async function toBase64(url: string): Promise<string> {
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
    }
    const buffer = await response.arrayBuffer();
    return Buffer.from(buffer).toString('base64');
}

const generateVideoFlow = ai.defineFlow(
  {
    name: 'generateVideoFlow',
    inputSchema: GenerateVideoInputSchema,
    outputSchema: GenerateVideoOutputSchema,
  },
  async ({ title, instructions, imageUrl }) => {
    const imageB64 = await toBase64(imageUrl);

    const videoPrompt = `
      Create a short, step-by-step cooking video for a recipe called "${title}".
      The video should visually demonstrate the following instructions:
      ${instructions}
      Use the provided image as a reference for the final dish.
      The video should be fast-paced, engaging, and have clear visuals for each step.
    `;

    let { operation } = await ai.generate({
      model: googleAI.model('veo-2.0-generate-001'),
      prompt: [
        { text: videoPrompt },
        { media: { contentType: 'image/png', url: `data:image/png;base64,${imageB64}` } },
      ],
      config: {
        durationSeconds: 8,
        aspectRatio: '16:9',
      },
    });

    if (!operation) {
      throw new Error('Expected the model to return an operation');
    }

    while (!operation.done) {
      // In a real app, you might want to add a timeout here.
      await new Promise((resolve) => setTimeout(resolve, 5000));
      operation = await ai.checkOperation(operation);
    }

    if (operation.error) {
      throw new Error(`Failed to generate video: ${operation.error.message}`);
    }
    
    const video = operation.output?.message?.content.find((p) => !!p.media) as MediaPart | undefined;
    
    if (!video || !video.media?.url) {
      throw new Error('Failed to find the generated video in the model response.');
    }
    
    let videoBase64: string;
    const videoUrlWithKey = `${video.media.url}&key=${process.env.GEMINI_API_KEY}`;
    
    try {
        videoBase64 = await toBase64(videoUrlWithKey);
    } catch (e: any) {
        console.error("Failed to download and encode video:", e.message);
        throw new Error("Could not retrieve the generated video file.");
    }
    
    return {
      videoUrl: `data:video/mp4;base64,${videoBase64}`,
    };
  }
);

export async function generateVideo(input: GenerateVideoInput) {
  return generateVideoFlow(input);
}
