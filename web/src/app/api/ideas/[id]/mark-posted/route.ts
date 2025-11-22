import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { updateRecord } from "@/lib/airtable";
import { ContentIdeaFields } from "@/lib/types";
import { env } from "@/lib/env";

const markPostedSchema = z.object({
  postedAt: z.string().datetime().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const json = await request.json().catch(() => ({}));
  const parsed = markPostedSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const postedAt = parsed.data.postedAt ?? new Date().toISOString();

  await updateRecord<ContentIdeaFields>(id, {
    [env.AIRTABLE_FIELD_STATUS]: "Posted",
    [env.AIRTABLE_FIELD_POSTED_AT]: postedAt,
  } as ContentIdeaFields);

  return NextResponse.json({ ok: true });
}
