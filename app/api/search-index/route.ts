import { buildGlobalSearchIndex } from "@/lib/chapters";

export const dynamic = "force-static";

export function GET() {
  return Response.json(buildGlobalSearchIndex());
}
