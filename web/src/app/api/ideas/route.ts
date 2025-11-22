import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { listRecords, createRecord } from "@/lib/airtable";
import { ContentIdea, ContentIdeaFields } from "@/lib/types";
import { toContentIdea } from "@/lib/transform";
import { env } from "@/lib/env";

const createIdeaSchema = z.object({
  idea: z.string().min(3, "Idea must contain at least 3 characters"),
  platforms: z.array(z.string()).optional(),
  notes: z.string().optional(),
  brandVoice: z.string().optional(),
  hashtagGuidance: z.string().optional(),
  imageStyle: z.string().optional(),
  frequencyPerDay: z.number().int().positive().optional(),
});

export async function GET() {
  const records = await listRecords<ContentIdeaFields>();

  const ideas: ContentIdea[] = records.map(toContentIdea);
  return NextResponse.json({ ideas });
}

export async function POST(request: NextRequest) {
  const json = await request.json();
  const parsed = createIdeaSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const body = parsed.data;
  const record = await createRecord<ContentIdeaFields>({
    [env.AIRTABLE_FIELD_IDEA]: body.idea,
    [env.AIRTABLE_FIELD_STATUS]: "Idea",
    [env.AIRTABLE_FIELD_PLATFORMS]: body.platforms,
    [env.AIRTABLE_FIELD_NOTES]: body.notes,
    [env.AIRTABLE_FIELD_BRAND_VOICE]: body.brandVoice,
    [env.AIRTABLE_FIELD_HASHTAGS]: body.hashtagGuidance,
    [env.AIRTABLE_FIELD_IMAGE_STYLE]: body.imageStyle,
    [env.AIRTABLE_FIELD_FREQUENCY_PER_DAY]: body.frequencyPerDay,
  } as ContentIdeaFields);

  return NextResponse.json({ idea: toContentIdea(record) }, { status: 201 });
}
