'use client';

import { useState, useEffect, FormEvent } from 'react';
import Image from 'next/image';
import { generateRecipe } from '@/ai/flows/generate-recipe';
import type { GenerateRecipeOutput } from '@/ai/flows/generate-recipe';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { UtensilsCrossed, PlusCircle, X, Sparkles, Save, Trash2, ChefHat, AlertCircle, Image as ImageIcon, RefreshCw, Users } from 'lucide-react';

const INGREDIENTS_STORAGE_KEY = 'whatCanICook-ingredients';
const RECIPES_STORAGE_KEY = 'whatCanICook-savedRecipes';

export default function Home() {
  const [newIngredient, setNewIngredient] = useState('');
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [servings, setServings] = useState(2);
  const [generatedRecipe, setGeneratedRecipe] = useState<GenerateRecipeOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
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
        servings: servings,
        previousRecipeTitle: regenerate && generatedRecipe ? generatedRecipe.title : undefined,
      });
      setGeneratedRecipe(result);
      if (result.imageUrls.some(url => url.startsWith('https://placehold.co'))) {
        toast({
            title: "Image Generation Partial Fail",
            description: "Could not generate all images, but here is your recipe!",
            variant: "destructive",
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

  const handleSaveRecipe = () => {
    if (generatedRecipe && !savedRecipes.some(r => r.title === generatedRecipe.title)) {
      setSavedRecipes([...savedRecipes, generatedRecipe]);
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
              <div className="flex flex-wrap gap-2 mb-4 min-h-[40px]">
                {ingredients.map(ingredient => (
                  <Badge key={ingredient} variant="secondary" className="text-lg py-1 px-3">
                    {ingredient}
                    <button onClick={() => handleRemoveIngredient(ingredient)} className="ml-2 rounded-full hover:bg-muted-foreground/20 p-0.5">
                      <X className="h-4 w-4" />
                    </button>
                  </Badge>
                ))}
              </div>

              <div className="mb-4">
                <Label htmlFor="servings" className="flex items-center gap-2 mb-2 font-headline text-md">
                  <Users className="h-5 w-5" />
                  How many people?
                </Label>
                <Input
                  id="servings"
                  type="number"
                  value={servings}
                  onChange={(e) => setServings(Math.max(1, parseInt(e.target.value) || 1))}
                  min="1"
                  className="w-24"
                />
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
                  <CardDescription>"{generatedRecipe.chefCommentary}"</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mt-4 mb-4">
                  {generatedRecipe.imageUrls && generatedRecipe.imageUrls.length > 0 ? (
                    <Carousel className="w-full">
                      <CarouselContent>
                        {generatedRecipe.imageUrls.map((url, index) => (
                           <CarouselItem key={index}>
                              <Image 
                                src={url}
                                alt={`${generatedRecipe.title} - image ${index + 1}`}
                                width={600}
                                height={400}
                                className="w-full h-auto rounded-md object-cover"
                                data-ai-hint="recipe food people"
                              />
                           </CarouselItem>
                        ))}
                      </CarouselContent>
                      <CarouselPrevious />
                      <CarouselNext />
                    </Carousel>
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
                  <div className="flex gap-2 w-full mt-6">
                    <Button onClick={() => handleGenerateRecipe(true)} variant="outline" className="w-full" disabled={isLoading}>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Generate Another
                    </Button>
                    <Button onClick={handleSaveRecipe} disabled={isRecipeSaved || isLoading} className="w-full">
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
                  <AccordionContent className="p-4 flex flex-col sm:flex-row gap-4">
                    {recipe.imageUrls && recipe.imageUrls.length > 0 && (
                         <div className="w-full sm:w-1/3">
                            <Carousel className="w-full">
                               <CarouselContent>
                                {recipe.imageUrls.map((url, index) => (
                                    <CarouselItem key={index}>
                                        <Image 
                                            src={url}
                                            alt={`${recipe.title} - image ${index + 1}`}
                                            width={300}
                                            height={200}
                                            className="w-full h-auto rounded-md object-cover"
                                            data-ai-hint="recipe food people"
                                        />
                                    </CarouselItem>
                                ))}
                               </CarouselContent>
                               <CarouselPrevious />
                               <CarouselNext />
                            </Carousel>
                        </div>
                    )}
                    <div className={recipe.imageUrls && recipe.imageUrls.length > 0 ? "w-full sm:w-2/3" : "w-full"}>
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
       <Skeleton className="h-4 w-1/2" />
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
