import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { NavigationFixed } from "@/components/ui/navigation-fixed";
import { Footer } from "@/components/ui/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  BookOpen, Award, FileText, GraduationCap, Play, CheckCircle2, Clock, Star,
  TrendingUp, Zap, ArrowRight, Download, Eye, RefreshCw, Sparkles, Users,
  Upload, ChevronRight, ExternalLink, ShieldCheck, AlertCircle,
} from "lucide-react";

interface Enrollment {
  id: string;
  courseId: string;
  status: string;
  progress: number;
  isPaid: boolean;
  createdAt: string;
  course: {
    id: string;
    title: string;
    description: string;
    featuredImage?: string;
    instructor?: { firstName: string; lastName: string };
    isFree: boolean;
    price?: string;
    category?: string;
  };
}

interface Assignment {
  id: string;
  courseId: string;
  lessonId?: string;
  title: string;
  description?: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  status: string;
  tutorFeedback?: string;
  submittedAt: string;
}

interface Certificate {
  id: string;
  certCode: string;
  courseTitle: string;
  studentName: string;
  instructorName?: string;
  issuedAt: string;
}

const STATUS_BADGE: Record<string, { label: string; color: string }> = {
  active: { label: "Active", color: "bg-emerald-100 text-emerald-700" },
  pending_payment: { label: "Pending Payment", color: "bg-amber-100 text-amber-700" },
  pending: { label: "Pending", color: "bg-amber-100 text-amber-700" },
  submitted: { label: "Submitted", color: "bg-blue-100 text-blue-700" },
  reviewed: { label: "Reviewed", color: "bg-violet-100 text-violet-700" },
  approved: { label: "Approved", color: "bg-emerald-100 text-emerald-700" },
  rejected: { label: "Needs Revision", color: "bg-red-100 text-red-700" },
};

export default function MyTraining() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const u = user as any;

  const { data: enrollments = [], isLoading: enrollmentsLoading } = useQuery<Enrollment[]>({
    queryKey: ["/api/courses/my-enrollments"],
    enabled: isAuthenticated,
  });

  const { data: assignments = [], isLoading: assignmentsLoading } = useQuery<Assignment[]>({
    queryKey: ["/api/my/assignments"],
    queryFn: async () => {
      const r = await apiRequest("GET", "/api/my/assignments");
      return r.json();
    },
    enabled: isAuthenticated,
  });

  const { data: certificates = [], isLoading: certsLoading } = useQuery<Certificate[]>({
    queryKey: ["/api/my-certificates"],
    enabled: isAuthenticated,
  });

  const { data: breedskoolRegs = [] } = useQuery<any[]>({
    queryKey: ["/api/my/breedskool-registrations"],
    enabled: isAuthenticated,
  });

  const becomeCreator = useMutation({
    mutationFn: async () => {
      const r = await apiRequest("PATCH", "/api/user/become-creator");
      if (!r.ok) {
        const err = await r.json();
        throw new Error(err.message || "Failed to upgrade");
      }
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setShowUpgradeDialog(false);
      toast({
        title: "🎉 You're now a Creator!",
        description: "Your account has been upgraded. Start applying to brand campaigns and earning!",
      });
      setTimeout(() => setLocation("/dashboard"), 1500);
    },
    onError: (e: any) => {
      toast({ title: "Upgrade failed", description: e.message, variant: "destructive" });
    },
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-500/40 border-t-violet-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <GraduationCap className="h-12 w-12 text-violet-500 mx-auto" />
          <h2 className="text-xl font-bold">Login to view your training</h2>
          <Button onClick={() => setLocation("/login?redirect=/my-training")}>Login</Button>
        </div>
      </div>
    );
  }

  const activeEnrollments = enrollments.filter(e => e.status === "active");
  const isCreator = u?.userType === "creator" || u?.userType === "admin";
  const hasCompletedCourse = certificates.length > 0;

  const statsCards = [
    { label: "Courses Enrolled", value: enrollments.length, icon: BookOpen, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Active Courses", value: activeEnrollments.length, icon: Play, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Assignments", value: assignments.length, icon: FileText, color: "text-violet-600", bg: "bg-violet-50" },
    { label: "Certificates", value: certificates.length, icon: Award, color: "text-amber-600", bg: "bg-amber-50" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationFixed />

      {/* Hero */}
      <div className="bg-gradient-to-br from-violet-700 via-purple-700 to-indigo-800 pt-24 pb-12 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <GraduationCap className="h-8 w-8 text-white/80" />
            <span className="text-white/70 text-sm font-medium uppercase tracking-wider">BreedSkool</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-2">
            My Training Dashboard
          </h1>
          <p className="text-white/70 max-w-lg">
            Track your courses, assignments, and certificates. Keep learning and growing!
          </p>

          {/* Stats strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-8">
            {statsCards.map(s => (
              <div key={s.label} className="bg-white/10 backdrop-blur rounded-xl p-4 flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center`}>
                  <s.icon className={`h-5 w-5 ${s.color}`} />
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{s.value}</div>
                  <div className="text-xs text-white/60">{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Upgrade CTA */}
        {!isCreator && (hasCompletedCourse || activeEnrollments.length > 0) && (
          <div className="mb-6 bg-gradient-to-r from-violet-600 to-purple-600 rounded-2xl p-6 flex flex-col md:flex-row items-center gap-4">
            <div className="flex-1 text-white">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="h-5 w-5 text-yellow-300" />
                <span className="font-bold text-lg">Ready to become an Influencer?</span>
              </div>
              <p className="text-white/80 text-sm">
                Upgrade your account to start applying for brand campaigns and earning real crypto rewards.
              </p>
            </div>
            <Button
              onClick={() => setShowUpgradeDialog(true)}
              className="bg-white text-violet-700 hover:bg-violet-50 font-bold shrink-0"
              data-testid="btn-become-creator"
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Become a Creator
            </Button>
          </div>
        )}

        <Tabs defaultValue="courses">
          <TabsList className="mb-6 bg-white border shadow-sm">
            <TabsTrigger value="courses" data-testid="tab-my-courses">
              <BookOpen className="h-4 w-4 mr-1.5" />
              My Courses
            </TabsTrigger>
            <TabsTrigger value="assignments" data-testid="tab-my-assignments">
              <FileText className="h-4 w-4 mr-1.5" />
              Assignments
              {assignments.filter(a => a.status === "submitted").length > 0 && (
                <Badge className="ml-1.5 bg-amber-100 text-amber-700 text-xs px-1.5">
                  {assignments.filter(a => a.status === "submitted").length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="certificates" data-testid="tab-my-certs">
              <Award className="h-4 w-4 mr-1.5" />
              Certificates
            </TabsTrigger>
            <TabsTrigger value="registrations" data-testid="tab-my-regs">
              <FileText className="h-4 w-4 mr-1.5" />
              Registrations
            </TabsTrigger>
          </TabsList>

          {/* ── Courses Tab ── */}
          <TabsContent value="courses">
            {enrollmentsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-white rounded-2xl p-5 h-44 animate-pulse border" />
                ))}
              </div>
            ) : enrollments.length === 0 ? (
              <div className="text-center py-16">
                <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <h3 className="font-bold text-gray-700 mb-1">No courses yet</h3>
                <p className="text-gray-500 text-sm mb-4">Enroll in a BreedSkool course to get started.</p>
                <Link href="/breedskool">
                  <Button className="bg-violet-600 hover:bg-violet-700 text-white">
                    Browse Courses
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {enrollments.map(e => {
                  const statusInfo = STATUS_BADGE[e.status] || { label: e.status, color: "bg-gray-100 text-gray-600" };
                  return (
                    <div
                      key={e.id}
                      data-testid={`card-course-enrollment-${e.id}`}
                      className="bg-white rounded-2xl border shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                    >
                      {e.course.featuredImage && (
                        <div className="h-32 w-full overflow-hidden">
                          <img
                            src={e.course.featuredImage}
                            alt={e.course.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="p-5">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h3 className="font-bold text-gray-900 leading-snug">{e.course.title}</h3>
                          <Badge className={`text-xs shrink-0 ${statusInfo.color}`}>{statusInfo.label}</Badge>
                        </div>
                        {e.course.instructor && (
                          <p className="text-sm text-gray-500 mb-3">
                            by {e.course.instructor.firstName} {e.course.instructor.lastName}
                          </p>
                        )}
                        <div className="mb-4">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-gray-500">Progress</span>
                            <span className="text-xs font-semibold text-violet-600">{e.progress || 0}%</span>
                          </div>
                          <Progress value={e.progress || 0} className="h-2" />
                        </div>
                        <div className="flex items-center gap-2">
                          {e.status === "active" ? (
                            <Link href={`/breedskool/${e.courseId}/learn`}>
                              <Button size="sm" className="bg-violet-600 hover:bg-violet-700 text-white">
                                <Play className="h-3.5 w-3.5 mr-1" />
                                Continue Learning
                              </Button>
                            </Link>
                          ) : e.status === "pending_payment" ? (
                            <div className="flex items-center gap-1.5 text-amber-600 text-sm">
                              <Clock className="h-4 w-4" />
                              Awaiting payment approval
                            </div>
                          ) : null}
                          <Link href={`/breedskool/${e.courseId}`}>
                            <Button size="sm" variant="outline" className="text-gray-600">
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ── Assignments Tab ── */}
          <TabsContent value="assignments">
            {assignmentsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-white rounded-xl p-5 h-24 animate-pulse border" />
                ))}
              </div>
            ) : assignments.length === 0 ? (
              <div className="text-center py-16">
                <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <h3 className="font-bold text-gray-700 mb-1">No assignments yet</h3>
                <p className="text-gray-500 text-sm">Submit assignments from your course lessons.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {assignments.map(a => {
                  const statusInfo = STATUS_BADGE[a.status] || { label: a.status, color: "bg-gray-100 text-gray-600" };
                  return (
                    <div
                      key={a.id}
                      data-testid={`card-assignment-${a.id}`}
                      className="bg-white rounded-xl border shadow-sm p-5 flex flex-col md:flex-row gap-4"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <FileText className="h-4 w-4 text-violet-500" />
                          <span className="font-semibold text-gray-900">{a.title}</span>
                          <Badge className={`text-xs ${statusInfo.color}`}>{statusInfo.label}</Badge>
                        </div>
                        {a.description && (
                          <p className="text-sm text-gray-500 mb-2">{a.description}</p>
                        )}
                        {a.tutorFeedback && (
                          <div className="bg-violet-50 border border-violet-200 rounded-lg p-3 mt-2">
                            <p className="text-xs font-semibold text-violet-700 mb-1">Tutor Feedback:</p>
                            <p className="text-sm text-violet-800">{a.tutorFeedback}</p>
                          </div>
                        )}
                        <p className="text-xs text-gray-400 mt-2">
                          Submitted {new Date(a.submittedAt).toLocaleDateString()}
                        </p>
                      </div>
                      {a.fileUrl && (
                        <div className="shrink-0">
                          <a href={a.fileUrl} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" variant="outline" data-testid={`btn-download-assignment-${a.id}`}>
                              <Download className="h-4 w-4 mr-1" />
                              {a.fileName || "Download"}
                            </Button>
                          </a>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ── Certificates Tab ── */}
          <TabsContent value="certificates">
            {certsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2].map(i => (
                  <div key={i} className="bg-white rounded-2xl p-6 h-40 animate-pulse border" />
                ))}
              </div>
            ) : certificates.length === 0 ? (
              <div className="text-center py-16">
                <Award className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <h3 className="font-bold text-gray-700 mb-1">No certificates yet</h3>
                <p className="text-gray-500 text-sm">Complete all lessons in a course to earn your certificate.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {certificates.map(cert => (
                  <div
                    key={cert.id}
                    data-testid={`card-certificate-${cert.id}`}
                    className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-6"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                        <Award className="h-6 w-6 text-amber-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-900 mb-1">{cert.courseTitle}</h3>
                        <p className="text-sm text-gray-500 mb-1">{cert.studentName}</p>
                        {cert.instructorName && (
                          <p className="text-xs text-gray-400">Instructor: {cert.instructorName}</p>
                        )}
                        <p className="text-xs text-gray-400">
                          Issued {new Date(cert.issuedAt).toLocaleDateString()}
                        </p>
                        <div className="flex items-center gap-2 mt-3">
                          <Link href={`/certificates/${cert.certCode}`}>
                            <Button size="sm" variant="outline" className="text-amber-700 border-amber-300" data-testid={`btn-view-cert-${cert.id}`}>
                              <Eye className="h-3.5 w-3.5 mr-1" />
                              View
                            </Button>
                          </Link>
                          <Badge className="bg-amber-100 text-amber-700 text-xs font-mono">{cert.certCode}</Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── Registrations Tab ── */}
          <TabsContent value="registrations">
            {breedskoolRegs.length === 0 ? (
              <div className="text-center py-16">
                <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <h3 className="font-bold text-gray-700 mb-1">No registrations</h3>
                <p className="text-gray-500 text-sm">
                  Register for a BreedSkool tech training course.
                </p>
                <Link href="/breedskool">
                  <Button className="mt-4 bg-violet-600 hover:bg-violet-700 text-white">
                    Register Now
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {breedskoolRegs.map((reg: any) => {
                  const status = reg.paymentStatus || "registered";
                  const statusColors: Record<string, string> = {
                    registered: "bg-blue-100 text-blue-700",
                    pending: "bg-amber-100 text-amber-700",
                    verified: "bg-emerald-100 text-emerald-700",
                    rejected: "bg-red-100 text-red-700",
                  };
                  return (
                    <div
                      key={reg.id}
                      data-testid={`card-breedskool-reg-${reg.id}`}
                      className="bg-white rounded-xl border shadow-sm p-5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold text-gray-900">{reg.selectedCourseTitle}</div>
                          <p className="text-sm text-gray-500 mt-0.5">
                            Mode: {reg.deliveryMode?.replace(/_/g, " ")}
                            {reg.amountNgn ? ` · ₦${Number(reg.amountNgn).toLocaleString("en-NG")}` : ""}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            Registered {new Date(reg.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge className={`text-xs shrink-0 ${statusColors[status] || "bg-gray-100 text-gray-600"}`}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </Badge>
                      </div>
                      {reg.linkedCourseId && (
                        <div className="mt-3 flex items-center gap-2">
                          <Link href={`/breedskool/${reg.linkedCourseId}/learn`}>
                            <Button size="sm" className="bg-violet-600 hover:bg-violet-700 text-white text-xs">
                              <Play className="h-3 w-3 mr-1" />
                              Go to Course
                            </Button>
                          </Link>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Become Creator Dialog */}
      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-violet-600" />
              Upgrade to Creator
            </DialogTitle>
            <DialogDescription>
              Unlock the full Taskdrip platform as a content creator.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-3">
              {[
                { icon: Zap, text: "Apply for brand campaigns and earn crypto rewards" },
                { icon: Users, text: "Get discovered by brands looking for creators like you" },
                { icon: Award, text: "Build your creator profile and earn $TDRIP points" },
                { icon: ShieldCheck, text: "Access the P2P marketplace and direct hire features" },
              ].map(item => (
                <div key={item.text} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">
                    <item.icon className="h-4 w-4 text-violet-600" />
                  </div>
                  <p className="text-sm text-gray-700 pt-1">{item.text}</p>
                </div>
              ))}
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">
                Your student account will be upgraded to a creator account. Your training progress and certificates will be preserved.
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowUpgradeDialog(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-violet-600 hover:bg-violet-700 text-white"
                onClick={() => becomeCreator.mutate()}
                disabled={becomeCreator.isPending}
                data-testid="btn-confirm-become-creator"
              >
                {becomeCreator.isPending ? (
                  <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-1" />
                )}
                Upgrade Now
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
