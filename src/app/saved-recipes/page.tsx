'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { GenerateRecipeOutput } from '@/ai/flows/generate-recipe';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { useToast } from '@/hooks/use-toast';
import { Trash2, Clock, UtensilsCrossed, ArrowLeft } from 'lucide-react';

const RECIPES_STORAGE_KEY = 'whatCanICook-savedRecipes';

export default function SavedRecipesPage() {
  const [savedRecipes, setSavedRecipes] = useState<GenerateRecipeOutput[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    try {
      const storedRecipes = localStorage.getItem(RECIPES_STORAGE_KEY);
      if (storedRecipes) {
        setSavedRecipes(JSON.parse(storedRecipes));
      }
    } catch (e) {
      console.error("Failed to parse recipes from localStorage", e);
      toast({
        variant: "destructive",
        title: "Error loading recipes",
        description: "Could not load your saved recipes.",
      });
    }
  }, [toast]);

  const handleDeleteRecipe = (titleToDelete: string) => {
    const newRecipes = savedRecipes.filter(r => r.title !== titleToDelete);
    setSavedRecipes(newRecipes);
    try {
      localStorage.setItem(RECIPES_STORAGE_KEY, JSON.stringify(newRecipes));
      toast({
          title: "Recipe Deleted",
          description: `"${titleToDelete}" has been removed.`,
      });
    } catch (e) {
      console.error("Failed to save updated recipes list", e);
      toast({
        variant: "destructive",
        title: "Error saving recipes",
        description: "Could not update your saved recipes list.",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background font-body text-foreground">
      <main className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
        <header className="flex justify-between items-center mb-10">
            <div className="flex items-center gap-4">
                <span className="text-4xl">🍕</span>
                <h1 className="text-4xl md:text-5xl font-headline font-bold text-primary">Saved Recipes</h1>
                <span className="text-4xl">🍔</span>
            </div>
            <Link href="/" passHref>
                <Button variant="outline">
                    <ArrowLeft className="mr-2 h-5 w-5" />
                    Back to Cooking
                </Button>
            </Link>
        </header>

        {savedRecipes.length > 0 ? (
          <Accordion type="single" collapsible className="w-full">
            {savedRecipes.map(recipe => (
              <AccordionItem key={recipe.title} value={recipe.title}>
                <div className="flex items-center justify-between pr-4 border-b">
                    <AccordionTrigger className="font-headline text-xl hover:no-underline flex-1">
                      {recipe.title}
                    </AccordionTrigger>
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive shrink-0" onClick={() => handleDeleteRecipe(recipe.title)}>
                      <Trash2 className="h-5 w-5" />
                    </Button>
                </div>
                <AccordionContent className="p-4 flex flex-col gap-4">
                  {recipe.imageUrls && recipe.imageUrls.length > 0 && (
                       <div className="w-full">
                          <Carousel className="w-full max-w-sm mx-auto">
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
                  <div className="w-full">
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
        ) : (
            <Card className="shadow-lg flex flex-col items-center justify-center text-center p-8 h-full min-h-[300px] border-dashed">
                <CardHeader>
                    <CardTitle className="font-headline text-2xl">Your Cookbook is Empty</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">You haven't saved any recipes yet. <br/> Go back to the main page to generate and save some!</p>
                </CardContent>
            </Card>
        )}
      </main>
    </div>
  );
}
