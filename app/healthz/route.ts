// Liveness probe for the container healthcheck; no backend dependency.
export function GET() {
  return Response.json({ ok: true });
}
