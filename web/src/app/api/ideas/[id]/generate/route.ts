import { NextRequest, NextResponse } from "next/server";
import { retrieveRecord, updateRecord } from "@/lib/airtable";
import { ContentIdeaFields } from "@/lib/types";
import { toContentIdea } from "@/lib/transform";
import { env } from "@/lib/env";
import {
  generateImagePrompt,
  generatePlatformCopy,
} from "@/lib/openai";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const record = await retrieveRecord<ContentIdeaFields>(id);
  const idea = toContentIdea(record);

  if (!idea.idea) {
    return NextResponse.json(
      { error: "Idea field is empty" },
      { status: 400 },
    );
  }

  const copy = await generatePlatformCopy({
    idea: idea.idea,
    notes: idea.notes,
    brandVoice: idea.brandVoice,
    hashtagStrategy: idea.hashtagGuidance,
    platforms: idea.platforms,
  });

  const { imageUrl, prompt } = await generateImagePrompt({
    idea: idea.idea,
    brandVoice: idea.brandVoice,
    imageStyle: idea.imageStyle,
    additionalPrompt: idea.notes,
  });

  const now = new Date().toISOString();

  const updatedRecord = await updateRecord<ContentIdeaFields>(id, {
    [env.AIRTABLE_FIELD_INSTAGRAM_CAPTION]: copy.Instagram?.body,
    [env.AIRTABLE_FIELD_INSTAGRAM_HASHTAGS]: copy.Instagram?.hashtags
      ?.map((tag) => (tag.startsWith("#") ? tag : `#${tag}`))
      .join(" "),
    [env.AIRTABLE_FIELD_FACEBOOK_COPY]: copy.Facebook?.body,
    [env.AIRTABLE_FIELD_IMAGE_URL]: imageUrl,
    [env.AIRTABLE_FIELD_IMAGE_PROMPT]: prompt,
    [env.AIRTABLE_FIELD_LAST_GENERATED_AT]: now,
    [env.AIRTABLE_FIELD_LAST_IMAGE_AT]: now,
    [env.AIRTABLE_FIELD_STATUS]: "Draft",
  } as ContentIdeaFields);

  return NextResponse.json({ idea: toContentIdea(updatedRecord) });
}
