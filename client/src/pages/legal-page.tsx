import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Navigation } from "@/components/ui/navigation";
import { Footer } from "@/components/ui/footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, FileText, Shield, Cookie, AlertTriangle, Clock, Mail } from "lucide-react";

const SLUG_META: Record<string, { title: string; icon: any; badge: string; color: string }> = {
  terms: { title: "Terms of Service", icon: FileText, badge: "Legal", color: "text-blue-600" },
  privacy: { title: "Privacy Policy", icon: Shield, badge: "Privacy", color: "text-green-600" },
  cookies: { title: "Cookie Policy", icon: Cookie, badge: "Cookies", color: "text-amber-600" },
  disclaimer: { title: "Disclaimer", icon: AlertTriangle, badge: "Disclaimer", color: "text-red-600" },
};

function renderContent(html: string) {
  return <div className="prose prose-gray max-w-none" dangerouslySetInnerHTML={{ __html: html }} />;
}

export function LegalPageTemplate({ slug }: { slug: string }) {
  const meta = SLUG_META[slug] || { title: slug, icon: FileText, badge: "Legal", color: "text-gray-600" };
  const Icon = meta.icon;

  const { data: page, isLoading, isError } = useQuery<any>({
    queryKey: [`/api/legal/${slug}`],
    retry: false,
  });

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navigation />
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <Link href="/">
            <Button variant="ghost" size="sm" className="mb-6 text-gray-500 hover:text-gray-900" data-testid="btn-back-home">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-2 rounded-lg bg-gray-50`}>
              <Icon className={`h-6 w-6 ${meta.color}`} />
            </div>
            <Badge variant="secondary">{meta.badge}</Badge>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mt-3 mb-2">
            {isLoading ? <Skeleton className="h-10 w-64" /> : (page?.title || meta.title)}
          </h1>
          {page?.updatedAt && (
            <p className="text-sm text-gray-400 flex items-center gap-1 mt-2">
              <Clock className="h-3.5 w-3.5" />
              Last updated: {new Date(page.updatedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
            </p>
          )}
        </div>

        <div className="border-t border-gray-100 pt-8">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-4 w-full" />)}
            </div>
          ) : isError ? (
            <div className="text-center py-16">
              <AlertTriangle className="h-12 w-12 text-amber-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-700 mb-2">Page not available</h2>
              <p className="text-gray-500 mb-6">This page is being prepared. Please check back soon or contact support.</p>
              <a href="mailto:support@taskdrip.online" className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700 font-medium">
                <Mail className="h-4 w-4" />
                support@taskdrip.online
              </a>
            </div>
          ) : (
            <div className="text-gray-700 leading-relaxed">
              {renderContent(page?.content || "")}
            </div>
          )}
        </div>

        <div className="mt-12 pt-8 border-t border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm text-gray-500">Questions about this policy?</p>
            <a href="mailto:legal@taskdrip.online" className="text-purple-600 hover:text-purple-700 text-sm font-medium">
              legal@taskdrip.online
            </a>
          </div>
          <div className="flex gap-3 flex-wrap">
            {slug !== "terms" && <Link href="/terms" className="text-sm text-gray-400 hover:text-gray-700">Terms of Service</Link>}
            {slug !== "privacy" && <Link href="/privacy" className="text-sm text-gray-400 hover:text-gray-700">Privacy Policy</Link>}
            {slug !== "cookies" && <Link href="/cookies" className="text-sm text-gray-400 hover:text-gray-700">Cookie Policy</Link>}
            {slug !== "disclaimer" && <Link href="/disclaimer" className="text-sm text-gray-400 hover:text-gray-700">Disclaimer</Link>}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default function LegalPageRoute({ params }: { params: { slug: string } }) {
  return <LegalPageTemplate slug={params.slug} />;
}
