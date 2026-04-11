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
  Upload, Image, Video, FileText, File, X, GripVertical, PlayCircle, ChevronDown, ChevronUp,
} from "lucide-react";

const courseFormSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(20, "Description must be at least 20 characters"),
  shortDescription: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  price: z.string().optional(),
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
                {enrollment.paymentProof.startsWith("http") ? (
                  <div className="space-y-2">
                    <img
                      src={enrollment.paymentProof}
                      alt="Payment proof"
                      className="w-full rounded-lg object-cover max-h-48"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
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
    });
    setOpen(true);
  };

  const pendingEnrollments = enrollments.filter((e: any) => e.status === "pending_payment");
  const totalStudents = courses.reduce((sum: number, c: any) => sum + (c.studentsCount || 0), 0);
  const totalRevenue = enrollments
    .filter((e: any) => e.isPaid)
    .reduce((sum: number, e: any) => sum + parseFloat(e.amount || "0"), 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">BreedSkool Management</h1>
            <p className="text-gray-500 mt-1">Create and manage courses for the learning platform</p>
          </div>
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

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Courses", value: courses.length, icon: BookOpen, color: "text-violet-600" },
            { label: "Total Students", value: totalStudents, icon: Users, color: "text-blue-600" },
            { label: "Pending Approvals", value: pendingEnrollments.length, icon: Eye, color: "text-amber-600" },
            { label: "Total Revenue", value: `$${totalRevenue.toFixed(2)}`, icon: DollarSign, color: "text-green-600" },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="p-4 flex items-center gap-3">
                <s.icon className={`h-8 w-8 ${s.color}`} />
                <div>
                  <p className="text-2xl font-bold">{s.value}</p>
                  <p className="text-xs text-gray-500">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Pending Enrollments */}
        {pendingEnrollments.length > 0 && (
          <Card className="mb-8 border-amber-200">
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
                    <TableHead>User</TableHead>
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

        {/* Courses Table */}
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
              <Table>
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
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
