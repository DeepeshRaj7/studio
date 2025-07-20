/**
 * @fileOverview Zod schemas for video generation.
 */
import { z } from 'genkit';

export const GenerateVideoInputSchema = z.object({
  title: z.string().describe('The title of the recipe.'),
  instructions: z.string().describe('The instructions for the recipe.'),
  imageBase64: z.string().describe('Base64 encoded image data to use as a reference.'),
});
export type GenerateVideoInput = z.infer<typeof GenerateVideoInputSchema>;

export const GenerateVideoOutputSchema = z.object({
  videoUrl: z.string().url().describe('The data URI of the generated video.'),
});
export type GenerateVideoOutput = z.infer<typeof GenerateVideoOutputSchema>;
