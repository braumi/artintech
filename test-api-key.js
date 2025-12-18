// Simple test script to verify OpenAI API key works
import OpenAI from 'openai';
import { config } from 'dotenv';
import { readFileSync } from 'fs';

// Load .env file
config();

const apiKey = process.env.VITE_OPENAI_API_KEY;

if (!apiKey || apiKey === 'your_api_key_here') {
  console.error('❌ API key not set or still using placeholder.');
  console.log('Please update your .env file with: VITE_OPENAI_API_KEY=sk-your-actual-key');
  process.exit(1);
}

console.log('🔑 Testing OpenAI API key...');
console.log('Key starts with:', apiKey.substring(0, 7) + '...');

const openai = new OpenAI({ apiKey });

async function testAPI() {
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'user', content: 'Say "Hello, API key works!" if you can read this.' }
      ],
      max_tokens: 20,
    });

    const response = completion.choices[0]?.message?.content;
    console.log('✅ API key works!');
    console.log('Response:', response);
  } catch (error) {
    console.error('❌ API key test failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Error:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
    process.exit(1);
  }
}

testAPI();

