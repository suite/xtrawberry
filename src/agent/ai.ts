import { Anthropic } from '@anthropic-ai/sdk';

export interface Message {
  role: 'assistant' | 'user';
  content: string;
}

interface ConversationMetadata {
  startedAt: number;
}

export interface Conversation {
  id: string;
  messages: Message[];
  metadata: ConversationMetadata;
}

export class AI {
  private client: Anthropic;
  private conversations: Map<string, Conversation>;
  private model: string;

  constructor() {
    const apiKey = process.env.ANTHROPIC_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_KEY environment variable is required');
    }

    const model = process.env.ANTHROPIC_MODEL;
    if (!model) {
      throw new Error('ANTHROPIC_MODEL environment variable is required');
    }

    this.client = new Anthropic({ apiKey });
    this.conversations = new Map();
    this.model = model;
  }

  createConversation(id: string, taskId: string): Conversation {
    const conversation: Conversation = {
      id,
      messages: [],
      metadata: {
        startedAt: Date.now()
      }
    };
    this.conversations.set(id, conversation);
    return conversation;
  }

  async sendMessage(conversationId: string, content: string): Promise<string> {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`);
    }

    // Add the new message to the conversation
    conversation.messages.push({
      role: 'user',
      content,
    });

    // Create the messages array for the API call
    const messages = conversation.messages.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));

    try {
      const response = await this.client.messages.create({
        model: this.model,
        messages,
        max_tokens: 1024,
      });

      const block = response.content[0];
      const assistantMessage = block.type === 'text' ? block.text : '';
      
      // Add the assistant's response to the conversation
      conversation.messages.push({
        role: 'assistant',
        content: assistantMessage,
      });

      return assistantMessage;
    } catch (error) {
      console.error('Error sending message to Anthropic:', error);
      throw error;
    }
  }

  getConversation(id: string): Conversation | undefined {
    return this.conversations.get(id);
  }

  getAllConversations(): Conversation[] {
    return Array.from(this.conversations.values());
  }

  deleteConversation(id: string): boolean {
    return this.conversations.delete(id);
  }
} 