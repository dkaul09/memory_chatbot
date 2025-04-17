# Memory Chatbot

A React-based chatbot application that remembers information about users through conversation.

## Project Structure

```
memory-chatbot/
├── src/
│   ├── components/         # React components
│   │   ├── ChatContainer.tsx  # Main chat container
│   │   ├── ChatInput.tsx      # Message input component
│   │   ├── MessageItem.tsx    # Individual message display
│   │   ├── MessageList.tsx    # List of messages
│   │   └── TypingIndicator.tsx  # Loading animation
│   ├── services/           # API services
│   │   └── openAiService.ts   # OpenAI and Supabase integration
│   ├── types/              # TypeScript types
│   │   ├── Message.ts         # Message type definitions
│   │   └── User.ts            # User type definitions
│   ├── config.ts           # Configuration file for API keys
│   └── App.tsx             # Main application component
├── .env                    # Environment variables (not in repo)
└── ...                     # Other configuration files
```

## Setup Instructions

### Prerequisites

- Node.js 16+ and npm/yarn
- Supabase account 
- OpenAI API key 
### Step 1: Installation of dependencies

```bash
npm install
```

### Step 2: Set Up Supabase

1. Create a new Supabase project at https://supabase.com
2. Create the required tables in Supabase SQL Editor:

```sql

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$ language 'plpgsql';


CREATE TABLE public.users (
  id serial NOT NULL,
  name text NULL,
  age integer NULL,
  gender text NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;


CREATE TRIGGER set_updated_at BEFORE UPDATE
ON users FOR EACH ROW
WHEN (
  OLD.name IS DISTINCT FROM NEW.name
  OR OLD.age IS DISTINCT FROM NEW.age
  OR OLD.gender IS DISTINCT FROM NEW.gender
)
EXECUTE FUNCTION update_updated_at_column();


CREATE TABLE public.messages (
  id serial NOT NULL,
  user_id integer NULL,
  role text NULL,
  content text NOT NULL,
  timestamp timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT messages_pkey PRIMARY KEY (id),
  CONSTRAINT messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT messages_role_check CHECK (
    (
      role = ANY (ARRAY['user'::text, 'assistant'::text])
    )
  )
) TABLESPACE pg_default;


CREATE INDEX messages_user_id_idx ON messages(user_id);
```

### Step 3: Environment Setup

1. Create a `.env` file in the project root with your API keys:

```
# Supabase credentials
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_KEY=your-supabase-anon-key

# OpenAI API key
VITE_OPENAI_API_KEY=your-openai-api-key
```

2. Create a `src/config.ts` file to access these environment variables:

```typescript
// src/config.ts
export const config = {
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL || '',
    key: import.meta.env.VITE_SUPABASE_KEY || ''
  },
  openai: {
    key: import.meta.env.VITE_OPENAI_API_KEY || ''
  }
};
```

### Step 4: Start Development Server

```bash
npm run dev
```

The application should now be running at http://localhost:5173

## How It Works

### Information Extraction Process

The chatbot uses a two-step approach with OpenAI's GPT-3.5 Turbo model to maintain memory of personal information shared during conversations:

#### Step 1: Information Detection

When a user sends a message, the system:

1. Saves the user message to the Supabase database
2. Retrieves the entire conversation history for context
3. Sends the conversation to OpenAI with a specialized system prompt that instructs the AI to:
   - Scan for personal information (name, age, gender)
   - Only extract information clearly belonging to the user 
   - Format the extracted data in a specific JSON structure:
     ```json
     {
       "name": "detected name or null",
       "age": "detected age or null",
       "gender": "detected gender or null",
       "detection": "NAME: [exact text], AGE: [exact text], GENDER: [exact text]"
     }
     ```
   - Include the exact phrases where information was found in the "detection" field
   - Return null for any information not confidently detected

4. The code processes the OpenAI response by:
   - Parsing the JSON data


#### Step 2: User Profile Update

After extracting information, the system:

1. Fetches the current user profile from Supabase
2. Creates an updates object, only including newly discovered information:
   - Only updates fields that are currently empty (null) in the user profile
   - Updates the timestamp if any new information is added

#### Step 3: Response Generation

The system then:

1. Creates a personalized prompt for response generation that:
   - Includes the detected information context
   - Instructs the AI to acknowledge newly discovered information naturally
   - Avoids explicitly mentioning database storage
   - Maintains a conversational tone

2. Sends a second request to OpenAI with:
   - The full conversation history for context
   - The specialized response prompt
   - The same GPT-3.5 Turbo model

3. Processes the AI response:
   - Saves it to the Supabase database
   - Returns it to the user interface
