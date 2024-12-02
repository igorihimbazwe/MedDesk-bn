import mongoose from "mongoose";

const rotationSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: { type: Number, required: true },
});

const Rotation = mongoose.model("Rotation", rotationSchema);

export default Rotation;