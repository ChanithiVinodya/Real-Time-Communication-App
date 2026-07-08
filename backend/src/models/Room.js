import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema(
  {
    roomCode: { type: String, required: true, unique: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.model('Room', roomSchema);
