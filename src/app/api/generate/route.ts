import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // ✅ correct variable name
});

export async function POST(req: Request) {
  try {
    const { prompt, max_tokens } = await req.json();

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // cheaper + faster, change to "gpt-4o" if needed
      messages: [{ role: "user", content: prompt }],
      max_tokens: max_tokens || 1000,
    });

    return NextResponse.json({
      text: response.choices[0].message?.content,
    });
  } catch (error: any) {
    console.error("OpenAI API error:", error);
    return NextResponse.json(
      { error: "Failed to generate response" },
      { status: 500 }
    );
  }
}
