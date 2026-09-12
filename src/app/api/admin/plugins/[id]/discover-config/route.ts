import { NextResponse } from "next/server";
import { requireAdmin, isSessionUser } from "@/lib/session";
import { pluginConfigDiscoveryService } from "@/services/PluginConfigDiscoveryService";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = requireAdmin();
  if (!isSessionUser(session)) return session;

  try {
    const result = await pluginConfigDiscoveryService.discover(params.id);
    await audit(session.id, "plugin_config_discovered", { pluginId: params.id, found: result.found });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
