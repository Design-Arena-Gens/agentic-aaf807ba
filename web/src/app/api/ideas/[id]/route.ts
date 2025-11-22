import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { retrieveRecord, updateRecord } from "@/lib/airtable";
import { ContentIdeaFields } from "@/lib/types";
import { env } from "@/lib/env";
import { toContentIdea } from "@/lib/transform";

const updateIdeaSchema = z.object({
  idea: z.string().optional(),
  notes: z.string().nullable().optional(),
  brandVoice: z.string().nullable().optional(),
  hashtagGuidance: z.string().nullable().optional(),
  imageStyle: z.string().nullable().optional(),
  frequencyPerDay: z.number().int().positive().nullable().optional(),
  platforms: z.array(z.string()).optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const record = await retrieveRecord<ContentIdeaFields>(id);
  return NextResponse.json({ idea: toContentIdea(record) });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const json = await request.json();
  const parsed = updateIdeaSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const body = parsed.data;
  const updated = await updateRecord<ContentIdeaFields>(id, {
    [env.AIRTABLE_FIELD_IDEA]: body.idea ?? undefined,
    [env.AIRTABLE_FIELD_PLATFORMS]: body.platforms ?? undefined,
    [env.AIRTABLE_FIELD_NOTES]: body.notes ?? undefined,
    [env.AIRTABLE_FIELD_BRAND_VOICE]: body.brandVoice ?? undefined,
    [env.AIRTABLE_FIELD_HASHTAGS]: body.hashtagGuidance ?? undefined,
    [env.AIRTABLE_FIELD_IMAGE_STYLE]: body.imageStyle ?? undefined,
    [env.AIRTABLE_FIELD_FREQUENCY_PER_DAY]: body.frequencyPerDay ?? undefined,
  } as ContentIdeaFields);

  return NextResponse.json({ idea: toContentIdea(updated) });
}
