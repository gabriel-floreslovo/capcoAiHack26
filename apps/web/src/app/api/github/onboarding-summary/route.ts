import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { getRepoSnapshot } from "@/lib/github";
import { buildOnboardingMarkdown } from "@/lib/github-onboarding";

type RequestBody = {
  endDate?: string;
  notes?: string;
  repoFullName?: string;
  startDate?: string;
};

function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.accessToken) {
    return NextResponse.json(
      { error: "You must sign in with GitHub first." },
      { status: 401 },
    );
  }

  const body = (await request.json()) as RequestBody;
  const repoFullName = body.repoFullName?.trim() ?? "";
  const startDate = body.startDate?.trim() ?? "";
  const endDate = body.endDate?.trim() ?? "";
  const notes = body.notes?.trim() ?? "";

  if (!repoFullName) {
    return NextResponse.json(
      { error: "Repository selection is required." },
      { status: 400 },
    );
  }

  if (!isIsoDate(startDate) || !isIsoDate(endDate)) {
    return NextResponse.json(
      { error: "Start date and end date must be valid ISO dates." },
      { status: 400 },
    );
  }

  if (new Date(startDate).getTime() > new Date(endDate).getTime()) {
    return NextResponse.json(
      { error: "Start date must be on or before end date." },
      { status: 400 },
    );
  }

  try {
    const snapshot = await getRepoSnapshot(
      session.accessToken,
      repoFullName,
      startDate,
      endDate,
    );

    const summary = buildOnboardingMarkdown({
      endDate,
      notes,
      repoFullName,
      snapshot,
      startDate,
    });

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      repoFullName,
      summary,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to generate the onboarding summary.",
      },
      { status: 500 },
    );
  }
}
