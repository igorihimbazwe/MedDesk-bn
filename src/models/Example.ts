import mongoose, { Schema, Document } from "mongoose";


export interface IExample extends Document {
  name: string;
  age: number;
  email: string;
}


const ExampleSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    age: { type: Number, required: true },
    email: { type: String, required: true, unique: true },
  },
  {
    timestamps: true, 
  }
);


const Example = mongoose.model<IExample>("Example", ExampleSchema);

export default Example;
