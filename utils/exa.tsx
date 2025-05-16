"use server";
import Exa from "exa-js";

export default async function callExaSearcher(conversationState: string) {
    if (!process.env.EXA_API_KEY) {
        console.error("Missing EXA_API_KEY environment variable");
        // For testing purposes, return mock data when API key is missing
        return getMockExaResults();
    }

    try {
        const exa = new Exa(process.env.EXA_API_KEY);
        
        let exaQuery = conversationState.length > 1000 
            ? (conversationState.slice(-1000))+"\n\nIf you found the above interesting, here's another useful resource to read:"
            : conversationState+"\n\nIf you found the above interesting, here's another useful resource to read:"

        console.log("Searching Exa with query:", exaQuery.substring(0, 50) + '...');
        
        let exaReturnedResults = await exa.searchAndContents(
            exaQuery,
            {
                type: "neural",
                useAutoprompt: false,
                numResults: 5,
                category: "research paper",
                highlights: {
                    numSentences: 1,
                    highlightsPerUrl: 1
                }
            }
        );

        console.log("Exa search completed, found:", exaReturnedResults.results.length, "results");
        return exaReturnedResults.results;
    } catch (error) {
        console.error("Error searching with Exa:", error);
        // Return mock data in case of error for testing purposes
        return getMockExaResults();
    }
}

// Mock data for testing when API key is not available
function getMockExaResults() {
    return [
        {
            title: "A Comprehensive Overview of Large Language Models",
            url: "https://arxiv.org/pdf/2307.06435.pdf",
            publishedDate: "2023-11-16T01:36:32.547Z",
            author: "Humza Naveed, University of Engineering and Technology (UET), Lahore, Pakistan",
            highlights: [
                "Such requirements have limited their adoption in various domains due to computational constraints."
            ]
        },
        {
            title: "Toward a conceptual synthesis for climate change responses",
            url: "https://onlinelibrary.wiley.com/doi/abs/10.1111/j.1466-8238.2011.00713.x",
            publishedDate: "2012-03-15T01:36:32.547Z",
            author: "MI O'Connor, ER Selig, ML Pinsky, Global Ecology",
            highlights: [
                "We synthesize climate change responses and their mechanisms to provide a comprehensive framework."
            ]
        },
        {
            title: "The State of AI in 2023",
            url: "https://www.example.com/ai-state-2023",
            publishedDate: "2023-01-20T01:36:32.547Z",
            author: "Sarah Johnson, AI Research Institute",
            highlights: [
                "Generative AI has transformed multiple industries with unprecedented capabilities for content creation."
            ]
        }
    ];
}
