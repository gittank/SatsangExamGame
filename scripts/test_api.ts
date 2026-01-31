import Anthropic from '@anthropic-ai/sdk';

async function test() {
  const client = new Anthropic();
  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 100,
      messages: [{ role: 'user', content: 'Say hello in one word' }],
    });
    console.log('Success! Response:', response.content[0]);
  } catch (error) {
    console.error('Error:', error);
  }
}

test();
