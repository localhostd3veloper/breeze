import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IToolCall {
  id: string;
  type: string;
  function: {
    name: string;
    arguments: string;
  };
}

export interface IChatMessage extends Document {
  conversationId: Types.ObjectId;
  role: 'system' | 'user' | 'assistant' | 'data' | 'tool';
  content: string;
  reasoning?: string;
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

    toolCallId: { type: String },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

ChatMessageSchema.index({ conversationId: 1, createdAt: 1 });

export default mongoose.models.ChatMessage ||
  mongoose.model<IChatMessage>('ChatMessage', ChatMessageSchema);
