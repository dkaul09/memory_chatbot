// src/services/openAiService.ts
import { createClient } from '@supabase/supabase-js';
import { Message } from '../types/Message';
import { User } from '../types/User';
import { config } from '../config';

const supabase = createClient(config.supabase.url, config.supabase.key);

export const openAiService = {
  getMessages: async (userId) => {
    try {
      if (!userId) {
        console.error("No user ID provided to getMessages");
        return [];
      }
      
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: true });
        
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error fetching messages:", error);
      return [];
    }
  },

  createOrGetUser: async () => {
    try {
      const storedUserId = sessionStorage.getItem('userId');
      
      if (storedUserId) {
        // Get existing user
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', storedUserId)
          .single();
          
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('users')
          .insert([{ created_at: new Date().toISOString() }])
          .select()
          .single();
          
        if (error) throw error;
        
        // Store user ID in session storage
        sessionStorage.setItem('userId', data.id);
        return data;
      }
    } catch (error) {
      console.error("Error fetching user:", error);
      throw error;
    }
  },

  sendMessage: async (content, userId) => {
    try {

      const { error: msgError } = await supabase
        .from("messages")
        .insert({
          content: content,
          role: "user",
          user_id: userId,
          timestamp: new Date().toISOString(),
        });
        
      if (msgError) throw msgError;

      const { data: history } = await supabase
        .from("messages")
        .select("role, content")
        .eq("user_id", userId)
        .order("timestamp", { ascending: true });
      
      const chat = history?.map((m) => ({
        role: m.role,
        content: m.content,
      })) ?? [];
   
      try {
        const extractResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.openai.key}`
          },
          body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [
              ...chat,
              {
                role: "system",
                content: `You are a friendly and attentive chatbot that likes to have conversations with your users. You are supposed to extract the user's name, age, and gender from the conversation. If you find this information, respond in this format:
                {
                  "name": "detected name or null",
                  "age": "detected age or null",
                  "gender": "detected gender or null",
                  "detection": "NAME: [exact text where name was mentioned] or null, AGE: [exact text where age was mentioned] or null, GENDER: [exact text where gender was mentioned] or null"
                }
                
                Only include values if you're confident they represent actual personal information, otherwise use null. 
                Make sure the information that you are ca[uring is of the user's and not anyone else they are mentioning.
                For the "detection" field, include the specific phrases where the information was found.`,
              }
            ]
          })
        });
        
        const extractData = await extractResponse.json();
        let extracted = { name: null, age: null, gender: null, detection: null };
        
        try {
          if (extractData.choices && extractData.choices.length > 0) {
            extracted = JSON.parse(extractData.choices[0].message.content);
            console.log("Extracted info:", extracted);
          }
        } catch (parseError) {
          console.error("Error parsing extracted data:", parseError);
        }
  
        const { data: user } = await supabase
          .from("users")
          .select("*")
          .eq("id", userId)
          .single();
          
          const updates: Partial<User> = {};
        if (extracted.name && !user?.name) updates.name = extracted.name;
        if (extracted.age && !user?.age) updates.age = extracted.age;
        if (extracted.gender && !user?.gender) updates.gender = extracted.gender;
        
        if (Object.keys(updates).length > 0) {
          updates.updated_at = new Date().toISOString();
          await supabase.from("users").update(updates).eq("id", userId);
        }
        
        // Now get the AI response
        const replyPrompt = `
          ${extracted.detection ? `I detected some personal information: ${extracted.detection}` : ''}
          
          Based on this conversation, respond naturally to the user's message. If you detected personal information for the first time, briefly acknowledge it in your response (e.g., "Thanks for sharing your name, [name]!" or "I'll remember that you're [age] years old").
          
          Don't explicitly mention that you're "storing" or "remembering" information in a database. Just interact naturally while subtly referencing the information when relevant.
        `;
        
        const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.openai.key}`
          },
          body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [
              ...chat,
              {
                role: "system",
                content: replyPrompt
              }
            ]
          })
        });
        
        const responseData = await openAIResponse.json();
        const aiMessage = responseData.choices[0].message.content;
        
        // Save AI response to database
        await supabase.from("messages").insert({
          content: aiMessage,
          role: "assistant",
          user_id: userId,
          timestamp: new Date().toISOString(),
        });
        
        return aiMessage;
      } catch (apiError) {
        console.error("OpenAI API error:", apiError);
        
        // If OpenAI call fails, use a fallback response
        const aiResponse = `I'm having trouble processing that right now. Could you try again?`;
        
        // Save fallback response to database
        await supabase.from("messages").insert({
          content: aiResponse,
          role: "assistant",
          user_id: userId,
          timestamp: new Date().toISOString(),
        });
        
        return aiResponse;
      }
    } catch (error) {
      console.error('Error sending message:', error);
      return 'Sorry, I encountered an error. Please try again later.';
    }
  }
};