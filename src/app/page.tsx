'use client';

import { useState, useEffect, FormEvent, useMemo } from 'react';
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
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { UtensilsCrossed, PlusCircle, X, Sparkles, Save, Trash2, ChefHat, AlertCircle, Image as ImageIcon, RefreshCw, Users, Clock, Leaf, Globe, ThumbsUp, ThumbsDown, PackagePlus, CookingPot, Minus, Plus } from 'lucide-react';

const PANTRY_STORAGE_KEY = 'whatCanICook-pantry';
const COOKING_LIST_STORAGE_KEY = 'whatCanICook-cookingList';
const RECIPES_STORAGE_KEY = 'whatCanICook-savedRecipes';
const DIETARY_STORAGE_KEY = 'whatCanICook-dietary';
const CUISINE_STORAGE_KEY = 'whatCanICook-cuisine';

const DIETARY_OPTIONS = ["Vegan", "Gluten-Free"];
const CUISINE_OPTIONS = ["Any", "Italian", "Mexican", "Indian", "Chinese", "Japanese", "Thai", "French", "Greek"];

// Function to parse and scale ingredients
const scaleIngredients = (originalIngredients: string, originalServings: number, newServings: number): string => {
    if (originalServings === newServings) {
        return originalIngredients;
    }
    const scaleFactor = newServings / originalServings;
    
    return originalIngredients.split(',').map(part => {
        // Regex to find numbers, fractions (e.g., 1/2), or ranges (e.g., 1-2)
        return part.replace(/(\d+\s*\/\s*\d+)|(\d+\.\d+)|(\d+-\d+)|(\d+)/g, (match) => {
            // Handle ranges: scale both numbers
            if (match.includes('-')) {
                return match.split('-').map(n => (parseFloat(n) * scaleFactor).toFixed(1).replace('.0', '')).join('-');
            }
            // Handle fractions
            if (match.includes('/')) {
                const [numerator, denominator] = match.split('/').map(Number);
                const value = numerator / denominator;
                const scaledValue = value * scaleFactor;
                // Poor man's fraction conversion for common cases
                if (Math.abs(scaledValue - 0.25) < 0.01) return '1/4';
                if (Math.abs(scaledValue - 0.5) < 0.01) return '1/2';
                if (Math.abs(scaledValue - 0.75) < 0.01) return '3/4';
                return scaledValue.toFixed(2);
            }
            const scaled = (parseFloat(match) * scaleFactor);

            // If the scaled number is very small, show more precision
            if (scaled > 0 && scaled < 1) {
                return scaled.toFixed(2);
            }
            // Otherwise, round to 1 decimal place and remove .0 if it's a whole number
            return scaled.toFixed(1).replace('.0', '');
        });
    }).join(',');
};


export default function Home() {
  const [newPantryItem, setNewPantryItem] = useState('');
  const [pantryIngredients, setPantryIngredients] = useState<string[]>([]);
  const [cookingList, setCookingList] = useState<string[]>([]);
  const [servings, setServings] = useState(2);
  const [dietaryRestrictions, setDietaryRestrictions] = useState<string[]>([]);
  const [cuisine, setCuisine] = useState('Any');
  const [generatedRecipe, setGeneratedRecipe] = useState<GenerateRecipeOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedRecipes, setSavedRecipes] = useState<GenerateRecipeOutput[]>([]);
  const [scaledServings, setScaledServings] = useState(servings);
  const { toast } = useToast();

  useEffect(() => {
    try {
      const storedPantry = localStorage.getItem(PANTRY_STORAGE_KEY);
      if (storedPantry) setPantryIngredients(JSON.parse(storedPantry));

      const storedCookingList = localStorage.getItem(COOKING_LIST_STORAGE_KEY);
      if (storedCookingList) setCookingList(JSON.parse(storedCookingList));
      
      const storedRecipes = localStorage.getItem(RECIPES_STORAGE_KEY);
      if (storedRecipes) setSavedRecipes(JSON.parse(storedRecipes));
      
      const storedDietary = localStorage.getItem(DIETARY_STORAGE_KEY);
      if (storedDietary) setDietaryRestrictions(JSON.parse(storedDietary));
      
      const storedCuisine = localStorage.getItem(CUISINE_STORAGE_KEY);
      if (storedCuisine) setCuisine(JSON.parse(storedCuisine));

    } catch (e) {
      console.error("Failed to parse from localStorage", e);
      toast({
        variant: "destructive",
        title: "Error loading data",
        description: "Could not load your saved data from the browser.",
      });
    }
  }, [toast]);

  useEffect(() => { localStorage.setItem(PANTRY_STORAGE_KEY, JSON.stringify(pantryIngredients)); }, [pantryIngredients]);
  useEffect(() => { localStorage.setItem(COOKING_LIST_STORAGE_KEY, JSON.stringify(cookingList)); }, [cookingList]);
  useEffect(() => { localStorage.setItem(DIETARY_STORAGE_KEY, JSON.stringify(dietaryRestrictions)); }, [dietaryRestrictions]);
  useEffect(() => { localStorage.setItem(RECIPES_STORAGE_KEY, JSON.stringify(savedRecipes)); }, [savedRecipes]);
  useEffect(() => { localStorage.setItem(CUISINE_STORAGE_KEY, JSON.stringify(cuisine)); }, [cuisine]);

  useEffect(() => {
    if (generatedRecipe) {
        setScaledServings(servings);
    }
  }, [generatedRecipe, servings]);

  const scaledIngredients = useMemo(() => {
    if (!generatedRecipe) return '';
    return scaleIngredients(generatedRecipe.ingredients, servings, scaledServings);
  }, [generatedRecipe, servings, scaledServings]);

  const handleAddPantryItem = (e: FormEvent) => {
    e.preventDefault();
    if (newPantryItem && !pantryIngredients.includes(newPantryItem.trim())) {
      setPantryIngredients([...pantryIngredients, newPantryItem.trim()]);
      setNewPantryItem('');
    }
  };

  const handleRemovePantryItem = (ingredientToRemove: string) => {
    setPantryIngredients(pantryIngredients.filter(i => i !== ingredientToRemove));
    setCookingList(cookingList.filter(i => i !== ingredientToRemove)); // Also remove from cooking list
  };

  const handleAddToCookingList = (ingredient: string) => {
    if (!cookingList.includes(ingredient)) {
      setCookingList([...cookingList, ingredient]);
    }
  };

  const handleRemoveFromCookingList = (ingredient: string) => {
    setCookingList(cookingList.filter(i => i !== ingredient));
  };
  
  const handleDietaryChange = (option: string) => {
    setDietaryRestrictions(prev => 
      prev.includes(option) ? prev.filter(item => item !== option) : [...prev, option]
    );
  };

  const handleGenerateRecipe = async (regenerate = false) => {
    if (cookingList.length === 0) {
      toast({
        variant: "destructive",
        title: "Empty Cooking List",
        description: "Please add some ingredients from your pantry to the cooking list first.",
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
        ingredients: cookingList.join(', '),
        servings: servings,
        previousRecipeTitle: regenerate && generatedRecipe ? generatedRecipe.title : undefined,
        dietaryRestrictions: dietaryRestrictions,
        cuisine: cuisine,
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
            <h1 className="text-4xl md:text-5xl font-headline font-bold text-primary">Fridge Feast</h1>
          </div>
          <p className="text-lg text-muted-foreground">Your personal chef for ingredients on hand.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 lg:gap-8">
          <Card className="shadow-lg mb-8 lg:mb-0">
            <CardHeader>
              <CardTitle className="font-headline text-2xl flex items-center gap-2">
                <ChefHat className="h-6 w-6 text-primary" />
                Your Kitchen
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* PANTRY MANAGEMENT */}
              <div className="mb-6">
                <Label className="flex items-center gap-2 mb-2 font-headline text-md">
                   <PackagePlus className="h-5 w-5" />
                   My Pantry
                </Label>
                <form onSubmit={handleAddPantryItem} className="flex gap-2 mb-4">
                  <Input
                    type="text"
                    value={newPantryItem}
                    onChange={(e) => setNewPantryItem(e.target.value)}
                    placeholder="e.g., Chicken, Tomatoes, Rice"
                    className="flex-grow"
                  />
                  <Button type="submit" size="icon" aria-label="Add to Pantry">
                    <PlusCircle />
                  </Button>
                </form>
                <div className="flex flex-wrap gap-2 min-h-[40px] bg-muted/50 p-2 rounded-md">
                  {pantryIngredients.length === 0 ? (
                     <span className="text-sm text-muted-foreground p-2">Your pantry is empty. Add some items!</span>
                  ) : pantryIngredients.map(ingredient => (
                    <Badge key={ingredient} variant="secondary" className="text-lg py-1 px-3">
                      {ingredient}
                      <button onClick={() => handleAddToCookingList(ingredient)} className="ml-2 rounded-full hover:bg-green-500/20 p-0.5" aria-label={`Add ${ingredient} to cooking list`}>
                        <PlusCircle className="h-4 w-4 text-green-600" />
                      </button>
                      <button onClick={() => handleRemovePantryItem(ingredient)} className="ml-1 rounded-full hover:bg-red-500/20 p-0.5" aria-label={`Remove ${ingredient} from pantry`}>
                        <X className="h-4 w-4 text-red-600" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              {/* COOKING LIST */}
              <div className="mb-6">
                <Label className="flex items-center gap-2 mb-2 font-headline text-md">
                   <CookingPot className="h-5 w-5" />
                   What's for Dinner?
                </Label>
                 <div className="flex flex-wrap gap-2 min-h-[40px] bg-primary/10 p-2 rounded-md">
                   {cookingList.length === 0 ? (
                     <span className="text-sm text-muted-foreground p-2">Click the green plus on pantry items to add them here.</span>
                   ) : cookingList.map(ingredient => (
                      <Badge key={ingredient} variant="default" className="text-lg py-1 px-3">
                        {ingredient}
                        <button onClick={() => handleRemoveFromCookingList(ingredient)} className="ml-2 rounded-full hover:bg-background/20 p-0.5">
                          <X className="h-4 w-4" />
                        </button>
                      </Badge>
                    ))}
                 </div>
              </div>

              <Separator className="my-6"/>

              {/* PREFERENCES */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                   <Label className="flex items-center gap-2 mb-2 font-headline text-md">
                     <Leaf className="h-5 w-5" />
                     Dietary Preferences
                   </Label>
                   <div className="flex flex-col gap-2">
                     {DIETARY_OPTIONS.map(option => (
                       <div key={option} className="flex items-center space-x-2">
                         <Checkbox
                           id={option}
                           checked={dietaryRestrictions.includes(option)}
                           onCheckedChange={() => handleDietaryChange(option)}
                         />
                         <label
                           htmlFor={option}
                           className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                         >
                           {option}
                         </label>
                       </div>
                     ))}
                   </div>
                </div>
                <div>
                  <Label htmlFor="cuisine" className="flex items-center gap-2 mb-2 font-headline text-md">
                    <Globe className="h-5 w-5" />
                    Cuisine
                  </Label>
                  <Select value={cuisine} onValueChange={setCuisine}>
                    <SelectTrigger id="cuisine">
                      <SelectValue placeholder="Select a cuisine" />
                    </SelectTrigger>
                    <SelectContent>
                      {CUISINE_OPTIONS.map(option => (
                        <SelectItem key={option} value={option}>{option}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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

              <Button onClick={() => handleGenerateRecipe()} disabled={cookingList.length === 0 || isLoading} className="w-full mt-6 text-lg py-6 bg-accent text-accent-foreground hover:bg-accent/90">
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
                  <div className="flex items-center text-sm text-muted-foreground pt-2">
                    <Clock className="h-4 w-4 mr-1.5" />
                    <span>{generatedRecipe.cookingTime}</span>
                  </div>
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
                                data-ai-hint="recipe food"
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

                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold font-headline text-lg">Ingredients</h3>
                    <div className="flex items-center gap-2">
                       <span className="text-muted-foreground text-sm">Servings:</span>
                       <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => setScaledServings(s => Math.max(1, s - 1))} disabled={scaledServings <= 1}>
                         <Minus className="h-4 w-4" />
                       </Button>
                       <span className="font-bold text-lg w-8 text-center">{scaledServings}</span>
                       <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => setScaledServings(s => s + 1)}>
                         <Plus className="h-4 w-4" />
                       </Button>
                    </div>
                  </div>
                  <p className="text-muted-foreground mb-4">{scaledIngredients}</p>

                  <h3 className="font-bold font-headline mb-2 text-lg">Instructions</h3>
                  <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                    {generatedRecipe.instructions.split('\n').filter(line => line.trim() !== '').map((line, index) => (
                      <li key={index}>{line.replace(/^\d+\.\s*/, '')}</li>
                    ))}
                  </ol>
                  <div className="flex gap-2 w-full mt-6">
                    <Button onClick={() => handleGenerateRecipe(true)} variant="outline" className="w-full" disabled={isLoading}>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Try Again
                    </Button>
                    <Button onClick={handleSaveRecipe} disabled={isRecipeSaved || isLoading} className="w-full">
                      <Save className="mr-2 h-4 w-4" />
                      {isRecipeSaved ? 'Saved' : 'Save Recipe'}
                    </Button>
                  </div>
                  <Separator className="my-4" />
                   <div className="flex gap-2 w-full">
                    <p className="text-sm text-muted-foreground self-center">Did you like this recipe?</p>
                    <Button onClick={handleSaveRecipe} variant="outline" size="icon" disabled={isRecipeSaved || isLoading} aria-label="Like and Save Recipe">
                      <ThumbsUp className="h-5 w-5 text-green-600"/>
                    </Button>
                     <Button onClick={() => handleGenerateRecipe(true)} variant="outline" size="icon" disabled={isLoading} aria-label="Dislike and generate another">
                      <ThumbsDown className="h-5 w-5 text-red-600"/>
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
                  <div className="flex items-center pr-4">
                    <AccordionTrigger className="font-headline text-xl hover:no-underline flex-1">
                      {recipe.title}
                    </AccordionTrigger>
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive shrink-0" onClick={() => handleDeleteRecipe(recipe.title)}>
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  </div>
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
                                            data-ai-hint="recipe food"
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
                      {recipe.cookingTime && (
                         <div className="flex items-center text-sm text-muted-foreground mb-4">
                            <Clock className="h-4 w-4 mr-1.5" />
                            <span>{recipe.cookingTime}</span>
                        </div>
                      )}
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
       <Skeleton className="h-4 w-1/4 mt-2" />
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
        <p className="text-muted-foreground">Your next delicious meal is just a click away. <br/> Add items to your cooking list and hit "Generate Recipe" to start.</p>
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
