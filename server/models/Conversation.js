import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema({
  user: String,
  messages: [
    {
      from: String,
      text: String,
    }
  ],
  correctDiagnosis: Boolean,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model('Conversation', conversationSchema);
