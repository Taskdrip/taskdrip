import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MousePointerClick, Globe2, Smartphone, Monitor, Tablet } from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, BarChart, Bar, Legend,
} from "recharts";

const COLORS = ["#7c3aed", "#2563eb", "#16a34a", "#f59e0b", "#ef4444", "#0891b2", "#db2777", "#65a30d"];

export default function ShortLinkAnalyticsPage() {
  const [, params] = useRoute("/short-links/:id/analytics");
  const id = params?.id;
  const { data, isLoading } = useQuery<any>({ queryKey: ["/api/short-links", id, "analytics"], enabled: !!id });

  if (isLoading || !data) return <div className="p-8 text-gray-500">Loading analytics...</div>;
  const { link, totalClicks, uniqueCountries, timeline, byCountry, byDevice, byBrowser, byOs, byCity, byReferer, recent } = data;
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/short-links"><Button variant="outline" size="sm" data-testid="button-back-to-links"><ArrowLeft className="h-4 w-4 mr-1" /> All links</Button></Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl break-words" data-testid="text-link-title">{link.title || link.slug}</CardTitle>
          <div className="text-sm text-gray-600 break-all">
            <span className="font-mono text-purple-700">{baseUrl}/s/{link.slug}</span>
            <span className="mx-2">→</span>
            <span>{link.originalUrl}</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Stat icon={<MousePointerClick className="h-5 w-5 text-purple-600" />} label="Total clicks" value={totalClicks} testId="stat-total-clicks" />
            <Stat icon={<Globe2 className="h-5 w-5 text-blue-600" />} label="Countries" value={uniqueCountries} testId="stat-unique-countries" />
            <Stat icon={<Monitor className="h-5 w-5 text-green-600" />} label="Top device" value={byDevice[0]?.name || "—"} testId="stat-top-device" />
            <Stat icon={<Globe2 className="h-5 w-5 text-orange-600" />} label="Top country" value={byCountry[0]?.name || "—"} testId="stat-top-country" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Clicks over time</CardTitle></CardHeader>
        <CardContent style={{ height: 280 }}>
          {timeline.length === 0 ? (
            <p className="text-gray-500 text-sm">No clicks yet. Share your link to start collecting data.</p>
          ) : (
            <ResponsiveContainer><LineChart data={timeline}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#7c3aed" strokeWidth={2} dot={false} />
            </LineChart></ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Top countries</CardTitle></CardHeader>
          <CardContent style={{ height: 320 }}>
            {byCountry.length === 0 ? <p className="text-gray-500 text-sm">No data yet.</p> : (
              <ResponsiveContainer><BarChart data={byCountry.slice(0, 10)} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={110} />
                <Tooltip />
                <Bar dataKey="value" fill="#2563eb" />
              </BarChart></ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Devices</CardTitle></CardHeader>
          <CardContent style={{ height: 320 }}>
            {byDevice.length === 0 ? <p className="text-gray-500 text-sm">No data yet.</p> : (
              <ResponsiveContainer><PieChart>
                <Pie data={byDevice} dataKey="value" nameKey="name" outerRadius={100} label>
                  {byDevice.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart></ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Browsers</CardTitle></CardHeader>
          <CardContent style={{ height: 320 }}>
            {byBrowser.length === 0 ? <p className="text-gray-500 text-sm">No data yet.</p> : (
              <ResponsiveContainer><PieChart>
                <Pie data={byBrowser} dataKey="value" nameKey="name" outerRadius={100} label>
                  {byBrowser.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart></ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Operating systems</CardTitle></CardHeader>
          <CardContent style={{ height: 320 }}>
            {byOs.length === 0 ? <p className="text-gray-500 text-sm">No data yet.</p> : (
              <ResponsiveContainer><BarChart data={byOs}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#16a34a" />
              </BarChart></ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Top cities</CardTitle></CardHeader>
          <CardContent>
            {byCity.length === 0 ? <p className="text-gray-500 text-sm">No data yet.</p> : (
              <ul className="space-y-1 text-sm">
                {byCity.slice(0, 15).map((c: any) => (
                  <li key={c.name} className="flex justify-between border-b py-1"><span>{c.name}</span><Badge variant="outline">{c.value}</Badge></li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Traffic sources</CardTitle></CardHeader>
          <CardContent>
            {byReferer.length === 0 ? <p className="text-gray-500 text-sm">No data yet.</p> : (
              <ul className="space-y-1 text-sm">
                {byReferer.slice(0, 15).map((r: any) => (
                  <li key={r.name} className="flex justify-between border-b py-1"><span className="truncate">{r.name}</span><Badge variant="outline">{r.value}</Badge></li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Recent clicks</CardTitle></CardHeader>
        <CardContent>
          {recent.length === 0 ? <p className="text-gray-500 text-sm">No clicks recorded yet.</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-gray-500 border-b"><th className="py-2">When</th><th>Country</th><th>City</th><th>Device</th><th>Browser</th><th>Source</th></tr></thead>
                <tbody>
                  {recent.map((c: any) => (
                    <tr key={c.id} className="border-b last:border-0">
                      <td className="py-2">{c.clickedAt ? new Date(c.clickedAt).toLocaleString() : "—"}</td>
                      <td>{c.country || "—"}</td>
                      <td>{c.city || "—"}</td>
                      <td className="capitalize">{c.device || "—"}</td>
                      <td>{c.browser || "—"}</td>
                      <td className="truncate max-w-[200px]">{c.referer ? (() => { try { return new URL(c.referer).hostname; } catch { return c.referer; } })() : "Direct"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ icon, label, value, testId }: { icon: React.ReactNode; label: string; value: any; testId: string }) {
  return (
    <div className="border rounded-lg p-4 flex flex-col gap-1" data-testid={testId}>
      <div className="flex items-center gap-2 text-gray-600 text-xs uppercase tracking-wider">{icon}{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}
