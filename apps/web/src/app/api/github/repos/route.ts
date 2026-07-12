import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { listAccessibleRepos } from "@/lib/github";

export async function GET() {
  const session = await auth();

  if (!session?.accessToken) {
    return NextResponse.json(
      { error: "You must sign in with GitHub first." },
      { status: 401 },
    );
  }

  try {
    const repos = await listAccessibleRepos(session.accessToken);
    return NextResponse.json({ repos });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load repositories from GitHub.",
      },
      { status: 500 },
    );
  }
}
