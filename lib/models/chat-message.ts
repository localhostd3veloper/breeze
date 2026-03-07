import mongoose, { Schema, Document, Types } from 'mongoose';

// Interface to match AI SDK's tool call structure
export interface IToolCall {
  id: string; // Tool call ID
  type: string; // usually 'function'
  function: {
    name: string;
    arguments: string; // JSON string of arguments
  };
}

export interface IChatMessage extends Document {
  conversationId: Types.ObjectId;
  role: 'system' | 'user' | 'assistant' | 'data' | 'tool';
  content: string;
  reasoning?: string; // e.g. for DeepSeek-R1 <reasoning> output
  images?: string[]; // Array of base64 strings or URLs
  toolCalls?: IToolCall[];
  toolCallId?: string; // If role is 'tool', this links back to the original tool request
  createdAt: Date;
}

const ChatMessageSchema: Schema = new Schema(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
    },
    role: {
      type: String,
      required: true,
      enum: ['system', 'user', 'assistant', 'data', 'tool'],
    },
    content: { type: String, default: '' },
    reasoning: { type: String },
    images: [{ type: String }],

    // Storing complete tool call representations for assistant messages
    toolCalls: [
      {
        id: { type: String, required: true },
        type: { type: String, required: true },
        function: {
          name: { type: String, required: true },
          arguments: { type: String, required: true },
        },
      },
    ],

    // For tool messages (results of tool calls)
    toolCallId: { type: String },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // Messages usually aren't updated
  },
);

// Index for efficiently fetching a conversation's messages in chronological order
ChatMessageSchema.index({ conversationId: 1, createdAt: 1 });

export default mongoose.models.ChatMessage ||
  mongoose.model<IChatMessage>('ChatMessage', ChatMessageSchema);
