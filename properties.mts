import { getStore } from "@netlify/blobs";
import type { Config } from "@netlify/functions";

function getPropertyStore() {
  return getStore({ name: "properties", consistency: "strong" });
}

function calcScores(d: Record<string, any>) {
  const n = (k: string) => {
    const v = parseFloat(d[k]);
    return isNaN(v) ? null : v;
  };
  const b = (k: string) =>
    d[k] === "yes" || d[k] === true
      ? true
      : d[k] === "no" || d[k] === false
      ? false
      : null;

  const avg = (arr: (number | null)[]) => {
    const v = arr.filter((x) => x !== null) as number[];
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
  };
  const r = (v: number | null) => (v !== null ? Math.round(v * 100) / 100 : null);

  const vac = n("vacancy_rate");
  const dsr = n("dsr");
  const dom = n("days_on_market");
  const stk = n("stock_on_market");
  const si = n("search_interest");
  const yld = n("gross_yield");
  const gTri = n("growth_triangulated");
  const rent36 = n("rental_growth_36m");
  const t10 = n("ten_year_growth");
  const hhi = b("household_income_above_avg");
  const pro = b("professional_occ_above_avg");
  const disc = n("vendor_discount");
  const bld = n("building_approvals");
  const stat = n("statistical_reliability");
  const land = d["land_supply"] || null;
  const raff = n("rent_affordability");
  const maff = n("mortgage_affordability");

  const score_demand = avg([
    vac != null ? (vac < 0.5 ? 10 : vac < 1 ? 8 : vac < 2 ? 5 : vac < 3 ? 3 : 1) : null,
    dsr != null ? (dsr >= 70 ? 10 : dsr >= 60 ? 8 : dsr >= 50 ? 6 : dsr >= 40 ? 4 : 2) : null,
    dom != null ? (dom < 20 ? 10 : dom < 30 ? 8 : dom < 45 ? 6 : dom < 60 ? 4 : 2) : null,
    stk != null ? (stk < 0.3 ? 10 : stk < 0.5 ? 8 : stk < 1 ? 6 : stk < 1.5 ? 4 : 2) : null,
    si != null ? (si >= 100 ? 10 : si >= 70 ? 8 : si >= 50 ? 6 : si >= 30 ? 4 : 2) : null,
  ]);
  const score_returns = avg([
    yld != null ? (yld >= 7 ? 10 : yld >= 6 ? 8 : yld >= 5 ? 6 : yld >= 4 ? 4 : 2) : null,
    gTri != null ? (gTri >= 50 ? 10 : gTri >= 40 ? 8 : gTri >= 30 ? 6 : gTri >= 20 ? 5 : gTri >= 10 ? 3 : 1) : null,
    rent36 != null ? (rent36 >= 25 ? 10 : rent36 >= 20 ? 8 : rent36 >= 15 ? 6 : rent36 >= 10 ? 4 : 2) : null,
  ]);
  const score_growth = avg([
    t10 != null ? (t10 >= 12 ? 10 : t10 >= 10 ? 8 : t10 >= 8 ? 6 : t10 >= 6 ? 4 : 2) : null,
    hhi != null ? (hhi ? 10 : 3) : null,
    pro != null ? (pro ? 10 : 3) : null,
  ]);
  const score_risk = avg([
    disc != null ? (disc < -2 ? 10 : disc < 0 ? 8 : disc < 2 ? 5 : disc < 4 ? 3 : 1) : null,
    bld != null ? (bld < 1 ? 10 : bld < 2 ? 8 : bld < 3 ? 5 : bld < 4 ? 3 : 1) : null,
    stat != null ? (stat >= 70 ? 10 : stat >= 60 ? 8 : stat >= 50 ? 6 : stat >= 40 ? 4 : 2) : null,
    land ? (land === "limited" ? 8 : land === "developing" ? 6 : 3) : null,
  ]);
  const score_affordability = avg([
    raff != null ? (raff >= 60 ? 10 : raff >= 50 ? 8 : raff >= 40 ? 6 : 4) : null,
    maff != null ? (maff >= 80 ? 10 : maff >= 70 ? 8 : maff >= 60 ? 6 : 4) : null,
  ]);

  const allScores = [score_demand, score_returns, score_growth, score_risk, score_affordability].filter(
    (x) => x !== null
  ) as number[];
  const score_overall = allScores.length ? allScores.reduce((a, b) => a + b, 0) / allScores.length : null;

  return {
    score_demand: r(score_demand),
    score_returns: r(score_returns),
    score_growth: r(score_growth),
    score_risk: r(score_risk),
    score_affordability: r(score_affordability),
    score_overall: r(score_overall),
  };
}

function nextId(properties: any[]): number {
  if (!properties.length) return 1;
  return Math.max(...properties.map((p: any) => p.id || 0)) + 1;
}

export default async (req: Request) => {
  const store = getPropertyStore();
  const url = new URL(req.url);
  const pathParts = url.pathname.replace(/^\/api\/properties\/?/, "").split("/").filter(Boolean);
  const id = pathParts[0] ? parseInt(pathParts[0]) : null;

  try {
    if (req.method === "GET") {
      const existing = await store.get("all", { type: "json" });
      let properties: any[] = existing || [];

      if (id) {
        const prop = properties.find((p: any) => p.id === id);
        if (!prop) return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
        return new Response(JSON.stringify(prop), { headers: { "Content-Type": "application/json" } });
      }

      const sortBy = url.searchParams.get("sort") || "created_at";
      const order = url.searchParams.get("order") === "asc" ? 1 : -1;
      properties.sort((a: any, b: any) => {
        const av = a[sortBy] ?? "";
        const bv = b[sortBy] ?? "";
        return av < bv ? -order : av > bv ? order : 0;
      });
      return new Response(JSON.stringify(properties), { headers: { "Content-Type": "application/json" } });
    }

    if (req.method === "POST") {
      const body = await req.json();
      const scores = calcScores(body);
      const existing = await store.get("all", { type: "json" });
      const properties: any[] = existing || [];
      const newProp = {
        ...body,
        ...scores,
        id: nextId(properties),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      properties.push(newProp);
      await store.setJSON("all", properties);
      return new Response(JSON.stringify(newProp), { status: 201, headers: { "Content-Type": "application/json" } });
    }

    if (req.method === "PUT" && id) {
      const body = await req.json();
      const scores = calcScores(body);
      const existing = await store.get("all", { type: "json" });
      let properties: any[] = existing || [];
      const idx = properties.findIndex((p: any) => p.id === id);
      if (idx === -1) return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
      const updated = { ...properties[idx], ...body, ...scores, id, updated_at: new Date().toISOString() };
      properties[idx] = updated;
      await store.setJSON("all", properties);
      return new Response(JSON.stringify(updated), { headers: { "Content-Type": "application/json" } });
    }

    if (req.method === "DELETE" && id) {
      const existing = await store.get("all", { type: "json" });
      let properties: any[] = existing || [];
      properties = properties.filter((p: any) => p.id !== id);
      await store.setJSON("all", properties);
      return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { "Content-Type": "application/json" } });
  } catch (err: any) {
    console.error(err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
};

export const config: Config = {
  path: ["/api/properties", "/api/properties/*"],
};
