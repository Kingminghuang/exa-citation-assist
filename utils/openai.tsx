"use server";

import OpenAI from "openai";
const openai = new OpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: process.env.DEEPSEEK_API_KEY
});

const systemPrompt = `You are an essay-completion bot that continues/completes a sentence given some input stub of an essay/prose. You only complete 1-2 SHORT sentence MAX. If you get an input of a half sentence or similar, DO NOT repeat any of the preceding text of the prose. THIS MEANS DO NOT INCLUDE THE STARTS OF INCOMPLETE SENTENCES IN YOUR RESPONSE. This is also the case when there is a spelling, punctuation, capitalization or other error in the starter stub - e.g.:

USER INPUT: pokemon is a
YOUR CORRECT OUTPUT: Japanese franchise created by Satoshi Tajiri.
NEVER/INCORRECT: Pokémon is a Japanese franchise created by Satoshi Tajiri.

USER INPUT: Once upon a time there
YOUR CORRECT OUTPUT: was a princess.
NEVER/INCORRECT: Once upon a time, there was a princess.

USER INPUT: Colonial england was a
YOUR CORRECT OUTPUT: time of great change and upheaval.
NEVER/INCORRECT: Colonial England was a time of great change and upheaval.

USER INPUT: The fog in san francisco
YOUR CORRECT OUTPUT: is a defining characteristic of the city's climate.
NEVER/INCORRECT: The fog in San Francisco is a defining characteristic of the city's climate.

USER INPUT: The fog in san francisco
YOUR CORRECT OUTPUT: is a defining characteristic of the city's climate.
NEVER/INCORRECT: The fog in San Francisco is a defining characteristic of the city's climate.

 Once you have made one citation, STOP GENERATING. BE PITHY. Where there is a full sentence fed in, you should continue on the next sentence as a generally good flowing essay would. You have a specialty in including content that is cited. Given the following two items, (1) citation context and (2) current essay writing, continue on the essay or prose inputting in-line citations in parentheses with the author's name, right after that followed by the relevant URL in square brackets. THEN put a parentheses around all of the above. If you cannot find an author (sometimes it is empty), use the generic name 'Source'. Example citation for you to follow the structure of: ((AUTHOR_X, 2021)[URL_X]). If there are more than 3 author names to include, use the first author name plus 'et al'`

// Deepseek API call (using OpenAI SDK)
async function callDeepseek(exaResults: string, conversationState: string) {
    try {
      const completion = await openai.chat.completions.create({
        model: 'deepseek-chat',
        max_tokens: 200,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: exaResults + ' \n CONVERSATION INPUT:' + conversationState }
        ]
      });
    
      console.log(exaResults + ' \n CONVERSATION INPUT:' + conversationState);
      console.log(completion);
      return completion;
    } catch (error) {
      console.error('Error calling Deepseek API:', error);
      throw error;
    }
  }

export default async function callOpenAi(exaResults: string, conversationState: string) {
    const deepseekResponse = await callDeepseek(exaResults, conversationState);

    console.log(deepseekResponse);

    return deepseekResponse.choices[0].message;
}
