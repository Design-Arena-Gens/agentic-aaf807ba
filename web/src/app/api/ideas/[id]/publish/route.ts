import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { retrieveRecord, updateRecord, listRecords } from "@/lib/airtable";
import { ContentIdeaFields, Platform } from "@/lib/types";
import { env } from "@/lib/env";
import { toContentIdea } from "@/lib/transform";
import { triggerMakeAutomation } from "@/lib/make";

const publishSchema = z.object({
  scheduledAt: z.string().datetime(),
  makeScenarioId: z.string().optional(),
});

function formatDateKey(dateIso: string) {
  return new Date(dateIso).toISOString().slice(0, 10);
}

function buildFrequencyFormula(platform: Platform, scheduledAt: string) {
  const scheduledField = `{${env.AIRTABLE_FIELD_SCHEDULED_AT}}`;
  const statusField = `{${env.AIRTABLE_FIELD_STATUS}}`;
  const platformField = `{${env.AIRTABLE_FIELD_PLATFORMS}}`;

  const dateKey = formatDateKey(scheduledAt);
  const safePlatform = platform.replace(/"/g, '\\"');

  return `AND(${statusField}=\"Scheduled\", FIND(\"${safePlatform}\", ARRAYJOIN(${platformField}))>0, DATETIME_FORMAT(${scheduledField}, 'YYYY-MM-DD')='${dateKey}')`;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const json = await request.json();
  const parsed = publishSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const record = await retrieveRecord<ContentIdeaFields>(id);
  const idea = toContentIdea(record);

  if (!idea.approved) {
    return NextResponse.json(
      { error: "Approve the content in Airtable before scheduling." },
      { status: 422 },
    );
  }

  if (!idea.instagram && !idea.facebook) {
    return NextResponse.json(
      { error: "Generate copy and imagery before scheduling." },
      { status: 422 },
    );
  }

  const limitPerDay = idea.frequencyPerDay ?? 1;

  for (const platform of idea.platforms) {
    const formula = buildFrequencyFormula(platform, parsed.data.scheduledAt);
    const records = await listRecords<ContentIdeaFields>({
      filterByFormula: formula,
    });

    if (records.length >= limitPerDay) {
      return NextResponse.json(
        {
          error: `Frequency limit reached for ${platform} on ${formatDateKey(parsed.data.scheduledAt)}`,
        },
        { status: 409 },
      );
    }
  }

  const updatedRecord = await updateRecord<ContentIdeaFields>(id, {
    [env.AIRTABLE_FIELD_SCHEDULED_AT]: parsed.data.scheduledAt,
    [env.AIRTABLE_FIELD_STATUS]: "Scheduled",
    [env.AIRTABLE_FIELD_MAKE_SCENARIO]: parsed.data.makeScenarioId,
  } as ContentIdeaFields);

  const scheduledIdea = toContentIdea(updatedRecord);

  if (env.MAKE_WEBHOOK_URL) {
    await triggerMakeAutomation({
      ideaId: scheduledIdea.id,
      idea: scheduledIdea.idea,
      platforms: scheduledIdea.platforms,
      instagram: scheduledIdea.instagram
        ? {
            caption: scheduledIdea.instagram.body,
            hashtags: scheduledIdea.instagram.hashtags,
            imageUrl: scheduledIdea.imageUrl,
          }
        : undefined,
      facebook: scheduledIdea.facebook
        ? {
            body: scheduledIdea.facebook.body,
            imageUrl: scheduledIdea.imageUrl,
          }
        : undefined,
      scheduledAt: scheduledIdea.scheduledAt,
    });
  }

  return NextResponse.json({ idea: scheduledIdea });
}
