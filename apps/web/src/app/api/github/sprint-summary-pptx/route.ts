import { auth } from "@/auth";
import { getRepoSnapshot } from "@/lib/github";
import { buildSprintReportModel } from "@/lib/github-reports";
import { buildSprintSummaryDeck } from "@/lib/pptx";

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
    return new Response("You must sign in with GitHub first.", { status: 401 });
  }

  const body = (await request.json()) as RequestBody;
  const repoFullName = body.repoFullName?.trim() ?? "";
  const startDate = body.startDate?.trim() ?? "";
  const endDate = body.endDate?.trim() ?? "";
  const notes = body.notes?.trim() ?? "";

  if (!repoFullName) {
    return new Response("Repository selection is required.", { status: 400 });
  }

  if (!isIsoDate(startDate) || !isIsoDate(endDate)) {
    return new Response("Start date and end date must be valid ISO dates.", {
      status: 400,
    });
  }

  if (new Date(startDate).getTime() > new Date(endDate).getTime()) {
    return new Response("Start date must be on or before end date.", {
      status: 400,
    });
  }

  try {
    const snapshot = await getRepoSnapshot(
      session.accessToken,
      repoFullName,
      startDate,
      endDate,
    );

    const reportModel = buildSprintReportModel({
      endDate,
      notes,
      repoFullName,
      snapshot,
      startDate,
    });
    const deckBuffer = await buildSprintSummaryDeck(reportModel);
    const body =
      typeof deckBuffer === "string"
        ? deckBuffer
        : deckBuffer instanceof Blob
          ? deckBuffer
          : new Blob(
              [
                Buffer.from(
                  deckBuffer instanceof ArrayBuffer
                    ? new Uint8Array(deckBuffer)
                    : deckBuffer,
                ),
              ],
              {
              type:
                "application/vnd.openxmlformats-officedocument.presentationml.presentation",
              },
            );

    return new Response(body, {
      status: 200,
      headers: {
        "Content-Disposition": `attachment; filename="${repoFullName.replace("/", "-")}-sprint-summary.pptx"`,
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      },
    });
  } catch (error) {
    return new Response(
      error instanceof Error
        ? error.message
        : "Unable to generate the PowerPoint artifact.",
      { status: 500 },
    );
  }
}
