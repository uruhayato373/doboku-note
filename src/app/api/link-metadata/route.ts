import { NextRequest, NextResponse } from "next/server";
import { getLinkMetadata } from "@/lib/actions/link-metadata-actions";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get("url");

    if (!url) {
      return NextResponse.json(
        { error: "URL parameter is required" },
        { status: 400 }
      );
    }

    // メタデータを取得
    const metadata = await getLinkMetadata(url);

    return NextResponse.json(metadata);
  } catch (error) {
    console.error("Link metadata API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch metadata" },
      { status: 500 }
    );
  }
}
