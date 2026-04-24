import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { NavigationFixed } from "@/components/ui/navigation-fixed";
import { Button } from "@/components/ui/button";
import { Award, CheckCircle2, XCircle, Loader2, ArrowRight } from "lucide-react";

export default function CertificateVerify() {
  const { code } = useParams<{ code: string }>();

  const { data: cert, isLoading, isError } = useQuery<any>({
    queryKey: ["/api/certificates", code],
    queryFn: async () => {
      const r = await fetch(`/api/certificates/${code}`);
      if (!r.ok) throw new Error("Not found");
      return r.json();
    },
    enabled: !!code,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavigationFixed />
        <div className="pt-32 text-center"><Loader2 className="h-8 w-8 animate-spin text-violet-600 mx-auto" /></div>
      </div>
    );
  }

  if (isError || !cert) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavigationFixed />
        <div className="pt-32 max-w-md mx-auto text-center px-4">
          <XCircle className="h-12 w-12 mx-auto text-red-500 mb-3" />
          <h1 className="text-xl font-bold mb-1">Certificate not found</h1>
          <p className="text-sm text-gray-500 mb-4">No certificate matches the ID <code className="font-mono">{code}</code>.</p>
          <Link href="/breedskool"><Button>Browse courses</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-cyan-50">
      <NavigationFixed />
      <div className="pt-24 max-w-2xl mx-auto px-4 pb-16">
        <div className="bg-white border rounded-3xl shadow-xl p-8 sm:p-10 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-green-600 mb-4">
            <CheckCircle2 className="h-9 w-9" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-1">Verified Certificate</h1>
          <p className="text-sm text-gray-500 mb-6">This certificate is authentic and was issued by BreedSkool.</p>

          <div className="bg-gradient-to-br from-violet-50 to-cyan-50 rounded-2xl p-6 text-left space-y-3 border">
            <div className="flex items-center gap-2 text-violet-600">
              <Award className="h-5 w-5" />
              <span className="text-xs font-semibold uppercase tracking-wider">Certificate of Completion</span>
            </div>
            <Field label="Awarded to" value={cert.studentName} />
            <Field label="Course" value={cert.courseTitle} />
            <Field label="Issued" value={new Date(cert.issuedAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })} />
            {cert.instructorName && <Field label="Tutor" value={cert.instructorName} />}
            <Field label="Certificate ID" value={cert.certCode} mono />
          </div>

          <div className="mt-6">
            <Link href={`/breedskool/${cert.courseId}`}>
              <Button className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white" data-testid="button-view-course">
                View course <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">{label}</p>
      <p className={`text-base font-semibold text-gray-900 ${mono ? "font-mono text-sm" : ""}`}>{value}</p>
    </div>
  );
}
