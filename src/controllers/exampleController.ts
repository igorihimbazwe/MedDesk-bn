import { Request, Response } from "express";
import Example, { IExample } from "../models/Example";


const getExamples = async (req: Request, res: Response): Promise<void> => {
  try {
    const examples = await Example.find();
    res.status(200).json(examples);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
};


const createExample = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, age, email } = req.body;
    const newExample: IExample = new Example({ name, age, email });
    await newExample.save();
    res.status(201).json(newExample);
  } catch (error) {
    res.status(400).json({ message: "Failed to create example", error });
  }
};

export default { getExamples, createExample };
