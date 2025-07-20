// Use server directive is required when using Genkit flows in Next.js
'use server';

/**
 * @fileOverview Recipe generation flow based on available ingredients.
 *
 * - generateRecipe - A function that generates a recipe based on ingredients.
 * - GenerateRecipeInput - The input type for the generateRecipe function.
 * - GenerateRecipeOutput - The return type for the generateRecipe function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateRecipeInputSchema = z.object({
  ingredients: z
    .string()
    .describe('A comma separated list of ingredients to use in the recipe.'),
});
export type GenerateRecipeInput = z.infer<typeof GenerateRecipeInputSchema>;

const GenerateRecipeOutputSchema = z.object({
  title: z.string().describe('The title of the recipe.'),
  ingredients: z.string().describe('The ingredients required for the recipe.'),
  instructions: z.string().describe('The instructions for the recipe.'),
  imageUrl: z.string().url().describe('URL of an image of the dish.'),
});
export type GenerateRecipeOutput = z.infer<typeof GenerateRecipeOutputSchema>;

export async function generateRecipe(input: GenerateRecipeInput): Promise<GenerateRecipeOutput> {
  return generateRecipeFlow(input);
}

const recipePrompt = ai.definePrompt({
  name: 'generateRecipePrompt',
  input: {schema: GenerateRecipeInputSchema},
  output: {schema: z.object({
    title: z.string().describe('The title of the recipe.'),
    ingredients: z.string().describe('The ingredients required for the recipe.'),
    instructions: z.string().describe('The instructions for the recipe.'),
  })},
  prompt: `You are a world-class chef. Generate a recipe based on the ingredients provided.

  Ingredients: {{{ingredients}}}

  Format the response as follows:

  Title: [Recipe Title]
  Ingredients: [Comma separated list of ingredients]
  Instructions: [Step-by-step instructions]`,
});


const generateRecipeFlow = ai.defineFlow(
  {
    name: 'generateRecipeFlow',
    inputSchema: GenerateRecipeInputSchema,
    outputSchema: GenerateRecipeOutputSchema,
  },
  async input => {
    const {output: recipeDetails} = await recipePrompt(input);
    if (!recipeDetails) {
        throw new Error('Failed to generate recipe details.');
    }

    let imageUrl = `https://placehold.co/600x400.png?text=${encodeURIComponent(recipeDetails.title)}`;

    try {
        const {media} = await ai.generate({
          model: 'googleai/gemini-2.0-flash-preview-image-generation',
          prompt: `A photorealistic image of a dish called "${recipeDetails.title}". The main ingredients are ${recipeDetails.ingredients}. The dish should be professionally plated. Only show the specified ingredients.`,
          config: {
            responseModalities: ['IMAGE', 'TEXT'],
          },
        });
        if (media && media.url) {
            imageUrl = media.url;
        }
    } catch (e) {
        console.error("Image generation failed, using placeholder.", e);
    }
    

    return {
        ...recipeDetails,
        imageUrl: imageUrl,
    };
  }
);
