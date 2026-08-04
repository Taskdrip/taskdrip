import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import {
  PlusCircle, Edit, Trash2, Users, Star, Eye, BookOpen, DollarSign,
  Upload, Image, Video, FileText, File, X, GripVertical, PlayCircle, ChevronDown, ChevronUp, CheckCircle2,
  Award, MessageSquare, Shield, Loader2, Home, School, MonitorPlay, Baby, MapPin, Plus, Filter,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "wouter";

const courseFormSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(20, "Description must be at least 20 characters"),
  shortDescription: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  price: z.string().optional(),
  salePrice: z.string().optional(),
  saleDeadline: z.string().optional(),
  isFree: z.boolean().default(false),
  level: z.string().default("beginner"),
  duration: z.string().optional(),
  whatYouLearn: z.string().optional(),
  requirements: z.string().optional(),
  isPublished: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
});

const lessonFormSchema = z.object({
  title: z.string().min(2, "Title is required"),
  description: z.string().optional(),
  videoLink: z.string().optional(),
  content: z.string().optional(),
  isPreview: z.boolean().default(false),
});

type CourseFormData = z.infer<typeof courseFormSchema>;
type LessonFormData = z.infer<typeof lessonFormSchema>;

const CATEGORIES = [
  { value: "instagram_growth", label: "Instagram Growth" },
  { value: "tiktok_mastery", label: "TikTok Mastery" },
  { value: "youtube", label: "YouTube Success" },
  { value: "monetization", label: "Monetization" },
  { value: "content_creation", label: "Content Creation" },
  { value: "branding", label: "Personal Branding" },
  { value: "general", label: "General Marketing" },
];

const LEVELS = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

function ImageUpload({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch("/api/upload/image", { method: "POST", body: fd, credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      onChange(data.url);
      toast({ title: "Image uploaded!" });
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label>Featured Image</Label>
      <div
        className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center cursor-pointer hover:border-violet-400 transition-colors relative"
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
      >
        {value ? (
          <div className="relative">
            <img src={value} alt="Featured" className="w-full h-36 object-cover rounded-lg" />
            <button
              type="button"
              className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
              onClick={(e) => { e.stopPropagation(); onChange(""); }}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <div className="py-4">
            <Image className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm text-gray-500">{uploading ? "Uploading..." : "Click or drag image here"}</p>
            <p className="text-xs text-gray-400 mt-1">JPG, PNG, WebP accepted</p>
          </div>
        )}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
      </div>
      {value && !value.startsWith("http") && (
        <p className="text-xs text-green-600">✓ Image uploaded from device</p>
      )}
      <div className="flex gap-2 items-center">
        <span className="text-xs text-gray-400">or paste URL:</span>
        <Input
          value={value.startsWith("http") ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://..."
          className="text-xs h-8"
        />
      </div>
    </div>
  );
}

function LessonFileUpload({ files, onChange }: { files: any[]; onChange: (files: any[]) => void }) {
  const filesRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);

  const handleFiles = async (fileList: FileList) => {
    setUploading(true);
    try {
      const newFiles = [];
      for (const file of Array.from(fileList)) {
        const fd = new FormData();
        fd.append("image", file);
        const res = await fetch("/api/upload/image", { method: "POST", body: fd, credentials: "include" });
        const data = await res.json();
        if (res.ok) {
          newFiles.push({ name: file.name, url: data.url, size: file.size, mimetype: file.type });
        }
      }
      onChange([...files, ...newFiles]);
      toast({ title: `${newFiles.length} file(s) uploaded` });
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label>Lesson Files (PDF, images, etc.)</Label>
      <div className="space-y-2">
        {files.map((f, i) => (
          <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-lg p-2 text-sm">
            <File className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <a href={f.url} target="_blank" rel="noreferrer" className="flex-1 truncate text-blue-600 hover:underline">{f.name}</a>
            <button type="button" onClick={() => onChange(files.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-600">
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => filesRef.current?.click()}
        className="flex items-center gap-2 text-sm text-violet-600 hover:text-violet-700 border border-dashed border-violet-300 rounded-lg px-3 py-2 hover:bg-violet-50 transition-colors"
      >
        <Upload className="h-4 w-4" />
        {uploading ? "Uploading..." : "Upload files"}
      </button>
      <input ref={filesRef} type="file" multiple className="hidden" onChange={(e) => { if (e.target.files) handleFiles(e.target.files); }} />
    </div>
  );
}

function LessonManageDialog({ course }: { course: any }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [lessonOpen, setLessonOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<any>(null);
  const [lessonFiles, setLessonFiles] = useState<any[]>([]);
  const [expandedLesson, setExpandedLesson] = useState<string | null>(null);

  const { data: lessons = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/courses", course.id, "lessons"],
    queryFn: async () => {
      const res = await fetch(`/api/courses/${course.id}/lessons`, { credentials: "include" });
      return res.ok ? res.json() : [];
    },
    enabled: open,
  });

  const form = useForm<LessonFormData>({
    resolver: zodResolver(lessonFormSchema),
    defaultValues: { isPreview: false },
  });

  const createLessonMutation = useMutation({
    mutationFn: async (data: LessonFormData) => {
      const payload = {
        title: data.title,
        description: data.description || "",
        videoLink: data.videoLink || "",
        content: data.content || "",
        isPreview: data.isPreview,
        order: lessons.length,
        lessonFiles,
      };
      const url = editingLesson
        ? `/api/courses/${course.id}/lessons/${editingLesson.id}`
        : `/api/courses/${course.id}/lessons`;
      const method = editingLesson ? "PATCH" : "POST";
      const res = await apiRequest(method, url, payload);
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courses", course.id, "lessons"] });
      queryClient.invalidateQueries({ queryKey: ["/api/courses/admin/all"] });
      toast({ title: editingLesson ? "Lesson updated!" : "Lesson added!" });
      setLessonOpen(false);
      setEditingLesson(null);
      setLessonFiles([]);
      form.reset({ isPreview: false });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteLessonMutation = useMutation({
    mutationFn: async (lessonId: string) => {
      const res = await fetch(`/api/courses/${course.id}/lessons/${lessonId}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) { const j = await res.json(); throw new Error(j.message); }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courses", course.id, "lessons"] });
      queryClient.invalidateQueries({ queryKey: ["/api/courses/admin/all"] });
      toast({ title: "Lesson deleted" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const openEdit = (lesson: any) => {
    setEditingLesson(lesson);
    setLessonFiles(Array.isArray(lesson.lessonFiles) ? lesson.lessonFiles : []);
    form.reset({
      title: lesson.title,
      description: lesson.description || "",
      videoLink: lesson.videoLink || lesson.videoUrl || "",
      content: lesson.content || "",
      isPreview: lesson.isPreview,
    });
    setLessonOpen(true);
  };

  const openAdd = () => {
    setEditingLesson(null);
    setLessonFiles([]);
    form.reset({ isPreview: false });
    setLessonOpen(true);
  };

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="text-violet-600 border-violet-200 hover:bg-violet-50">
        <BookOpen className="h-3 w-3 mr-1" /> Lessons
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Lessons — {course.title}</span>
              <Button size="sm" className="bg-violet-600 hover:bg-violet-700 text-white gap-1" onClick={openAdd}>
                <PlusCircle className="h-4 w-4" /> Add Lesson
              </Button>
            </DialogTitle>
          </DialogHeader>

          {isLoading ? (
            <div className="text-center py-8 text-gray-400">Loading lessons...</div>
          ) : lessons.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="mb-3">No lessons yet.</p>
              <Button size="sm" className="bg-violet-600 hover:bg-violet-700 text-white" onClick={openAdd}>
                <PlusCircle className="h-4 w-4 mr-1" /> Add First Lesson
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {lessons.map((lesson, idx) => (
                <div key={lesson.id} className="border border-gray-100 rounded-xl overflow-hidden">
                  <div className="flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors">
                    <div className="w-7 h-7 rounded-full bg-violet-100 text-violet-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm text-gray-900 truncate">{lesson.title}</span>
                        {lesson.isPreview && <Badge className="bg-green-100 text-green-700 text-xs">Preview</Badge>}
                        {lesson.videoLink && <Badge className="bg-blue-100 text-blue-700 text-xs flex items-center gap-1"><Video className="h-3 w-3" />Video</Badge>}
                        {Array.isArray(lesson.lessonFiles) && lesson.lessonFiles.length > 0 && (
                          <Badge className="bg-orange-100 text-orange-700 text-xs flex items-center gap-1"><File className="h-3 w-3" />{lesson.lessonFiles.length} file(s)</Badge>
                        )}
                      </div>
                      {lesson.description && <p className="text-xs text-gray-400 mt-0.5 truncate">{lesson.description}</p>}
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button size="sm" variant="ghost" onClick={() => setExpandedLesson(expandedLesson === lesson.id ? null : lesson.id)}>
                        {expandedLesson === lesson.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => openEdit(lesson)}>
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-600"
                        onClick={() => { if (confirm("Delete this lesson?")) deleteLessonMutation.mutate(lesson.id); }}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  {expandedLesson === lesson.id && (
                    <div className="border-t border-gray-100 px-4 pb-4 pt-3 space-y-2">
                      {lesson.content && (
                        <p className="text-sm text-gray-600 leading-relaxed">{lesson.content}</p>
                      )}
                      {(lesson.videoLink || lesson.videoUrl) && (
                        <div className="rounded-lg overflow-hidden aspect-video bg-black">
                          <iframe
                            src={getEmbedUrl(lesson.videoLink || lesson.videoUrl)}
                            className="w-full h-full"
                            allowFullScreen
                            title={lesson.title}
                          />
                        </div>
                      )}
                      {Array.isArray(lesson.lessonFiles) && lesson.lessonFiles.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-xs text-gray-500 font-medium">Files:</p>
                          {lesson.lessonFiles.map((f: any, i: number) => (
                            <a key={i} href={f.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-xs text-blue-600 hover:underline">
                              <File className="h-3 w-3" /> {f.name}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add/Edit Lesson Dialog */}
      <Dialog open={lessonOpen} onOpenChange={(v) => { setLessonOpen(v); if (!v) { setEditingLesson(null); setLessonFiles([]); form.reset({ isPreview: false }); } }}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingLesson ? "Edit Lesson" : "Add New Lesson"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit((d) => createLessonMutation.mutate(d))} className="space-y-4">
            <div>
              <Label>Lesson Title *</Label>
              <Input {...form.register("title")} placeholder="e.g. Understanding the Algorithm" />
              {form.formState.errors.title && <p className="text-red-500 text-xs mt-1">{form.formState.errors.title.message}</p>}
            </div>
            <div>
              <Label>Short Description</Label>
              <Input {...form.register("description")} placeholder="Brief overview of this lesson" />
            </div>
            <div>
              <Label className="flex items-center gap-2"><Video className="h-4 w-4 text-blue-500" /> Video Link (YouTube / Vimeo / Direct URL)</Label>
              <Input {...form.register("videoLink")} placeholder="https://www.youtube.com/watch?v=... or https://vimeo.com/..." />
              <p className="text-xs text-gray-400 mt-1">Paste a YouTube, Vimeo, or direct video URL. It will be embedded in the lesson.</p>
            </div>
            <div>
              <Label className="flex items-center gap-2"><FileText className="h-4 w-4 text-green-500" /> Lesson Content</Label>
              <Textarea {...form.register("content")} rows={5} placeholder="Write the lesson text content here..." />
            </div>
            <LessonFileUpload files={lessonFiles} onChange={setLessonFiles} />
            <div className="flex items-center gap-3 p-3 border rounded-lg bg-gray-50">
              <Switch checked={form.watch("isPreview")} onCheckedChange={(v) => form.setValue("isPreview", v)} />
              <div>
                <Label className="cursor-pointer">Free Preview Lesson</Label>
                <p className="text-xs text-gray-400">Non-enrolled users can view this lesson</p>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit" className="bg-violet-600 hover:bg-violet-700 text-white flex-1" disabled={createLessonMutation.isPending}>
                {createLessonMutation.isPending ? "Saving..." : editingLesson ? "Update Lesson" : "Add Lesson"}
              </Button>
              <Button type="button" variant="outline" onClick={() => { setLessonOpen(false); setEditingLesson(null); }}>Cancel</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function getEmbedUrl(url: string): string {
  if (!url) return "";
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  return url;
}

function PaymentDetailDialog({ enrollment, onApprove, approving }: { enrollment: any; onApprove: () => void; approving: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="text-blue-600 border-blue-200 hover:bg-blue-50 gap-1">
        <Eye className="h-3 w-3" /> Details
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Payment Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-1">Course</p>
                <p className="font-medium text-gray-900">{enrollment.course?.title || enrollment.courseId}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-1">Amount</p>
                <p className="font-bold text-gray-900">${enrollment.amount} USDT</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-1">Student</p>
                <p className="font-medium text-gray-900">{enrollment.user?.firstName} {enrollment.user?.lastName}</p>
                <p className="text-xs text-gray-500">{enrollment.user?.email}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-1">Network</p>
                <p className="font-medium text-gray-900">{enrollment.paymentMethod || "N/A"}</p>
              </div>
            </div>
            {enrollment.transactionHash && (
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                <p className="text-xs text-blue-600 font-medium mb-1">Transaction Hash</p>
                <p className="font-mono text-xs text-gray-800 break-all">{enrollment.transactionHash}</p>
              </div>
            )}
            {enrollment.paymentProof && (
              <div className="bg-violet-50 border border-violet-100 rounded-lg p-3">
                <p className="text-xs text-violet-600 font-medium mb-2">Payment Proof</p>
                {(enrollment.paymentProof.startsWith("http") || enrollment.paymentProof.startsWith("/")) ? (
                  <div className="space-y-2">
                    <img
                      src={enrollment.paymentProof}
                      alt="Payment proof"
                      className="w-full rounded-lg object-contain max-h-64 bg-white"
                      onError={(e) => {
                        const img = e.target as HTMLImageElement;
                        img.style.display = "none";
                        const link = img.nextElementSibling as HTMLElement;
                        if (link) link.style.display = "flex";
                      }}
                    />
                    <a href={enrollment.paymentProof} target="_blank" rel="noreferrer"
                      className="text-xs text-violet-600 hover:underline flex items-center gap-1">
                      Open original ↗
                    </a>
                  </div>
                ) : (
                  <p className="text-xs text-gray-700 break-all">{enrollment.paymentProof}</p>
                )}
              </div>
            )}
            {enrollment.submittedAt && (
              <p className="text-xs text-gray-400">Submitted: {new Date(enrollment.submittedAt).toLocaleString()}</p>
            )}
            <div className="flex gap-2 pt-2">
              <Button className="bg-green-600 hover:bg-green-700 text-white flex-1 gap-2"
                onClick={() => { onApprove(); setOpen(false); }} disabled={approving}>
                <CheckCircle2 className="h-4 w-4" />
                {approving ? "Approving..." : "Approve & Activate"}
              </Button>
              <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function AdminCourses() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<any>(null);
  const [thumbnail, setThumbnail] = useState("");

  const isAdmin = (user as any)?.userType === "admin" || (user as any)?.role === "admin";
  if (!isAdmin) {
    setLocation("/");
    return null;
  }

  const { data: courses = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/courses/admin/all"],
  });

  const { data: enrollments = [] } = useQuery<any[]>({
    queryKey: ["/api/courses/admin/enrollments"],
  });

  const form = useForm<CourseFormData>({
    resolver: zodResolver(courseFormSchema),
    defaultValues: { isFree: false, isPublished: false, isFeatured: false, level: "beginner" },
  });

  const createCourseMutation = useMutation({
    mutationFn: async (data: CourseFormData) => {
      const fd = new FormData();
      fd.append("title", data.title);
      fd.append("description", data.description);
      if (data.shortDescription) fd.append("shortDescription", data.shortDescription);
      fd.append("category", data.category);
      fd.append("isFree", String(data.isFree));
      fd.append("price", data.isFree ? "0.00" : (data.price || "0.00"));
      fd.append("level", data.level);
      if (data.duration) fd.append("duration", data.duration);
      fd.append("isPublished", String(data.isPublished));
      fd.append("isFeatured", String(data.isFeatured));
      if (data.salePrice) fd.append("salePrice", data.salePrice);
      else fd.append("salePrice", "");
      if (data.saleDeadline) fd.append("saleDeadline", data.saleDeadline);
      else fd.append("saleDeadline", "");
      const whatYouLearn = (data.whatYouLearn || "").split("\n").filter(Boolean);
      const requirements = (data.requirements || "").split("\n").filter(Boolean);
      fd.append("whatYouLearn", JSON.stringify(whatYouLearn));
      fd.append("requirements", JSON.stringify(requirements));
      if (thumbnail) fd.append("thumbnail", thumbnail);

      const url = editingCourse ? `/api/courses/${editingCourse.id}` : "/api/courses";
      const method = editingCourse ? "PATCH" : "POST";

      if (thumbnail && thumbnail.startsWith("/uploads")) {
        fd.append("thumbnail", thumbnail);
      }

      const res = await fetch(url, { method, body: fd, credentials: "include" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/courses/admin/all"] });
      toast({ title: editingCourse ? "Course updated!" : "Course created!" });
      setOpen(false);
      setEditingCourse(null);
      setThumbnail("");
      form.reset();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/courses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/courses/admin/all"] });
      toast({ title: "Course deleted" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const approveEnrollmentMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/courses/enrollments/${id}/approve`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courses/admin/enrollments"] });
      toast({ title: "Enrollment approved!" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const openEdit = (course: any) => {
    setEditingCourse(course);
    setThumbnail(course.thumbnail || "");
    form.reset({
      title: course.title,
      description: course.description,
      shortDescription: course.shortDescription || "",
      category: course.category,
      price: course.price || "0.00",
      isFree: course.isFree,
      level: course.level,
      duration: course.duration || "",
      whatYouLearn: (course.whatYouLearn || []).join("\n"),
      requirements: (course.requirements || []).join("\n"),
      isPublished: course.isPublished,
      isFeatured: course.isFeatured,
      salePrice: course.salePrice || "",
      saleDeadline: course.saleDeadline
        ? new Date(course.saleDeadline).toISOString().slice(0, 16)
        : "",
    });
    setOpen(true);
  };

  const [adminTab, setAdminTab] = useState("courses");
  const [studentCourseFilter, setStudentCourseFilter] = useState("all");
  const [studentSearch, setStudentSearch] = useState("");

  const pendingEnrollments = enrollments.filter((e: any) => e.status === "pending_payment");
  const totalStudents = courses.reduce((sum: number, c: any) => sum + (c.studentsCount || 0), 0);
  const totalRevenue = enrollments
    .filter((e: any) => e.isPaid)
    .reduce((sum: number, e: any) => sum + parseFloat(e.amount || "0"), 0);

  // Students tab data
  const activeEnrollments = enrollments.filter((e: any) => e.status === "active");
  const filteredStudents = activeEnrollments.filter((e: any) => {
    if (studentCourseFilter !== "all" && e.courseId !== studentCourseFilter) return false;
    if (studentSearch) {
      const q = studentSearch.toLowerCase();
      const name = `${e.user?.firstName || ""} ${e.user?.lastName || ""}`.toLowerCase();
      return name.includes(q) || (e.user?.email || "").toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">BreedSkool Management</h1>
            <p className="text-gray-500 mt-1">Create and manage courses for the learning platform</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/admin/certificate-template">
              <Button variant="outline" className="gap-2 border-violet-200 text-violet-700 hover:bg-violet-50" data-testid="button-cert-template-link">
                <Award className="h-4 w-4" /> Certificate Template
              </Button>
            </Link>
            <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditingCourse(null); setThumbnail(""); form.reset(); } }}>
            <DialogTrigger asChild>
              <Button className="bg-violet-600 hover:bg-violet-700 text-white gap-2">
                <PlusCircle className="h-4 w-4" /> Add Course
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingCourse ? "Edit Course" : "Create New Course"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={form.handleSubmit((d) => createCourseMutation.mutate(d))} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label>Course Title *</Label>
                    <Input {...form.register("title")} placeholder="e.g. Instagram Growth Masterclass" />
                    {form.formState.errors.title && <p className="text-red-500 text-xs mt-1">{form.formState.errors.title.message}</p>}
                  </div>
                  <div>
                    <Label>Category *</Label>
                    <Select onValueChange={(v) => form.setValue("category", v)} value={form.watch("category")}>
                      <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Level</Label>
                    <Select onValueChange={(v) => form.setValue("level", v)} value={form.watch("level") || "beginner"}>
                      <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
                      <SelectContent>
                        {LEVELS.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Label>Short Description</Label>
                    <Input {...form.register("shortDescription")} placeholder="Brief tagline for the course" />
                  </div>
                  <div className="col-span-2">
                    <Label>Full Description *</Label>
                    <Textarea {...form.register("description")} rows={4} placeholder="Detailed course description..." />
                    {form.formState.errors.description && <p className="text-red-500 text-xs mt-1">{form.formState.errors.description.message}</p>}
                  </div>
                  <div className="col-span-2">
                    <ImageUpload value={thumbnail} onChange={setThumbnail} />
                  </div>
                  <div>
                    <Label>Duration</Label>
                    <Input {...form.register("duration")} placeholder="e.g. 4h 30m" />
                  </div>
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <Switch checked={form.watch("isFree")} onCheckedChange={(v) => form.setValue("isFree", v)} />
                    <Label className="cursor-pointer">Free Course</Label>
                  </div>
                  {!form.watch("isFree") && (
                    <div>
                      <Label>Price (USDT)</Label>
                      <Input {...form.register("price")} placeholder="29.99" />
                    </div>
                  )}
                  {!form.watch("isFree") && (
                    <div className="col-span-2 border border-orange-200 bg-orange-50 rounded-xl p-4 space-y-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-orange-600 text-sm font-bold">🔥 Promo / Sale Price (optional)</span>
                        <span className="text-xs text-orange-500 bg-orange-100 px-2 py-0.5 rounded-full">Countdown timer shown to students</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs text-gray-600">Promo Price (USDT)</Label>
                          <Input {...form.register("salePrice")} placeholder="e.g. 49.00" className="bg-white" />
                          <p className="text-xs text-gray-400 mt-1">Leave blank to disable promo</p>
                        </div>
                        <div>
                          <Label className="text-xs text-gray-600">Promo Ends On</Label>
                          <Input type="datetime-local" {...form.register("saleDeadline")} className="bg-white" />
                          <p className="text-xs text-gray-400 mt-1">Countdown timer disappears after this date</p>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="col-span-2">
                    <Label>What You'll Learn (one per line)</Label>
                    <Textarea {...form.register("whatYouLearn")} rows={3} placeholder="Grow from 0 to 10k followers&#10;Master the algorithm&#10;Create viral content" />
                  </div>
                  <div className="col-span-2">
                    <Label>Requirements (one per line)</Label>
                    <Textarea {...form.register("requirements")} rows={2} placeholder="A smartphone or computer&#10;Basic internet connection" />
                  </div>
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <Switch checked={form.watch("isPublished")} onCheckedChange={(v) => form.setValue("isPublished", v)} />
                    <Label className="cursor-pointer">Published</Label>
                  </div>
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <Switch checked={form.watch("isFeatured")} onCheckedChange={(v) => form.setValue("isFeatured", v)} />
                    <Label className="cursor-pointer">Featured</Label>
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <Button type="submit" className="bg-violet-600 hover:bg-violet-700 text-white flex-1" disabled={createCourseMutation.isPending}>
                    {createCourseMutation.isPending ? "Saving..." : editingCourse ? "Update Course" : "Create Course"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => { setOpen(false); setEditingCourse(null); setThumbnail(""); form.reset(); }}>Cancel</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Total Courses", value: courses.length, icon: BookOpen, color: "text-violet-600", bg: "bg-violet-50" },
            { label: "Total Students", value: totalStudents, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
            { label: "Pending Approvals", value: pendingEnrollments.length, icon: Eye, color: "text-amber-600", bg: "bg-amber-50" },
            { label: "Total Revenue", value: `$${totalRevenue.toFixed(2)}`, icon: DollarSign, color: "text-green-600", bg: "bg-green-50" },
          ].map((s) => (
            <Card key={s.label} className="border-0 shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center`}>
                  <s.icon className={`h-5 w-5 ${s.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{s.value}</p>
                  <p className="text-xs text-gray-500">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <Tabs value={adminTab} onValueChange={setAdminTab}>
          <TabsList className="mb-6 bg-white border shadow-sm flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="courses" data-testid="admin-tab-courses">
              <BookOpen className="h-4 w-4 mr-1.5" /> Courses
              <Badge className="ml-1.5 bg-violet-100 text-violet-700 text-xs px-1.5">{courses.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="students" data-testid="admin-tab-students">
              <Users className="h-4 w-4 mr-1.5" /> Students
              <Badge className="ml-1.5 bg-blue-100 text-blue-700 text-xs px-1.5">{activeEnrollments.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="pending" data-testid="admin-tab-pending">
              <Eye className="h-4 w-4 mr-1.5" /> Approvals
              {pendingEnrollments.length > 0 && <Badge className="ml-1.5 bg-amber-100 text-amber-700 text-xs px-1.5">{pendingEnrollments.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="assignments" data-testid="admin-tab-assignments">
              <FileText className="h-4 w-4 mr-1.5" /> Assignments
            </TabsTrigger>
            <TabsTrigger value="chat" data-testid="admin-tab-chat">
              <MessageSquare className="h-4 w-4 mr-1.5" /> Chat
            </TabsTrigger>
            <TabsTrigger value="tech-training" data-testid="admin-tab-tech">
              <School className="h-4 w-4 mr-1.5" /> Tech Training
            </TabsTrigger>
          </TabsList>

          {/* ── Courses Tab ── */}
          <TabsContent value="courses">
            <Card>
              <CardHeader>
                <CardTitle>All Courses ({courses.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8 text-gray-400">Loading...</div>
                ) : courses.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>No courses yet. Create your first course!</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table className="min-w-[760px]">
                      <TableHeader>
                        <TableRow>
                        <TableHead>Course</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Students</TableHead>
                        <TableHead>Rating</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                      {courses.map((course: any) => (
                        <TableRow key={course.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              {course.thumbnail ? (
                                <img src={course.thumbnail} alt="" className="w-14 h-9 object-cover rounded-lg border" />
                              ) : (
                                <div className="w-14 h-9 rounded-lg bg-violet-100 flex items-center justify-center">
                                  <Image className="h-4 w-4 text-violet-400" />
                                </div>
                              )}
                              <div>
                                <p className="font-medium text-sm">{course.title}</p>
                                <p className="text-xs text-gray-400">{course.level} • {course.lessonsCount || 0} lessons</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {CATEGORIES.find(c => c.value === course.category)?.label || course.category}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {course.isFree ? (
                              <Badge className="bg-green-100 text-green-700">Free</Badge>
                            ) : (
                              <span className="font-semibold">${course.price}</span>
                            )}
                          </TableCell>
                          <TableCell>{course.studentsCount || 0}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                              <span className="text-sm">{parseFloat(course.averageRating || "0").toFixed(1)}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1 flex-col">
                              <Badge className={course.isPublished ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}>
                                {course.isPublished ? "Published" : "Draft"}
                              </Badge>
                              {course.isFeatured && <Badge className="bg-violet-100 text-violet-700">Featured</Badge>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2 flex-wrap">
                              <LessonManageDialog course={course} />
                              <Button size="sm" variant="outline" onClick={() => openEdit(course)}>
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button size="sm" variant="outline" className="text-red-500 hover:text-red-700"
                                onClick={() => { if (confirm("Delete this course?")) deleteMutation.mutate(course.id); }}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Students Tab ── */}
          <TabsContent value="students">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-600" /> Enrolled Students ({filteredStudents.length})
                  </CardTitle>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Input
                      placeholder="Search name or email…"
                      value={studentSearch}
                      onChange={e => setStudentSearch(e.target.value)}
                      className="w-52 text-sm"
                      data-testid="input-student-search"
                    />
                    <Select value={studentCourseFilter} onValueChange={setStudentCourseFilter}>
                      <SelectTrigger className="w-48" data-testid="select-student-course-filter">
                        <SelectValue placeholder="Filter by course" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Courses</SelectItem>
                        {courses.map((c: any) => (
                          <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {filteredStudents.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>No students match the filter.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Course</TableHead>
                        <TableHead>Progress</TableHead>
                        <TableHead>Payment</TableHead>
                        <TableHead>Enrolled</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStudents.map((e: any) => {
                        const initials = ((e.user?.firstName?.[0] || "") + (e.user?.lastName?.[0] || "")).toUpperCase() || "S";
                        return (
                          <TableRow key={e.id} data-testid={`row-student-${e.id}`}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={e.user?.profileImageUrl} />
                                  <AvatarFallback className="bg-violet-100 text-violet-700 text-xs">{initials}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium text-sm">{e.user?.firstName} {e.user?.lastName}</p>
                                  <p className="text-xs text-gray-400">{e.user?.email}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm max-w-[160px]">
                              <p className="truncate font-medium">{e.course?.title || e.courseId}</p>
                              <p className="text-xs text-gray-400">{e.course?.category}</p>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-violet-500 rounded-full" style={{ width: `${e.progress || 0}%` }} />
                                </div>
                                <span className="text-xs font-semibold text-violet-600">{e.progress || 0}%</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {e.isPaid ? (
                                <Badge className="bg-emerald-100 text-emerald-700 text-xs">Paid</Badge>
                              ) : e.course?.isFree ? (
                                <Badge className="bg-blue-100 text-blue-700 text-xs">Free</Badge>
                              ) : (
                                <Badge className="bg-amber-100 text-amber-700 text-xs">Unpaid</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-xs text-gray-500">
                              {e.createdAt ? new Date(e.createdAt).toLocaleDateString() : "—"}
                            </TableCell>
                            <TableCell>
                              <Link href={`/breedskool/${e.courseId}`} target="_blank">
                                <Button size="sm" variant="outline" className="gap-1 text-xs" data-testid={`btn-view-course-${e.id}`}>
                                  <Eye className="h-3 w-3" /> View
                                </Button>
                              </Link>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Pending Approvals Tab ── */}
          <TabsContent value="pending">
            {pendingEnrollments.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12 text-gray-400">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-30 text-emerald-500" />
                  <p className="font-medium">All caught up! No pending payment approvals.</p>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-amber-200">
                <CardHeader>
                  <CardTitle className="text-amber-700 flex items-center gap-2">
                    <Eye className="h-5 w-5" /> Pending Payment Approvals ({pendingEnrollments.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Course</TableHead>
                        <TableHead>Student</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Payment</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingEnrollments.map((e: any) => (
                        <TableRow key={e.id}>
                          <TableCell className="font-medium text-sm">{e.course?.title || e.courseId}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">{e.user?.firstName} {e.user?.lastName}</p>
                              <p className="text-xs text-gray-400">{e.user?.email}</p>
                            </div>
                          </TableCell>
                          <TableCell><span className="font-semibold">${e.amount}</span> <span className="text-xs text-gray-400">USDT</span></TableCell>
                          <TableCell>
                            <div className="text-xs space-y-1">
                              <Badge variant="outline" className="text-xs">{e.paymentMethod || "N/A"}</Badge>
                              {e.transactionHash && (
                                <p className="font-mono text-gray-500 truncate max-w-32" title={e.transactionHash}>{e.transactionHash.slice(0, 12)}...</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <PaymentDetailDialog
                                enrollment={e}
                                onApprove={() => approveEnrollmentMutation.mutate(e.id)}
                                approving={approveEnrollmentMutation.isPending}
                              />
                              <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white gap-1"
                                onClick={() => approveEnrollmentMutation.mutate(e.id)}
                                disabled={approveEnrollmentMutation.isPending}>
                                <CheckCircle2 className="h-3 w-3" /> Approve
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ── Assignments Tab ── */}
          <TabsContent value="assignments">
            <AssignmentReviewCard courses={courses} />
          </TabsContent>

          {/* ── Chat Tab ── */}
          <TabsContent value="chat">
            <ChatModerationCard courses={courses} />
          </TabsContent>

          {/* ── Tech Training Tab ── */}
          <TabsContent value="tech-training">
            <BreedSkoolManagementPanel />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// ── BreedSkool Tech Training Management Panel ─────────────────────────────────
const DELIVERY_MODE_META: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  online:       { label: "Online",       icon: MonitorPlay, color: "text-violet-700", bg: "bg-violet-100" },
  onsite:       { label: "Onsite",       icon: School,      color: "text-teal-700",   bg: "bg-teal-100" },
  home_lesson:  { label: "Home Lesson",  icon: Home,        color: "text-pink-700",   bg: "bg-pink-100" },
};

function DeliveryBadge({ mode }: { mode?: string }) {
  const m = DELIVERY_MODE_META[mode || "online"] || DELIVERY_MODE_META.online;
  const Icon = m.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${m.bg} ${m.color}`}>
      <Icon className="w-2.5 h-2.5" />
      {m.label}
    </span>
  );
}

function BreedSkoolManagementPanel() {
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [modeFilter, setModeFilter] = useState<string>("all");
  const [showAddPricing, setShowAddPricing] = useState(false);
  const [newPricingForm, setNewPricingForm] = useState<any>({
    courseKey: "webdev", title: "", shortDescription: "", regularPrice: 0, discountPrice: 0,
    duration: "", isActive: true, acceptedPayments: ["bank_transfer"],
  });
  const [expandedReg, setExpandedReg] = useState<string | null>(null);

  const { data: pricing = [], refetch: refetchPricing } = useQuery<any[]>({
    queryKey: ["/api/admin/breedskool/pricing"],
    queryFn: async () => (await apiRequest("GET", "/api/admin/breedskool/pricing")).json(),
  });

  const { data: registrations = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/breedskool/registrations"],
    queryFn: async () => (await apiRequest("GET", "/api/admin/breedskool/registrations")).json(),
  });

  const updatePricingMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) =>
      (await apiRequest("PATCH", `/api/admin/breedskool/pricing/${id}`, data)).json(),
    onSuccess: () => { refetchPricing(); setEditingId(null); toast({ title: "Pricing updated!" }); },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const addPricingMutation = useMutation({
    mutationFn: async (data: any) =>
      (await apiRequest("POST", "/api/admin/breedskool/pricing", data)).json(),
    onSuccess: () => {
      refetchPricing(); setShowAddPricing(false);
      setNewPricingForm({ courseKey: "webdev", title: "", shortDescription: "", regularPrice: 0, discountPrice: 0, duration: "", isActive: true, acceptedPayments: ["bank_transfer"] });
      toast({ title: "Pricing entry added!" });
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const updateRegMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes?: string }) =>
      (await apiRequest("PATCH", `/api/admin/breedskool/registrations/${id}`, { paymentStatus: status, notes })).json(),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/admin/breedskool/registrations"] }); toast({ title: "Status updated!" }); },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const pending = (registrations as any[]).filter(r => r.paymentStatus === "pending");
  const filteredRegs = modeFilter === "all" ? (registrations as any[]) : (registrations as any[]).filter(r => (r.deliveryMode || "online") === modeFilter);

  const PAYMENT_METHODS_OPTS = ["bank_transfer", "usdt_tron", "usdt_ton", "usdt_bnb"];
  const fmtNgn = (n: number) => `₦${Number(n).toLocaleString("en-NG")}`;
  const COURSE_KEY_OPTS = ["webdev", "ai_content", "social_monetize", "trading", "home_lesson", "onsite_training"];

  return (
    <div className="space-y-6 mb-8">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Registrations", value: (registrations as any[]).length, color: "text-violet-600", bg: "bg-violet-50" },
          { label: "Pending Payment", value: pending.length, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Home Lessons", value: (registrations as any[]).filter(r => r.deliveryMode === "home_lesson").length, color: "text-pink-600", bg: "bg-pink-50" },
          { label: "Onsite Training", value: (registrations as any[]).filter(r => r.deliveryMode === "onsite").length, color: "text-teal-600", bg: "bg-teal-50" },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-xl p-4`}>
            <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Pricing Management */}
      <Card className="border-violet-100">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-violet-600" /> Course Pricing Management
            </CardTitle>
            <p className="text-xs text-gray-500 mt-1">Manage prices and discounts visible on the student registration form.</p>
          </div>
          <Button size="sm" className="bg-violet-600 hover:bg-violet-700 text-white gap-1" onClick={() => setShowAddPricing(v => !v)}>
            <Plus className="h-3.5 w-3.5" /> Add Entry
          </Button>
        </CardHeader>

        {showAddPricing && (
          <div className="mx-6 mb-4 p-4 border border-violet-200 rounded-xl bg-violet-50 space-y-3">
            <p className="text-sm font-bold text-violet-700">Add New Pricing Entry</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Course Key</Label>
                <Select value={newPricingForm.courseKey} onValueChange={v => setNewPricingForm((f: any) => ({ ...f, courseKey: v }))}>
                  <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{COURSE_KEY_OPTS.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Duration</Label>
                <Input value={newPricingForm.duration} onChange={e => setNewPricingForm((f: any) => ({ ...f, duration: e.target.value }))} className="h-8 text-xs mt-1" placeholder="e.g. 8 Weeks" />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Title</Label>
                <Input value={newPricingForm.title} onChange={e => setNewPricingForm((f: any) => ({ ...f, title: e.target.value }))} className="h-8 text-xs mt-1" placeholder="Course title" />
              </div>
              <div>
                <Label className="text-xs">Regular Price (₦)</Label>
                <Input type="number" value={newPricingForm.regularPrice} onChange={e => setNewPricingForm((f: any) => ({ ...f, regularPrice: +e.target.value }))} className="h-8 text-xs mt-1" />
              </div>
              <div>
                <Label className="text-xs">Discount Price (₦)</Label>
                <Input type="number" value={newPricingForm.discountPrice} onChange={e => setNewPricingForm((f: any) => ({ ...f, discountPrice: +e.target.value }))} className="h-8 text-xs mt-1" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="bg-violet-600 text-white" onClick={() => addPricingMutation.mutate(newPricingForm)} disabled={addPricingMutation.isPending}>Save Entry</Button>
              <Button size="sm" variant="outline" onClick={() => setShowAddPricing(false)}>Cancel</Button>
            </div>
          </div>
        )}

        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Course</TableHead>
                <TableHead>Regular Price</TableHead>
                <TableHead>Discount Price</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Payment Methods</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(pricing as any[]).map((course: any) => (
                <TableRow key={course.id}>
                  {editingId === course.id ? (
                    <>
                      <TableCell>
                        <Input value={editForm.title || ""} onChange={e => setEditForm((f: any) => ({ ...f, title: e.target.value }))} className="text-sm mb-1" placeholder="Course title" />
                        <Input value={editForm.shortDescription || ""} onChange={e => setEditForm((f: any) => ({ ...f, shortDescription: e.target.value }))} className="text-xs text-gray-500 h-8" placeholder="Short description…" />
                      </TableCell>
                      <TableCell>
                        <Input type="number" value={editForm.regularPrice || ""} onChange={e => setEditForm((f: any) => ({ ...f, regularPrice: e.target.value }))} className="text-sm w-32" />
                      </TableCell>
                      <TableCell>
                        <Input type="number" value={editForm.discountPrice || ""} onChange={e => setEditForm((f: any) => ({ ...f, discountPrice: e.target.value }))} className="text-sm w-32" />
                      </TableCell>
                      <TableCell>
                        <Input value={editForm.duration || ""} onChange={e => setEditForm((f: any) => ({ ...f, duration: e.target.value }))} className="text-sm w-28" />
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {PAYMENT_METHODS_OPTS.map(pm => (
                            <label key={pm} className="flex items-center gap-1 text-xs cursor-pointer">
                              <input type="checkbox" checked={(editForm.acceptedPayments || []).includes(pm)}
                                onChange={e => setEditForm((f: any) => ({ ...f, acceptedPayments: e.target.checked ? [...(f.acceptedPayments || []), pm] : (f.acceptedPayments || []).filter((x: string) => x !== pm) }))} />
                              {pm}
                            </label>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <input type="checkbox" checked={editForm.isActive ?? true} onChange={e => setEditForm((f: any) => ({ ...f, isActive: e.target.checked }))} />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" className="bg-violet-600 text-white" onClick={() => updatePricingMutation.mutate({ id: course.id, data: editForm })} disabled={updatePricingMutation.isPending}>Save</Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
                        </div>
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell className="font-medium text-sm">{course.title}</TableCell>
                      <TableCell><span className="text-gray-400 line-through text-xs">{fmtNgn(course.regularPrice)}</span></TableCell>
                      <TableCell><span className="font-bold text-green-700">{fmtNgn(course.discountPrice)}</span></TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{course.duration}</Badge></TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {(course.acceptedPayments || []).map((pm: string) => <Badge key={pm} className="text-[10px] bg-gray-100 text-gray-600 border-0">{pm}</Badge>)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={course.isActive ? "bg-green-100 text-green-700 border-0" : "bg-red-100 text-red-600 border-0"}>{course.isActive ? "Active" : "Off"}</Badge>
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" onClick={() => { setEditingId(course.id); setEditForm({ title: course.title, shortDescription: course.shortDescription || "", regularPrice: course.regularPrice, discountPrice: course.discountPrice, duration: course.duration, isActive: course.isActive, acceptedPayments: course.acceptedPayments || [] }); }} data-testid={`btn-edit-pricing-${course.courseKey}`}>
                          <Edit className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Registrations */}
      <Card className="border-blue-100">
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              BreedSkool Registrations
              <Badge className="bg-amber-100 text-amber-700 border-0 ml-2">{pending.length} pending</Badge>
            </CardTitle>
            <p className="text-xs text-gray-500 mt-1">All student registrations. Confirm payment to grant access.</p>
          </div>
          {/* Mode filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="h-3.5 w-3.5 text-gray-400" />
            {["all", "online", "onsite", "home_lesson"].map(m => (
              <button key={m} onClick={() => setModeFilter(m)}
                className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${modeFilter === m ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"}`}>
                {m === "all" ? "All" : m === "online" ? "🖥 Online" : m === "onsite" ? "🏫 Onsite" : "🏠 Home Lesson"}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {filteredRegs.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>No registrations {modeFilter !== "all" ? `for "${modeFilter}" mode` : "yet"}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRegs.map((reg: any) => (
                <div key={reg.id} className="border border-gray-100 rounded-xl overflow-hidden">
                  {/* Row */}
                  <div className="flex items-center gap-3 p-3 bg-white">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm text-gray-900">{reg.fullName}</p>
                        <DeliveryBadge mode={reg.deliveryMode} />
                        <Badge className={
                          reg.paymentStatus === "confirmed" ? "bg-green-100 text-green-700 border-0 text-[10px]" :
                          reg.paymentStatus === "pending" ? "bg-amber-100 text-amber-700 border-0 text-[10px]" :
                          reg.paymentStatus === "rejected" ? "bg-red-100 text-red-600 border-0 text-[10px]" :
                          "bg-gray-100 text-gray-600 border-0 text-[10px]"
                        }>{reg.paymentStatus}</Badge>
                      </div>
                      <p className="text-xs text-gray-500">{reg.email} · {reg.phone}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{reg.selectedCourseTitle} · <span className="font-bold text-gray-800">{fmtNgn(reg.amountNgn)}</span></p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                      <span className="text-xs text-gray-400">{new Date(reg.createdAt).toLocaleDateString()}</span>
                      {/* Pending → Confirm button */}
                      {(!reg.paymentStatus || reg.paymentStatus === "pending") && (
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-7 px-2" onClick={() => updateRegMutation.mutate({ id: reg.id, status: "confirmed" })} disabled={updateRegMutation.isPending}>✓ Confirm</Button>
                      )}
                      {/* Confirmed → Mark Paid (Verified) button */}
                      {reg.paymentStatus === "confirmed" && (
                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-7 px-2" onClick={() => updateRegMutation.mutate({ id: reg.id, status: "verified" })} disabled={updateRegMutation.isPending}>💳 Mark Paid</Button>
                      )}
                      {/* Verified badge — no more action needed */}
                      {reg.paymentStatus === "verified" && (
                        <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">✅ Access Granted</span>
                      )}
                      {reg.paymentStatus !== "rejected" && reg.paymentStatus !== "verified" && (
                        <Button size="sm" variant="outline" className="text-red-500 text-xs h-7 px-2 border-red-200 hover:bg-red-50" onClick={() => updateRegMutation.mutate({ id: reg.id, status: "rejected" })} disabled={updateRegMutation.isPending}>✗ Reject</Button>
                      )}
                      <button onClick={() => setExpandedReg(expandedReg === reg.id ? null : reg.id)} className="text-gray-400 hover:text-gray-700 p-1">
                        {expandedReg === reg.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  {/* Expanded details */}
                  {expandedReg === reg.id && (
                    <div className="bg-gray-50 border-t border-gray-100 p-4 grid sm:grid-cols-2 gap-4 text-xs">
                      <div>
                        <p className="font-bold text-gray-700 mb-2">Student Info</p>
                        <p><span className="text-gray-400">Location:</span> {reg.location || "—"}</p>
                        <p><span className="text-gray-400">Payment Method:</span> {reg.paymentMethod || reg.paymentOption || "—"}</p>
                        <p><span className="text-gray-400">Transaction Ref:</span> <span className="font-mono">{reg.transactionRef || "—"}</span></p>
                        {reg.paymentProof && (
                          <a href={reg.paymentProof} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline block mt-1">📎 View Payment Proof</a>
                        )}
                        {reg.notes && <p className="mt-1"><span className="text-gray-400">Notes:</span> {reg.notes}</p>}
                      </div>
                      {(reg.deliveryMode === "home_lesson" || reg.childName) && (
                        <div className="bg-pink-50 border border-pink-100 rounded-lg p-3">
                          <p className="font-bold text-pink-700 mb-2 flex items-center gap-1"><Baby className="w-3.5 h-3.5" /> Home Lesson Details</p>
                          <p><span className="text-gray-400">Child Name:</span> <span className="font-medium">{reg.childName || "—"}</span></p>
                          <p><span className="text-gray-400">Child Age:</span> {reg.childAge || "—"}</p>
                          <p><span className="text-gray-400">Parent/Guardian:</span> {reg.parentName || reg.fullName}</p>
                          <p><span className="text-gray-400">Home Address:</span> <span className="font-medium">{reg.homeAddress || "—"}</span></p>
                        </div>
                      )}
                      {reg.deliveryMode === "onsite" && (
                        <div className="bg-teal-50 border border-teal-100 rounded-lg p-3">
                          <p className="font-bold text-teal-700 mb-2 flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> Onsite Details</p>
                          <p className="text-gray-600">Venue: TootoOba Estate, Ijede, Ikorodu, Lagos</p>
                          <p className="text-gray-400 mt-1">Contact student via WhatsApp to confirm session schedule.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Assignment Review subcomponent ──────────────────────────────────────
function AssignmentReviewCard({ courses }: { courses: any[] }) {
  const { toast } = useToast();
  const [filterCourse, setFilterCourse] = useState<string>("all");
  const [feedbackMap, setFeedbackMap] = useState<Record<string, string>>({});

  const { data: assignments = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: ["/api/admin/courses/assignments"],
    queryFn: async () => (await apiRequest("GET", "/api/admin/courses/assignments")).json(),
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ id, status, tutorFeedback }: { id: string; status: string; tutorFeedback?: string }) => {
      const r = await apiRequest("PATCH", `/api/admin/assignments/${id}`, { status, tutorFeedback });
      return r.json();
    },
    onSuccess: () => { refetch(); toast({ title: "Assignment reviewed!" }); },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const courseMap: Record<string, string> = {};
  courses.forEach((c: any) => { courseMap[c.id] = c.title; });

  const filtered = filterCourse === "all"
    ? assignments
    : assignments.filter((a: any) => a.courseId === filterCourse);

  const pending = assignments.filter((a: any) => a.status === "submitted").length;

  return (
    <Card className="mb-8 border-violet-100">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-violet-600" /> Assignment Review
          {pending > 0 && <Badge className="bg-amber-100 text-amber-700 ml-1">{pending} pending</Badge>}
        </CardTitle>
        <p className="text-xs text-gray-500">Review, approve, or reject student assignment submissions across all courses.</p>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <Select value={filterCourse} onValueChange={setFilterCourse}>
            <SelectTrigger className="max-w-md" data-testid="select-filter-assignment-course">
              <SelectValue placeholder="Filter by course…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Courses</SelectItem>
              {courses.map((c: any) => (
                <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin text-violet-600 mx-auto" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-sm">
            <FileText className="h-10 w-10 mx-auto mb-2 opacity-30" />
            No assignment submissions yet.
          </div>
        ) : (
          <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
            {filtered.map((a: any) => {
              const studentName = `${a.studentFirstName || ""} ${a.studentLastName || ""}`.trim() || "Student";
              const initials = (a.studentFirstName?.[0] || "S") + (a.studentLastName?.[0] || "");
              const statusColor = a.status === "approved" ? "bg-green-100 text-green-700"
                : a.status === "rejected" ? "bg-red-100 text-red-700"
                : a.status === "reviewed" ? "bg-blue-100 text-blue-700"
                : "bg-amber-100 text-amber-700";

              let fileLinks: { url: string; name: string }[] = [];
              if (a.fileUrl) {
                try {
                  const parsed = JSON.parse(a.fileUrl);
                  if (Array.isArray(parsed)) fileLinks = parsed.map((url: string, i: number) => ({ url, name: a.fileName || `File ${i + 1}` }));
                } catch { fileLinks = [{ url: a.fileUrl, name: a.fileName || "Download" }]; }
              }

              return (
                <div key={a.id} className="border rounded-xl p-4 bg-white space-y-3" data-testid={`card-assignment-${a.id}`}>
                  <div className="flex items-start gap-3">
                    <Avatar className="h-9 w-9 flex-shrink-0">
                      <AvatarFallback className="text-xs bg-violet-100 text-violet-700">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-gray-900">{studentName}</span>
                        <Badge variant="outline" className="text-[10px] py-0">{courseMap[a.courseId] || a.courseId}</Badge>
                        <Badge className={`text-[10px] py-0 ${statusColor}`}>{a.status}</Badge>
                      </div>
                      <p className="font-medium text-sm text-gray-800 mt-0.5">{a.title}</p>
                      {a.description && <p className="text-xs text-gray-500 mt-0.5">{a.description}</p>}
                      {fileLinks.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-1">
                          {fileLinks.map((f, i) => (
                            <a key={i} href={f.url} target="_blank" rel="noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-violet-600 hover:underline">
                              <FileText className="h-3 w-3" /> {f.name}
                            </a>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-gray-400 mt-1">{new Date(a.submittedAt).toLocaleString()}</p>
                    </div>
                  </div>
                  {a.status !== "approved" && (
                    <div className="flex flex-col gap-2 pt-2 border-t">
                      <input
                        type="text"
                        placeholder="Optional feedback for student…"
                        value={feedbackMap[a.id] || ""}
                        onChange={e => setFeedbackMap(prev => ({ ...prev, [a.id]: e.target.value }))}
                        className="text-xs border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-violet-300"
                        data-testid={`input-feedback-${a.id}`}
                      />
                      <div className="flex gap-2">
                        <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white gap-1 flex-1"
                          onClick={() => reviewMutation.mutate({ id: a.id, status: "approved", tutorFeedback: feedbackMap[a.id] })}
                          disabled={reviewMutation.isPending}
                          data-testid={`button-approve-assignment-${a.id}`}>
                          <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                        </Button>
                        <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 gap-1 flex-1"
                          onClick={() => reviewMutation.mutate({ id: a.id, status: "rejected", tutorFeedback: feedbackMap[a.id] })}
                          disabled={reviewMutation.isPending}
                          data-testid={`button-reject-assignment-${a.id}`}>
                          <Trash2 className="h-3.5 w-3.5" /> Reject
                        </Button>
                      </div>
                    </div>
                  )}
                  {a.tutorFeedback && (
                    <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-xs text-blue-800">
                      <span className="font-semibold">Feedback given:</span> {a.tutorFeedback}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Chat Moderation subcomponent ────────────────────────────────────────
function ChatModerationCard({ courses }: { courses: any[] }) {
  const { toast } = useToast();
  const [selectedId, setSelectedId] = useState<string>("");

  const { data: messages = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: ["/api/admin/courses", selectedId, "all-messages"],
    queryFn: async () => (await apiRequest("GET", `/api/admin/courses/${selectedId}/all-messages`)).json(),
    enabled: !!selectedId,
  });

  const deleteMessageMutation = useMutation({
    mutationFn: async (id: string) => (await apiRequest("DELETE", `/api/admin/courses/messages/${id}`)).json(),
    onSuccess: () => { refetch(); toast({ title: "Message deleted" }); },
    onError: (e: any) => toast({ title: "Failed to delete", description: e.message, variant: "destructive" }),
  });

  return (
    <Card className="mb-8 border-violet-100">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-violet-600" /> Chat Moderation
        </CardTitle>
        <p className="text-xs text-gray-500">Pick a course to view every group + private message and remove anything inappropriate.</p>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <Select value={selectedId} onValueChange={setSelectedId}>
            <SelectTrigger className="max-w-md" data-testid="select-moderation-course">
              <SelectValue placeholder="Select a course to moderate…" />
            </SelectTrigger>
            <SelectContent>
              {courses.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {!selectedId ? (
          <div className="text-center py-10 text-gray-400 text-sm">
            <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-30" />
            Choose a course above to see its chat history.
          </div>
        ) : isLoading ? (
          <div className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin text-violet-600 mx-auto" /></div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">No messages in this course yet.</div>
        ) : (
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {messages.map((m: any) => {
              const sender = m.sender || {};
              const recipient = m.recipient;
              const name = `${sender.firstName || ""} ${sender.lastName || ""}`.trim() || "User";
              const initials = (sender.firstName?.[0] || "U") + (sender.lastName?.[0] || "");
              return (
                <div
                  key={m.id}
                  className={`p-3 border rounded-lg flex items-start gap-3 ${m.isDeleted ? "opacity-50 bg-gray-50" : "bg-white"}`}
                  data-testid={`row-mod-message-${m.id}`}
                >
                  <Avatar className="h-9 w-9 flex-shrink-0">
                    <AvatarImage src={sender.profileImageUrl} />
                    <AvatarFallback className="text-xs bg-violet-100 text-violet-700">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      <span className="font-semibold text-sm text-gray-900">{name}</span>
                      {sender.userType && <Badge variant="outline" className="text-[10px] py-0">{sender.userType}</Badge>}
                      {recipient ? (
                        <Badge className="bg-violet-100 text-violet-700 text-[10px] py-0">
                          DM → {recipient.firstName} {recipient.lastName}
                        </Badge>
                      ) : (
                        <Badge className="bg-cyan-100 text-cyan-700 text-[10px] py-0">Group</Badge>
                      )}
                      <span className="text-gray-400">
                        {m.createdAt ? new Date(m.createdAt).toLocaleString() : ""}
                      </span>
                      {m.isDeleted && <Badge variant="destructive" className="text-[10px] py-0">Deleted</Badge>}
                    </div>
                    <p className="text-sm mt-1 text-gray-700 whitespace-pre-wrap break-words">{m.message}</p>
                  </div>
                  {!m.isDeleted && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-600 hover:bg-red-50 hover:text-red-700"
                      onClick={() => {
                        if (confirm("Delete this message?")) deleteMessageMutation.mutate(m.id);
                      }}
                      disabled={deleteMessageMutation.isPending}
                      data-testid={`button-delete-message-${m.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
