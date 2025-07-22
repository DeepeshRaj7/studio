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
  previousRecipeTitle: z.string().optional().describe('The title of the previously generated recipe, to avoid duplicates.'),
  servings: z.number().optional().describe('The number of people to cook for.'),
  dietaryRestrictions: z.array(z.string()).optional().describe('A list of dietary restrictions to apply, e.g., "Vegan", "Gluten-Free".'),
  cuisine: z.string().optional().describe('The desired cuisine style for the recipe, e.g., "Italian", "Mexican".'),
});
export type GenerateRecipeInput = z.infer<typeof GenerateRecipeInputSchema>;

const GenerateRecipeOutputSchema = z.object({
  title: z.string().describe('The title of the recipe.'),
  cookingTime: z.string().describe('The estimated cooking time in minutes. e.g., "30-45 minutes"'),
  ingredients: z.string().describe('The ingredients required for the recipe.'),
  instructions: z.string().describe('The instructions for the recipe.'),
  chefCommentary: z.string().describe('A short, encouraging, and impressive sentence from the chef about the dish.'),
  imageUrls: z.array(z.string().url()).describe('URLs of images of the dish.'),
  imageDataUris: z.array(z.string()).optional().describe('Base64 encoded image data URIs.'),
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
    cookingTime: z.string().describe('The estimated cooking time in minutes. e.g., "30-45 minutes"'),
    ingredients: z.string().describe('The ingredients required for the recipe, with measurements.'),
    instructions: z.string().describe('The instructions for the recipe.'),
    chefCommentary: z.string().describe('A short, encouraging, and impressive sentence from the chef about the dish. For example: "You are about to have a wonderful meal!"'),
  })},
  prompt: `You are a world-class chef. Generate a recipe based on the ingredients provided.

  Ingredients: {{{ingredients}}}

  {{#if servings}}
  The recipe should be for {{{servings}}} people. Please adjust ingredient quantities accordingly.
  {{/if}}

  {{#if cuisine}}
  The recipe should be in the style of {{{cuisine}}} cuisine.
  {{/if}}
  
  {{#if dietaryRestrictions.length}}
  Important: The recipe must adhere to the following dietary restrictions: {{#each dietaryRestrictions}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}. If any of the provided ingredients conflict with these restrictions, please ignore the conflicting ingredients and create a valid recipe.
  {{/if}}

  {{#if previousRecipeTitle}}
  Please generate a different recipe than "{{{previousRecipeTitle}}}".
  {{/if}}

  Also provide the estimated cooking time and a short, single sentence of impressive commentary about the final dish.

  Format the response as follows:

  Title: [Recipe Title]
  Cooking Time: [e.g., 25-30 minutes]
  Ingredients: [Comma separated list of ingredients with quantities]
  Instructions: [Step-by-step instructions]
  Chef's Commentary: [An impressive sentence about the dish]`,
});


const generateRecipeFlow = ai.defineFlow(
  {
    name: 'generateRecipeFlow',
    inputSchema: GenerateRecipeInputSchema,
    outputSchema: GenerateRecipeOutputSchema,
  },
  async input => {
    // If cuisine is 'Any', remove it so it's not passed to the prompt
    if (input.cuisine === 'Any') {
        input.cuisine = undefined;
    }
    const {output: recipeDetails} = await recipePrompt(input);
    if (!recipeDetails) {
        throw new Error('Failed to generate recipe details.');
    }

    const imageUrls: string[] = [];
    
    const imagePrompts = [
        `A cute, simple, and neat photorealistic image of a dish called "${recipeDetails.title}". The main ingredients are ${recipeDetails.ingredients}. The dish should be professionally plated on a clean, modern background.`,
        `Another angle of the dish "${recipeDetails.title}" with ingredients ${recipeDetails.ingredients}. This is a simple and cute photo with a shallow depth of field, making the food look very appealing.`,
        `A top-down, flat-lay photograph of the finished dish "${recipeDetails.title}". The plating is neat and artistic. The style is cute and minimalist.`
    ];

    try {
        const imagePromises = imagePrompts.map(prompt => 
            ai.generate({
                model: 'googleai/gemini-2.0-flash-preview-image-generation',
                prompt: prompt,
                config: {
                    responseModalities: ['IMAGE', 'TEXT'],
                },
            })
        );
        
        const results = await Promise.allSettled(imagePromises);

        results.forEach(result => {
            if (result.status === 'fulfilled' && result.value.media && result.value.media.url) {
                imageUrls.push(result.value.media.url);
            } else {
                console.error("Image generation failed for one prompt, using placeholder.", result.status === 'rejected' ? result.reason : 'No media url');
                imageUrls.push(`https://placehold.co/600x400.png`);
            }
        });

    } catch (e) {
        console.error("Image generation failed, using placeholders.", e);
        // Fill with placeholders if the whole process fails
        while (imageUrls.length < 3) {
            imageUrls.push(`https://placehold.co/600x400.png`);
        }
    }
    
    // Ensure there are always 3 images, even if some failed.
    while (imageUrls.length < 3) {
        imageUrls.push(`https://placehold.co/600x400.png`);
    }

    return {
        ...recipeDetails,
        imageUrls: imageUrls,
        imageDataUris: [], // Do not send back image data uris
    };
  }
);
