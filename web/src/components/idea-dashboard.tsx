"use client";

import Image from "next/image";
import { useCallback, useMemo, useState } from "react";
import useSWR from "swr";
import {
  ArrowRight,
  CalendarClock,
  CheckCheck,
  CheckCircle2,
  ImageIcon,
  Loader2,
  RefreshCcw,
  Rocket,
  Sparkles,
} from "lucide-react";
import { ContentIdea, Platform } from "@/lib/types";
import { supportedPlatforms } from "@/lib/platforms";

type IdeasResponse = {
  ideas: ContentIdea[];
};

const fetcher = (url: string) =>
  fetch(url).then((response) => {
    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }
    return response.json();
  });

type ActionKey =
  | "generate"
  | "regenerateText"
  | "regenerateImage"
  | "approve"
  | "schedule"
  | "markPosted"
  | "edit"
  | "create";

const formatInputDate = (iso?: string) => {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
};

const toIsoString = (value?: string) => {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
};

export function IdeaDashboard() {
  const { data, isLoading, mutate, error } = useSWR<IdeasResponse>("/api/ideas", fetcher, {
    refreshInterval: 30_000,
  });

  const ideas = data?.ideas ?? [];

  const [newIdea, setNewIdea] = useState("");
  const [newIdeaNotes, setNewIdeaNotes] = useState("");
  const [newIdeaPlatforms, setNewIdeaPlatforms] = useState<Platform[]>([
    "Instagram",
    "Facebook",
  ]);
  const [newIdeaBrandVoice, setNewIdeaBrandVoice] = useState("");
  const [newIdeaFrequency, setNewIdeaFrequency] = useState(1);
  const [actionLoading, setActionLoading] = useState<Record<string, ActionKey | null>>({});
  const [scheduleDrafts, setScheduleDrafts] = useState<Record<string, string>>({});
  const [editMode, setEditMode] = useState<Record<string, boolean>>({});
  const [editDrafts, setEditDrafts] = useState<
    Record<
      string,
      {
        idea: string;
        notes?: string;
        brandVoice?: string;
        hashtagGuidance?: string;
        imageStyle?: string;
        frequencyPerDay?: number;
        platforms: Platform[];
      }
    >
  >({});

  const setLoading = (id: string, key: ActionKey | null) => {
    setActionLoading((prev) => ({ ...prev, [id]: key }));
  };

  const reset = () => mutate();

  const isActionLoading = (id: string, key: ActionKey) =>
    actionLoading[id] === key;

  const handleNewIdeaPlatformToggle = (platform: Platform) => {
    setNewIdeaPlatforms((prev) =>
      prev.includes(platform) ? prev.filter((value) => value !== platform) : [...prev, platform],
    );
  };

  const handleScheduleChange = (id: string, value: string) => {
    setScheduleDrafts((prev) => {
      const next = { ...prev };
      const iso = toIsoString(value);
      if (!iso) {
        delete next[id];
      } else {
        next[id] = iso;
      }
      return next;
    });
  };

  const buildEditDraft = useCallback(
    (idea: ContentIdea) => ({
      idea: idea.idea,
      notes: idea.notes ?? "",
      brandVoice: idea.brandVoice ?? "",
      hashtagGuidance: idea.hashtagGuidance ?? "",
      imageStyle: idea.imageStyle ?? "",
      frequencyPerDay: idea.frequencyPerDay ?? 1,
      platforms: idea.platforms ?? [],
    }),
    [],
  );

  const toggleEdit = (idea: ContentIdea) => {
    setEditMode((prev) => ({ ...prev, [idea.id]: !prev[idea.id] }));
    setEditDrafts((prev) =>
      prev[idea.id] ? prev : { ...prev, [idea.id]: buildEditDraft(idea) },
    );
  };

  const updateEditDraft = <T,>(id: string, key: keyof ContentIdea, value: T) => {
    setEditDrafts((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] ?? {}),
        [key]: value,
      },
    }));
  };

  const handleAction = async (
    id: string,
    key: ActionKey,
    endpoint: string,
    payload?: unknown,
    mutateAfter = true,
  ) => {
    try {
      setLoading(id, key);
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: payload ? JSON.stringify(payload) : undefined,
      });

      if (!response.ok) {
        const errorJson = await response.json().catch(() => ({}));
        throw new Error(
          errorJson.error?.message ??
            errorJson.error ??
            `Request failed with status ${response.status}`,
        );
      }

      if (mutateAfter) {
        await mutate();
      }
    } catch (err) {
      console.error(err);
      const message =
        err instanceof Error ? err.message : "Unexpected error occurred. Check console.";
      alert(message);
    } finally {
      setLoading(id, null);
    }
  };

  const handleIdeaCreation = async () => {
    try {
      setLoading("new", "create");
      const response = await fetch("/api/ideas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          idea: newIdea,
          platforms: newIdeaPlatforms,
          notes: newIdeaNotes || undefined,
          brandVoice: newIdeaBrandVoice || undefined,
          frequencyPerDay: newIdeaFrequency,
        }),
      });

      if (!response.ok) {
        const errorJson = await response.json().catch(() => ({}));
        throw new Error(
          errorJson.error?.message ?? `Unable to create idea (${response.status}).`,
        );
      }

      setNewIdea("");
      setNewIdeaNotes("");
      setNewIdeaBrandVoice("");
      setNewIdeaFrequency(1);
      await mutate();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Unexpected error creating idea.");
    } finally {
      setLoading("new", null);
    }
  };

  const handleEditSave = async (idea: ContentIdea) => {
    const draft = editDrafts[idea.id];
    if (!draft) {
      return;
    }

    try {
      setLoading(idea.id, "edit");
      const response = await fetch(`/api/ideas/${idea.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          idea: draft.idea,
          notes: draft.notes,
          brandVoice: draft.brandVoice,
          hashtagGuidance: draft.hashtagGuidance,
          imageStyle: draft.imageStyle,
          frequencyPerDay: draft.frequencyPerDay,
          platforms: draft.platforms,
        }),
      });

      if (!response.ok) {
        const errorJson = await response.json().catch(() => ({}));
        throw new Error(
          errorJson.error?.message ?? `Unable to update idea (${response.status}).`,
        );
      }

      setEditMode((prev) => ({ ...prev, [idea.id]: false }));
      await mutate();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Unexpected error updating idea.");
    } finally {
      setLoading(idea.id, null);
    }
  };

  const emptyState = useMemo(
    () =>
      !isLoading && ideas.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center">
          <Sparkles className="mx-auto h-10 w-10 text-purple-400" />
          <p className="mt-4 text-lg font-semibold text-slate-800">
            No content ideas yet
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Start by capturing a content angle, tone, and target platforms. The AI engine will
            take care of the rest.
          </p>
        </div>
      ) : null,
    [ideas.length, isLoading],
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-12">
        <header className="flex flex-col gap-6 rounded-3xl bg-white/5 p-10 shadow-2xl shadow-purple-500/10 backdrop-blur">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-sm uppercase tracking-[0.4em] text-purple-300">
              <Sparkles className="h-4 w-4" />
              Agentic Social Ops
            </div>
            <h1 className="text-4xl font-semibold leading-tight md:text-5xl">
              Autonomous AI Social Media Launchpad
            </h1>
            <p className="max-w-2xl text-sm text-slate-300 md:text-base">
              Capture campaign inputs, generate platform-specific storytelling, produce on-brand
              visuals, and sync to Airtable and Make.com for approval and automated scheduling.
            </p>
          </div>
          <div className="grid gap-6 rounded-2xl border border-white/10 bg-black/30 p-8 md:grid-cols-2">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-purple-200">
                <Rocket className="h-4 w-4" />
                New Campaign Idea
              </div>
              <input
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-300/40"
                placeholder="Fresh hook or content angle..."
                value={newIdea}
                onChange={(event) => setNewIdea(event.target.value)}
              />
              <textarea
                className="h-24 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-300/40"
                placeholder="Notes, campaign outcomes, CTA, product highlights..."
                value={newIdeaNotes}
                onChange={(event) => setNewIdeaNotes(event.target.value)}
              />
              <div className="flex flex-wrap gap-3">
                {supportedPlatforms.map((platform) => (
                  <button
                    key={platform.platform}
                    onClick={() => handleNewIdeaPlatformToggle(platform.platform)}
                    className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-wide transition ${
                      newIdeaPlatforms.includes(platform.platform)
                        ? "border-purple-400 bg-purple-500/20 text-purple-200"
                        : "border-white/15 bg-transparent text-white/60 hover:border-white/30"
                    }`}
                    type="button"
                  >
                    {platform.platform}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <label className="block text-sm font-semibold uppercase tracking-widest text-purple-200">
                Brand Voice
              </label>
              <input
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-300/40"
                placeholder="Vibrant, data-backed, community-first..."
                value={newIdeaBrandVoice}
                onChange={(event) => setNewIdeaBrandVoice(event.target.value)}
              />
              <label className="block text-sm font-semibold uppercase tracking-widest text-purple-200">
                Posts per platform per day
              </label>
              <input
                type="number"
                min={1}
                className="w-32 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-300/40"
                value={newIdeaFrequency}
                onChange={(event) => setNewIdeaFrequency(Number(event.target.value))}
              />
              <button
                type="button"
                className="flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-purple-500 via-fuchsia-500 to-purple-400 px-5 py-3 text-sm font-semibold uppercase tracking-wide text-white shadow-lg shadow-purple-500/30 transition hover:opacity-90 disabled:cursor-progress disabled:opacity-80"
                onClick={handleIdeaCreation}
                disabled={!newIdea || isActionLoading("new", "create")}
              >
                {isActionLoading("new", "create") ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                Capture Idea
              </button>
            </div>
          </div>
        </header>

        {error ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-950/30 p-6 text-red-100">
            <p className="text-sm font-semibold">Unable to load Airtable ideas.</p>
            <button
              className="mt-3 text-xs uppercase tracking-widest text-red-200 underline"
              onClick={reset}
            >
              Retry
            </button>
          </div>
        ) : null}

        {isLoading ? (
          <div className="flex items-center gap-3 text-sm text-slate-300">
            <Loader2 className="h-4 w-4 animate-spin text-purple-300" />
            Syncing latest Airtable state...
          </div>
        ) : null}

        {emptyState}

        <div className="grid gap-6 md:grid-cols-2">
          {ideas.map((idea) => {
            const actionsDisabled = !!actionLoading[idea.id];
            return (
              <div
                key={idea.id}
                className="relative flex flex-col gap-6 rounded-3xl border border-white/10 bg-white/5 p-8 shadow-xl shadow-purple-500/10"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span
                      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] ${
                        idea.status === "Posted"
                          ? "bg-emerald-500/20 text-emerald-200"
                          : idea.status === "Scheduled"
                            ? "bg-blue-500/20 text-blue-200"
                            : idea.status === "Approved"
                              ? "bg-indigo-500/20 text-indigo-200"
                              : "bg-slate-700/40 text-slate-200"
                      }`}
                    >
                      {idea.status}
                    </span>
                    <h2 className="mt-4 text-xl font-semibold text-white">{idea.idea}</h2>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-purple-200">
                      {idea.platforms.map((platform) => (
                        <span
                          key={platform}
                          className="rounded-full border border-purple-500/30 px-3 py-1 uppercase tracking-[0.25em]"
                        >
                          {platform}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => toggleEdit(idea)}
                    className="rounded-full border border-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-white/60 transition hover:border-purple-300 hover:text-purple-200"
                    disabled={actionsDisabled}
                  >
                    {editMode[idea.id] ? "Close" : "Edit"}
                  </button>
                </div>

                {editMode[idea.id] ? (
                  <div className="rounded-2xl border border-purple-500/20 bg-black/30 p-5 text-sm text-white/90 shadow-inner shadow-purple-500/10">
                    <div className="grid gap-3">
                      <label className="text-xs uppercase tracking-widest text-purple-200">
                        Idea
                      </label>
                      <textarea
                        className="min-h-[96px] rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-300/40"
                        value={editDrafts[idea.id]?.idea ?? ""}
                        onChange={(event) =>
                          updateEditDraft(idea.id, "idea", event.target.value)
                        }
                      />
                      <label className="text-xs uppercase tracking-widest text-purple-200">
                        Notes
                      </label>
                      <textarea
                        className="min-h-[72px] rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-300/40"
                        value={editDrafts[idea.id]?.notes ?? ""}
                        onChange={(event) =>
                          updateEditDraft(idea.id, "notes", event.target.value)
                        }
                      />
                      <label className="text-xs uppercase tracking-widest text-purple-200">
                        Brand Voice
                      </label>
                      <input
                        className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-300/40"
                        value={editDrafts[idea.id]?.brandVoice ?? ""}
                        onChange={(event) =>
                          updateEditDraft(idea.id, "brandVoice", event.target.value)
                        }
                      />
                      <label className="text-xs uppercase tracking-widest text-purple-200">
                        Hashtag Guidance
                      </label>
                      <textarea
                        className="min-h-[72px] rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-300/40"
                        value={editDrafts[idea.id]?.hashtagGuidance ?? ""}
                        onChange={(event) =>
                          updateEditDraft(idea.id, "hashtagGuidance", event.target.value)
                        }
                      />
                      <label className="text-xs uppercase tracking-widest text-purple-200">
                        Image Style
                      </label>
                      <input
                        className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-300/40"
                        value={editDrafts[idea.id]?.imageStyle ?? ""}
                        onChange={(event) =>
                          updateEditDraft(idea.id, "imageStyle", event.target.value)
                        }
                      />
                      <label className="text-xs uppercase tracking-widest text-purple-200">
                        Platforms
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {supportedPlatforms.map((platform) => {
                          const checked = editDrafts[idea.id]?.platforms?.includes(
                            platform.platform,
                          );
                          return (
                            <button
                              key={platform.platform}
                              className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] ${
                                checked
                                  ? "border-purple-400 bg-purple-500/20 text-purple-200"
                                  : "border-white/15 bg-transparent text-white/60 hover:border-white/30"
                              }`}
                              onClick={() => {
                                const next = checked
                                  ? editDrafts[idea.id]?.platforms.filter(
                                      (value) => value !== platform.platform,
                                    ) ?? []
                                  : [...(editDrafts[idea.id]?.platforms ?? []), platform.platform];
                                updateEditDraft(idea.id, "platforms", next);
                              }}
                              type="button"
                            >
                              {platform.platform}
                            </button>
                          );
                        })}
                      </div>
                      <label className="text-xs uppercase tracking-widest text-purple-200">
                        Posts / day
                      </label>
                      <input
                        type="number"
                        min={1}
                        className="w-28 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-300/40"
                        value={editDrafts[idea.id]?.frequencyPerDay ?? 1}
                        onChange={(event) =>
                          updateEditDraft(
                            idea.id,
                            "frequencyPerDay",
                            Number(event.target.value),
                          )
                        }
                      />
                      <button
                        type="button"
                        onClick={() => handleEditSave(idea)}
                        disabled={isActionLoading(idea.id, "edit")}
                        className="mt-3 flex items-center justify-center gap-2 rounded-full bg-purple-500/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.4em] text-white transition hover:bg-purple-500 disabled:cursor-progress disabled:opacity-70"
                      >
                        {isActionLoading(idea.id, "edit") ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" />
                        )}
                        Save Updates
                      </button>
                    </div>
                  </div>
                ) : null}

                {idea.notes ? (
                  <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-xs text-white/70">
                    <strong className="text-white">Strategy Notes:</strong> {idea.notes}
                  </div>
                ) : null}

                <div className="grid gap-4 rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-white/80">
                  <span className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-purple-200">
                    <Sparkles className="h-4 w-4" /> Automation
                  </span>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      className="flex items-center gap-2 rounded-full border border-purple-400/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-purple-200 transition hover:bg-purple-500/20 disabled:cursor-progress disabled:opacity-60"
                      onClick={() =>
                        handleAction(
                          idea.id,
                          "generate",
                          `/api/ideas/${idea.id}/generate`,
                        )
                      }
                      disabled={actionsDisabled}
                    >
                      {isActionLoading(idea.id, "generate") ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                      Generate Assets
                    </button>
                    <button
                      type="button"
                      className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/80 transition hover:border-purple-300 hover:text-purple-200 disabled:cursor-progress disabled:opacity-60"
                      onClick={() =>
                        handleAction(
                          idea.id,
                          "regenerateText",
                          `/api/ideas/${idea.id}/regenerate-text`,
                          { platforms: idea.platforms },
                        )
                      }
                      disabled={actionsDisabled}
                    >
                      {isActionLoading(idea.id, "regenerateText") ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCcw className="h-4 w-4" />
                      )}
                      Refresh Copy
                    </button>
                    <button
                      type="button"
                      className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/80 transition hover:border-purple-300 hover:text-purple-200 disabled:cursor-progress disabled:opacity-60"
                      onClick={() =>
                        handleAction(
                          idea.id,
                          "regenerateImage",
                          `/api/ideas/${idea.id}/regenerate-image`,
                        )
                      }
                      disabled={actionsDisabled}
                    >
                      {isActionLoading(idea.id, "regenerateImage") ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ImageIcon className="h-4 w-4" />
                      )}
                      Refresh Visual
                    </button>
                    <button
                      type="button"
                      className={`flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] transition disabled:cursor-progress disabled:opacity-60 ${
                        idea.approved
                          ? "border-emerald-400/60 text-emerald-200 hover:bg-emerald-500/20"
                          : "border-amber-400/60 text-amber-200 hover:bg-amber-500/20"
                      }`}
                      onClick={() =>
                        handleAction(
                          idea.id,
                          "approve",
                          `/api/ideas/${idea.id}/approve`,
                          { approved: !idea.approved },
                        )
                      }
                      disabled={actionsDisabled}
                    >
                      {isActionLoading(idea.id, "approve") ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : idea.approved ? (
                        <CheckCheck className="h-4 w-4" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                      {idea.approved ? "Approved" : "Approve"}
                    </button>
                  </div>
                </div>

                <div className="grid gap-4 rounded-2xl border border-white/10 bg-black/30 p-4">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-purple-200">
                    <CalendarClock className="h-4 w-4" />
                    Scheduling
                  </div>
                  <input
                    type="datetime-local"
                    value={formatInputDate(scheduleDrafts[idea.id] ?? idea.scheduledAt)}
                    onChange={(event) => handleScheduleChange(idea.id, event.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-300/40"
                  />
                  <button
                    type="button"
                    className="flex items-center justify-center gap-2 rounded-full border border-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/80 transition hover:border-purple-300 hover:text-purple-200 disabled:cursor-progress disabled:opacity-60"
                    onClick={() =>
                      handleAction(
                        idea.id,
                        "schedule",
                        `/api/ideas/${idea.id}/publish`,
                        {
                          scheduledAt: scheduleDrafts[idea.id] ?? idea.scheduledAt,
                          makeScenarioId: idea.makeScenarioId,
                        },
                      )
                    }
                    disabled={
                      actionsDisabled || !(scheduleDrafts[idea.id] ?? idea.scheduledAt)
                    }
                  >
                    {isActionLoading(idea.id, "schedule") ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ArrowRight className="h-4 w-4" />
                    )}
                    Push to Make.com
                  </button>
                  {idea.scheduledAt ? (
                    <p className="text-xs text-purple-200">
                      Scheduled: {new Date(idea.scheduledAt).toLocaleString()}
                    </p>
                  ) : null}

                  <button
                    type="button"
                    className="flex items-center justify-center gap-2 rounded-full border border-emerald-400/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-200 transition hover:bg-emerald-500/20 disabled:cursor-progress disabled:opacity-60"
                    onClick={() =>
                      handleAction(idea.id, "markPosted", `/api/ideas/${idea.id}/mark-posted`)
                    }
                    disabled={actionsDisabled}
                  >
                    {isActionLoading(idea.id, "markPosted") ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    Mark as Posted
                  </button>
                  {idea.postedAt ? (
                    <p className="text-xs text-emerald-200">
                      Posted: {new Date(idea.postedAt).toLocaleString()}
                    </p>
                  ) : null}
                </div>

                <div className="grid gap-4">
                  {idea.instagram ? (
                    <div className="rounded-2xl border border-pink-400/25 bg-pink-500/10 p-5 text-sm leading-relaxed text-pink-50">
                      <div className="mb-3 flex items-center gap-3 text-xs uppercase tracking-[0.3em] text-pink-200">
                        <Sparkles className="h-4 w-4" />
                        Instagram Narrative
                      </div>
                      <p className="whitespace-pre-wrap">{idea.instagram.body}</p>
                      {idea.instagram.hashtags ? (
                        <p className="mt-3 text-xs uppercase tracking-widest text-pink-200">
                          {idea.instagram.hashtags
                            .map((tag) => (tag.startsWith("#") ? tag : `#${tag}`))
                            .join(" ")}
                        </p>
                      ) : null}
                    </div>
                  ) : null}

                  {idea.facebook ? (
                    <div className="rounded-2xl border border-blue-400/25 bg-blue-500/10 p-5 text-sm leading-relaxed text-blue-50">
                      <div className="mb-3 flex items-center gap-3 text-xs uppercase tracking-[0.3em] text-blue-200">
                        <Sparkles className="h-4 w-4" />
                        Facebook Longform
                      </div>
                      <p className="whitespace-pre-wrap">{idea.facebook.body}</p>
                    </div>
                  ) : null}

                  {idea.imageUrl ? (
                    <div className="overflow-hidden rounded-2xl border border-white/10">
                      <Image
                        src={idea.imageUrl}
                        alt={idea.idea}
                        width={1080}
                        height={1080}
                        className="h-full w-full object-cover"
                        priority={false}
                      />
                    </div>
                  ) : null}
                </div>

                <footer className="border-t border-white/10 pt-4 text-xs text-white/40">
                  <div>
                    Created: {new Date(idea.createdTime).toLocaleString()}
                  </div>
                  {idea.lastGeneratedAt ? (
                    <div>Copy updated: {new Date(idea.lastGeneratedAt).toLocaleString()}</div>
                  ) : null}
                  {idea.lastImageRefreshAt ? (
                    <div>Visual refreshed: {new Date(idea.lastImageRefreshAt).toLocaleString()}</div>
                  ) : null}
                </footer>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
