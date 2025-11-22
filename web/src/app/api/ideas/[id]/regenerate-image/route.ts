import { NextResponse } from "next/server";
import { retrieveRecord, updateRecord } from "@/lib/airtable";
import { ContentIdeaFields } from "@/lib/types";
import { toContentIdea } from "@/lib/transform";
import { env } from "@/lib/env";
import { generateImagePrompt } from "@/lib/openai";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const record = await retrieveRecord<ContentIdeaFields>(id);
  const idea = toContentIdea(record);

  const { imageUrl, prompt } = await generateImagePrompt({
    idea: idea.idea,
    brandVoice: idea.brandVoice,
    imageStyle: idea.imageStyle,
    additionalPrompt: idea.notes,
  });

  const now = new Date().toISOString();

  const updatedRecord = await updateRecord<ContentIdeaFields>(id, {
    [env.AIRTABLE_FIELD_IMAGE_URL]: imageUrl,
    [env.AIRTABLE_FIELD_IMAGE_PROMPT]: prompt,
    [env.AIRTABLE_FIELD_LAST_IMAGE_AT]: now,
  } as ContentIdeaFields);

  return NextResponse.json({ idea: toContentIdea(updatedRecord) });
}
