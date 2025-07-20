'use client';

import { useState, useEffect, FormEvent } from 'react';
import Image from 'next/image';
import { generateRecipe, GenerateRecipeOutput } from '@/ai/flows/generate-recipe';
import { generateVideo, GenerateVideoOutput } from '@/ai/flows/generate-video';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UtensilsCrossed, PlusCircle, X, Sparkles, Save, Trash2, ChefHat, AlertCircle, Image as ImageIcon, RefreshCw, Video, Film } from 'lucide-react';

const INGREDIENTS_STORAGE_KEY = 'whatCanICook-ingredients';
const RECIPES_STORAGE_KEY = 'whatCanICook-savedRecipes';

type RecipeWithVideo = GenerateRecipeOutput & { videoUrl?: string };

export default function Home() {
  const [newIngredient, setNewIngredient] = useState('');
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [generatedRecipe, setGeneratedRecipe] = useState<RecipeWithVideo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedRecipes, setSavedRecipes] = useState<GenerateRecipeOutput[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    try {
      const storedIngredients = localStorage.getItem(INGREDIENTS_STORAGE_KEY);
      if (storedIngredients) {
        setIngredients(JSON.parse(storedIngredients));
      }
      const storedRecipes = localStorage.getItem(RECIPES_STORAGE_KEY);
      if (storedRecipes) {
        setSavedRecipes(JSON.parse(storedRecipes));
      }
    } catch (e) {
      console.error("Failed to parse from localStorage", e);
      toast({
        variant: "destructive",
        title: "Error loading data",
        description: "Could not load your saved data from the browser.",
      });
    }
  }, [toast]);

  useEffect(() => {
    localStorage.setItem(INGREDIENTS_STORAGE_KEY, JSON.stringify(ingredients));
  }, [ingredients]);

  useEffect(() => {
    localStorage.setItem(RECIPES_STORAGE_KEY, JSON.stringify(savedRecipes));
  }, [savedRecipes]);

  const handleAddIngredient = (e: FormEvent) => {
    e.preventDefault();
    if (newIngredient && !ingredients.includes(newIngredient.trim())) {
      setIngredients([...ingredients, newIngredient.trim()]);
      setNewIngredient('');
    }
  };

  const handleRemoveIngredient = (ingredientToRemove: string) => {
    setIngredients(ingredients.filter(i => i !== ingredientToRemove));
  };

  const handleGenerateRecipe = async (regenerate = false) => {
    if (ingredients.length === 0) {
      toast({
        variant: "destructive",
        title: "No Ingredients",
        description: "Please add some ingredients before generating a recipe.",
      });
      return;
    }
    setIsLoading(true);
    setError(null);
    if (!regenerate) {
        setGeneratedRecipe(null);
    }
    try {
      const result = await generateRecipe({ 
        ingredients: ingredients.join(', '),
        previousRecipeTitle: regenerate && generatedRecipe ? generatedRecipe.title : undefined,
      });
      setGeneratedRecipe(result);
      if (result.imageUrl.startsWith('https://placehold.co')) {
        toast({
            title: "Image Generation Skipped",
            description: "Could not generate a custom image, but here is your recipe!",
          });
      }
    } catch (e) {
      console.error(e);
      setError('An error occurred while generating the recipe. Please try again.');
      toast({
        variant: "destructive",
        title: "Generation Failed",
        description: "Could not generate a recipe. The AI service may be temporarily unavailable.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateVideo = async () => {
    if (!generatedRecipe || generatedRecipe.videoUrl) return;

    setIsVideoLoading(true);
    try {
      const result = await generateVideo({
        title: generatedRecipe.title,
        instructions: generatedRecipe.instructions,
        imageUrl: generatedRecipe.imageUrl,
      });
      setGeneratedRecipe(prev => prev ? { ...prev, videoUrl: result.videoUrl } : null);
    } catch (e) {
      console.error(e);
      toast({
        variant: "destructive",
        title: "Video Generation Failed",
        description: "Could not generate a video for this recipe. Please try again later.",
      });
    } finally {
      setIsVideoLoading(false);
    }
  };

  const handleSaveRecipe = () => {
    if (generatedRecipe && !savedRecipes.some(r => r.title === generatedRecipe.title)) {
      // Don't save the videoUrl to localStorage
      const { videoUrl, ...recipeToSave } = generatedRecipe;
      setSavedRecipes([...savedRecipes, recipeToSave]);
      toast({
        title: "Recipe Saved!",
        description: `"${generatedRecipe.title}" has been added to your collection.`,
      });
    }
  };
  
  const handleDeleteRecipe = (titleToDelete: string) => {
    setSavedRecipes(savedRecipes.filter(r => r.title !== titleToDelete));
    toast({
        title: "Recipe Deleted",
        description: `"${titleToDelete}" has been removed.`,
    });
  };

  const isRecipeSaved = generatedRecipe && savedRecipes.some(r => r.title === generatedRecipe.title);

  return (
    <div className="min-h-screen bg-background font-body text-foreground">
      <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <header className="text-center mb-10">
          <div className="flex justify-center items-center gap-4 mb-2">
            <UtensilsCrossed className="h-10 w-10 text-primary" />
            <h1 className="text-4xl md:text-5xl font-headline font-bold text-primary">What Can I Cook</h1>
          </div>
          <p className="text-lg text-muted-foreground">Your personal chef for ingredients on hand.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 lg:gap-8">
          <Card className="shadow-lg mb-8 lg:mb-0">
            <CardHeader>
              <CardTitle className="font-headline text-2xl flex items-center gap-2">
                <ChefHat className="h-6 w-6 text-primary" />
                Your Ingredients
              </CardTitle>
              <CardDescription>Add what's in your fridge, and we'll whip up a recipe.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddIngredient} className="flex gap-2 mb-4">
                <Input
                  type="text"
                  value={newIngredient}
                  onChange={(e) => setNewIngredient(e.target.value)}
                  placeholder="e.g., Chicken, Tomatoes, Rice"
                  className="flex-grow"
                />
                <Button type="submit" size="icon" aria-label="Add Ingredient">
                  <PlusCircle />
                </Button>
              </form>
              <div className="flex flex-wrap gap-2 min-h-[40px]">
                {ingredients.map(ingredient => (
                  <Badge key={ingredient} variant="secondary" className="text-lg py-1 px-3">
                    {ingredient}
                    <button onClick={() => handleRemoveIngredient(ingredient)} className="ml-2 rounded-full hover:bg-muted-foreground/20 p-0.5">
                      <X className="h-4 w-4" />
                    </button>
                  </Badge>
                ))}
              </div>
              <Button onClick={() => handleGenerateRecipe()} disabled={ingredients.length === 0 || isLoading} className="w-full mt-6 text-lg py-6 bg-accent text-accent-foreground hover:bg-accent/90">
                <Sparkles className="mr-2 h-5 w-5" />
                {isLoading ? 'Generating...' : 'Generate Recipe'}
              </Button>
            </CardContent>
          </Card>

          <div className="animate-in fade-in duration-500">
            <h2 className="text-2xl font-headline font-bold mb-4 text-center lg:text-left">Generated Recipe</h2>
            {isLoading && <RecipeSkeleton />}
            {error && <ErrorCard message={error} />}
            {!isLoading && !generatedRecipe && !error && <PlaceholderCard />}
            {generatedRecipe && (
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="font-headline text-2xl">{generatedRecipe.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="recipe" className="w-full" onValueChange={(value) => {
                      if (value === 'video') handleGenerateVideo();
                  }}>
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="recipe"><UtensilsCrossed className="mr-2 h-4 w-4" />Recipe</TabsTrigger>
                      <TabsTrigger value="video"><Video className="mr-2 h-4 w-4" />Video</TabsTrigger>
                    </TabsList>
                    <TabsContent value="recipe">
                      <div className="mt-4 mb-4">
                      {generatedRecipe.imageUrl ? (
                          <Image 
                            src={generatedRecipe.imageUrl}
                            alt={generatedRecipe.title}
                            width={600}
                            height={400}
                            className="w-full h-auto rounded-md object-cover"
                            data-ai-hint="recipe food"
                          />
                      ) : (
                        <div className="w-full aspect-[3/2] bg-muted rounded-md flex flex-col items-center justify-center">
                            <ImageIcon className="h-12 w-12 text-muted-foreground" />
                            <p className="text-muted-foreground mt-2">No image available</p>
                        </div>
                      )}
                      </div>
                      <h3 className="font-bold font-headline mb-2 text-lg">Ingredients</h3>
                      <p className="text-muted-foreground mb-4">{generatedRecipe.ingredients}</p>
                      <h3 className="font-bold font-headline mb-2 text-lg">Instructions</h3>
                      <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                        {generatedRecipe.instructions.split('\n').filter(line => line.trim() !== '').map((line, index) => (
                          <li key={index}>{line.replace(/^\d+\.\s*/, '')}</li>
                        ))}
                      </ol>
                    </TabsContent>
                    <TabsContent value="video">
                      <div className="mt-4 w-full aspect-video flex items-center justify-center bg-black rounded-md">
                        {isVideoLoading ? (
                          <div className="text-center text-white">
                            <Film className="h-12 w-12 mx-auto animate-spin" />
                            <p className="mt-4 text-lg">Generating video... this may take a minute.</p>
                          </div>
                        ) : generatedRecipe.videoUrl ? (
                          <video controls src={generatedRecipe.videoUrl} className="w-full h-full rounded-md" />
                        ) : (
                          <div className="text-center text-muted-foreground">
                             <p>Click the "Video" tab to generate video instructions.</p>
                          </div>
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>

                  <div className="flex gap-2 w-full mt-6">
                    <Button onClick={() => handleGenerateRecipe(true)} variant="outline" className="w-full" disabled={isLoading || isVideoLoading}>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Generate Another
                    </Button>
                    <Button onClick={handleSaveRecipe} disabled={isRecipeSaved || isLoading || isVideoLoading} className="w-full">
                      <Save className="mr-2 h-4 w-4" />
                      {isRecipeSaved ? 'Saved' : 'Save Recipe'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {savedRecipes.length > 0 && (
          <section className="mt-12">
            <Separator className="my-8" />
            <h2 className="text-3xl font-headline font-bold text-center mb-6">Your Saved Recipes</h2>
            <Accordion type="single" collapsible className="w-full">
              {savedRecipes.map(recipe => (
                <AccordionItem key={recipe.title} value={recipe.title}>
                  <AccordionTrigger className="font-headline text-xl hover:no-underline">
                    <div className="flex justify-between items-center w-full pr-4">
                      <span>{recipe.title}</span>
                      <Button variant="ghost" size="icon" className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive" onClick={(e) => { e.stopPropagation(); handleDeleteRecipe(recipe.title); }}>
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="p-4 flex gap-4">
                    {recipe.imageUrl && (
                         <div className="w-1/3">
                            <Image 
                                src={recipe.imageUrl}
                                alt={recipe.title}
                                width={300}
                                height={200}
                                className="w-full h-auto rounded-md object-cover"
                                data-ai-hint="recipe food"
                            />
                        </div>
                    )}
                    <div className={recipe.imageUrl ? "w-2/3" : "w-full"}>
                      <h3 className="font-bold font-headline mb-2 text-md">Ingredients</h3>
                      <p className="text-muted-foreground mb-4">{recipe.ingredients}</p>
                      <h3 className="font-bold font-headline mb-2 text-md">Instructions</h3>
                      <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                         {recipe.instructions.split('\n').filter(line => line.trim() !== '').map((line, index) => (
                           <li key={index}>{line.replace(/^\d+\.\s*/, '')}</li>
                         ))}
                      </ol>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>
        )}
      </main>
    </div>
  );
}

const RecipeSkeleton = () => (
  <Card className="shadow-lg">
    <CardHeader>
      <Skeleton className="h-8 w-3/4" />
    </CardHeader>
    <CardContent className="space-y-4">
      <Skeleton className="h-40 w-full rounded-md" />
      <Skeleton className="h-6 w-1/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-6 w-1/4 mt-4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-4/6" />
      <Skeleton className="h-10 w-full mt-6" />
    </CardContent>
  </Card>
);

const PlaceholderCard = () => (
    <Card className="shadow-lg flex flex-col items-center justify-center text-center p-8 h-full min-h-[300px] border-dashed">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Ready to Cook?</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">Your next delicious meal is just a click away. <br/> Add your ingredients and hit "Generate Recipe" to start.</p>
      </CardContent>
    </Card>
);

const ErrorCard = ({ message }: { message: string }) => (
    <Card className="shadow-lg flex flex-col items-center justify-center text-center p-8 h-full min-h-[300px] border-destructive bg-destructive/5">
         <CardHeader>
            <div className="flex justify-center">
                <AlertCircle className="h-12 w-12 text-destructive" />
            </div>
            <CardTitle className="font-headline text-2xl text-destructive">Oops! Something went wrong.</CardTitle>
         </CardHeader>
         <CardContent>
            <p className="text-destructive/80">{message}</p>
         </CardContent>
    </Card>
);
