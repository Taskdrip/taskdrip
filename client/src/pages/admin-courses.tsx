import { useState } from "react";
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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { PlusCircle, Edit, Trash2, Users, Star, Eye, BookOpen, DollarSign } from "lucide-react";

const courseFormSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(20, "Description must be at least 20 characters"),
  shortDescription: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  thumbnail: z.string().optional(),
  price: z.string().optional(),
  isFree: z.boolean().default(false),
  level: z.string().default("beginner"),
  duration: z.string().optional(),
  lessonsCount: z.number().int().min(0).optional(),
  whatYouLearn: z.string().optional(),
  requirements: z.string().optional(),
  isPublished: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
});

type CourseFormData = z.infer<typeof courseFormSchema>;

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

export default function AdminCourses() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<any>(null);

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
    defaultValues: {
      isFree: false, isPublished: false, isFeatured: false, level: "beginner",
    },
  });

  const createCourseMutation = useMutation({
    mutationFn: async (data: CourseFormData) => {
      const payload = {
        ...data,
        price: data.isFree ? "0.00" : (data.price || "0.00"),
        lessonsCount: data.lessonsCount || 0,
        whatYouLearn: data.whatYouLearn ? data.whatYouLearn.split("\n").filter(Boolean) : [],
        requirements: data.requirements ? data.requirements.split("\n").filter(Boolean) : [],
      };
      const method = editingCourse ? "PATCH" : "POST";
      const url = editingCourse ? `/api/courses/${editingCourse.id}` : "/api/courses";
      const res = await apiRequest(method, url, payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/courses/admin/all"] });
      toast({ title: editingCourse ? "Course updated!" : "Course created!" });
      setOpen(false);
      setEditingCourse(null);
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
    form.reset({
      title: course.title,
      description: course.description,
      shortDescription: course.shortDescription || "",
      category: course.category,
      thumbnail: course.thumbnail || "",
      price: course.price || "0.00",
      isFree: course.isFree,
      level: course.level,
      duration: course.duration || "",
      lessonsCount: course.lessonsCount || 0,
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
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditingCourse(null); form.reset(); } }}>
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
                    <Select onValueChange={(v) => form.setValue("category", v)} defaultValue={form.getValues("category")}>
                      <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Level</Label>
                    <Select onValueChange={(v) => form.setValue("level", v)} defaultValue={form.getValues("level") || "beginner"}>
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
                    <Label>Thumbnail URL</Label>
                    <Input {...form.register("thumbnail")} placeholder="https://..." />
                  </div>
                  <div>
                    <Label>Duration</Label>
                    <Input {...form.register("duration")} placeholder="e.g. 4h 30m" />
                  </div>
                  <div>
                    <Label>Number of Lessons</Label>
                    <Input type="number" {...form.register("lessonsCount", { valueAsNumber: true })} placeholder="0" />
                  </div>
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <Switch
                      checked={form.watch("isFree")}
                      onCheckedChange={(v) => form.setValue("isFree", v)}
                    />
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
                    <Switch
                      checked={form.watch("isPublished")}
                      onCheckedChange={(v) => form.setValue("isPublished", v)}
                    />
                    <Label className="cursor-pointer">Published</Label>
                  </div>
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <Switch
                      checked={form.watch("isFeatured")}
                      onCheckedChange={(v) => form.setValue("isFeatured", v)}
                    />
                    <Label className="cursor-pointer">Featured</Label>
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <Button type="submit" className="bg-violet-600 hover:bg-violet-700 text-white flex-1" disabled={createCourseMutation.isPending}>
                    {createCourseMutation.isPending ? "Saving..." : editingCourse ? "Update Course" : "Create Course"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => { setOpen(false); setEditingCourse(null); form.reset(); }}>
                    Cancel
                  </Button>
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
                      <TableCell className="font-medium">{e.course?.title || e.courseId}</TableCell>
                      <TableCell>{e.user?.firstName} {e.user?.lastName}</TableCell>
                      <TableCell>${e.amount}</TableCell>
                      <TableCell>
                        <div className="text-xs">
                          <p>{e.paymentMethod}</p>
                          {e.transactionHash && <p className="text-gray-400 truncate max-w-24">{e.transactionHash}</p>}
                          {e.paymentProof && (
                            <a href={e.paymentProof} target="_blank" rel="noreferrer" className="text-blue-500 underline">View proof</a>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => approveEnrollmentMutation.mutate(e.id)}
                          disabled={approveEnrollmentMutation.isPending}>
                          Approve
                        </Button>
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
                          {course.thumbnail && (
                            <img src={course.thumbnail} alt="" className="w-12 h-8 object-cover rounded" />
                          )}
                          <div>
                            <p className="font-medium text-sm">{course.title}</p>
                            <p className="text-xs text-gray-400">{course.level}</p>
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
                        <div className="flex gap-2">
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
