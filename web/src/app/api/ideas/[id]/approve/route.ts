import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { retrieveRecord, updateRecord } from "@/lib/airtable";
import { ContentIdeaFields } from "@/lib/types";
import { env } from "@/lib/env";
import { toContentIdea } from "@/lib/transform";

const approveSchema = z.object({
  approved: z.boolean(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const json = await request.json();
  const parsed = approveSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const record = await retrieveRecord<ContentIdeaFields>(id);
  const idea = toContentIdea(record);

  if (!idea.instagram && !idea.facebook) {
    return NextResponse.json(
      { error: "Generate content before approval" },
      { status: 422 },
    );
  }

  const status = parsed.data.approved ? "Approved" : "Draft";

  const updatedRecord = await updateRecord<ContentIdeaFields>(id, {
    [env.AIRTABLE_FIELD_APPROVED]: parsed.data.approved,
    [env.AIRTABLE_FIELD_STATUS]: status,
  } as ContentIdeaFields);

  return NextResponse.json({ idea: toContentIdea(updatedRecord) });
}
