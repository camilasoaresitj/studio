import { NextResponse } from 'next/server';

export async function GET() {
  const apiKey = process.env.CARGOES_API_KEY;
  const orgToken = process.env.CARGOES_ORG_TOKEN;

  if (!apiKey || !orgToken) {
    return NextResponse.json({ error: 'API credentials for Cargoes Flow are not configured.' }, { status: 500 });
  }

  try {
    const res = await fetch('https://connect.cargoes.com/flow/api/public_tracking/v1/shipments?shipmentType=INTERMODAL_SHIPMENT&status=ACTIVE', {
      headers: {
        'X-DPW-ApiKey': apiKey,
        'X-DPW-Org-Token': orgToken,
        'Accept': 'application/json',
      }
    });

    if (!res.ok) {
        const errorBody = await res.text();
        console.error("Cargoes Flow API Error:", errorBody);
        return NextResponse.json({ error: `Failed to fetch from Cargoes Flow API: ${res.statusText}` }, { status: res.status });
    }

    const data = await res.json();

    const eventos = data.flatMap((shipment: any) =>
      (shipment.shipmentEvents || []).map((ev: any) => ({
        eventName: ev.name,
        location: ev.location,
        actualTime: ev.actualTime || ev.estimateTime
      }))
    );

    return NextResponse.json(eventos);
  } catch (error: any) {
    console.error("Error in /api/eventos:", error);
    return NextResponse.json({ error: `An internal server error occurred: ${error.message}` }, { status: 500 });
  }
}
