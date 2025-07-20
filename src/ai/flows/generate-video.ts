'use server';

/**
 * @fileOverview Video generation flow for recipes.
 *
 * - generateVideo - A function that generates a video for a recipe.
 * - GenerateVideoInput - The input type for the generateVideo function.
 * - GenerateVideoOutput - The return type for the generateVideo function.
 */

import { ai } from '@/ai/genkit';
import { googleAI } from '@genkit-ai/googleai';
import { z } from 'genkit';
import { MediaPart } from 'genkit/model';

export const GenerateVideoInputSchema = z.object({
  title: z.string().describe('The title of the recipe.'),
  instructions: z.string().describe('The instructions for the recipe.'),
  imageUrl: z.string().url().describe('URL of an image of the dish to use as a reference.'),
});
export type GenerateVideoInput = z.infer<typeof GenerateVideoInputSchema>;

export const GenerateVideoOutputSchema = z.object({
  videoUrl: z.string().url().describe('The data URI of the generated video.'),
});
export type GenerateVideoOutput = z.infer<typeof GenerateVideoOutputSchema>;


async function toBase64(url: string): Promise<string> {
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(url);
    const buffer = await response.buffer();
    return buffer.toString('base64');
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
      throw new Error('Failed to find the generated video');
    }

    const videoBase64 = await toBase64(`${video.media.url}&key=${process.env.GEMINI_API_KEY}`);
    
    return {
      videoUrl: `data:video/mp4;base64,${videoBase64}`,
    };
  }
);

export async function generateVideo(input: GenerateVideoInput): Promise<GenerateVideoOutput> {
  return generateVideoFlow(input);
}
