import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Users, DollarSign, Eye, Heart, GraduationCap, Sparkles, BookOpen,
  ShoppingBag, MessageSquare, UserPlus, Zap, Wand2, Trash2, AlertTriangle, FileText,
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const fmt = (n: number) => n.toLocaleString();

type LookupUser = { id: string; email: string; firstName?: string; lastName?: string; followers?: number; availableBalance?: string };
type LookupPost = { id: string; content?: string; likeCount?: number; viewCount?: number };
type LookupBlog = { id: string; title: string; slug: string; viewCount?: number; likesCount?: number };
type LookupProduct = { id: string; title: string; salesCount?: number; reviewCount?: number; rating?: string };
type LookupCourse = { id: string; title: string };

export default function DemoLab() {
  const { toast } = useToast();
  const ok = (msg: string) => toast({ title: "Done", description: msg });
  const err = (e: any) => toast({ title: "Failed", description: e?.message || "Error", variant: "destructive" });

  const stats = useQuery<any>({ queryKey: ["/api/admin/demo/stats"] });

  // ─── Lookups ──────────────────────────────────────────────────────────
  const [userQuery, setUserQuery] = useState("");
  const usersLookup = useQuery<LookupUser[]>({
    queryKey: ["/api/admin/demo/users-lookup", userQuery],
    queryFn: async () => {
      const res = await fetch(`/api/admin/demo/users-lookup?q=${encodeURIComponent(userQuery)}`, { credentials: "include" });
      return res.json();
    },
  });
  const postsLookup = useQuery<LookupPost[]>({ queryKey: ["/api/admin/demo/posts-lookup"] });
  const blogsLookup = useQuery<LookupBlog[]>({ queryKey: ["/api/admin/demo/blogs-lookup"] });
  const productsLookup = useQuery<LookupProduct[]>({ queryKey: ["/api/admin/demo/products-lookup"] });
  const coursesLookup = useQuery<LookupCourse[]>({ queryKey: ["/api/admin/demo/courses-lookup"] });

  // ─── Allocator state ──────────────────────────────────────────────────
  const [followersUserId, setFollowersUserId] = useState("");
  const [followersCount, setFollowersCount] = useState(2_500_000);
  const [followingCount, setFollowingCount] = useState(50);

  const [fundsUserId, setFundsUserId] = useState("");
  const [fundsAmount, setFundsAmount] = useState(15000);
  const [fundsMode, setFundsMode] = useState<"add" | "set">("set");

  const [postId, setPostId] = useState("");
  const [postViews, setPostViews] = useState(50000);
  const [postLikes, setPostLikes] = useState(5000);
  const [postComments, setPostComments] = useState(120);

  const [blogId, setBlogId] = useState("");
  const [blogViews, setBlogViews] = useState(25000);
  const [blogLikesCount, setBlogLikesCount] = useState(2500);
  const [blogCommentsCount, setBlogCommentsCount] = useState(80);

  const [productId, setProductId] = useState("");
  const [productSales, setProductSales] = useState(500);
  const [productReviews, setProductReviewsCount] = useState(120);
  const [productRating, setProductRating] = useState(4.8);
  const [productLikes, setProductLikes] = useState(800);
  const [genReviewsCount, setGenReviewsCount] = useState(20);
  const [genReviewsToggle, setGenReviewsToggle] = useState(true);

  const [courseId, setCourseId] = useState("");
  const [enrollCount, setEnrollCount] = useState(250);
  const [enrollAddReviews, setEnrollAddReviews] = useState(true);

  const [fakeUserCount, setFakeUserCount] = useState(100);

  const [followTargetId, setFollowTargetId] = useState("");
  const [followCount, setFollowCount] = useState(1000);

  const [likePostId, setLikePostId] = useState("");
  const [likePostCount, setLikePostCount] = useState(500);

  // ─── Mutations ────────────────────────────────────────────────────────
  const post = (url: string, body: any) => apiRequest("POST", url, body).then((r: any) => r.json());

  const mFollowers = useMutation({
    mutationFn: () => post("/api/admin/demo/allocate-followers", { userId: followersUserId, followers: followersCount, following: followingCount }),
    onSuccess: () => { ok(`Set ${fmt(followersCount)} followers`); queryClient.invalidateQueries({ queryKey: ["/api/admin/demo/users-lookup"] }); },
    onError: err,
  });
  const mFunds = useMutation({
    mutationFn: () => post("/api/admin/demo/allocate-funds", { userId: fundsUserId, amount: fundsAmount, mode: fundsMode }),
    onSuccess: () => { ok(`${fundsMode === "set" ? "Set" : "Added"} $${fmt(fundsAmount)}`); queryClient.invalidateQueries({ queryKey: ["/api/admin/demo/users-lookup"] }); },
    onError: err,
  });
  const mPostStats = useMutation({
    mutationFn: () => post("/api/admin/demo/allocate-post-stats", { postId, views: postViews, likes: postLikes, comments: postComments }),
    onSuccess: () => { ok("Post stats updated"); queryClient.invalidateQueries({ queryKey: ["/api/admin/demo/posts-lookup"] }); },
    onError: err,
  });
  const mBlogStats = useMutation({
    mutationFn: () => post("/api/admin/demo/allocate-blog-stats", { blogId, views: blogViews, likes: blogLikesCount, comments: blogCommentsCount }),
    onSuccess: () => { ok("Blog stats updated"); queryClient.invalidateQueries({ queryKey: ["/api/admin/demo/blogs-lookup"] }); },
    onError: err,
  });
  const mProductStats = useMutation({
    mutationFn: () => post("/api/admin/demo/allocate-product-stats", {
      productId, sales: productSales, reviews: productReviews, rating: productRating, likes: productLikes,
      generateReviews: genReviewsToggle ? genReviewsCount : 0,
    }),
    onSuccess: (data: any) => { ok(`Updated. Reviews seeded: ${data?.reviewsCreated ?? 0}`); queryClient.invalidateQueries({ queryKey: ["/api/admin/demo/products-lookup"] }); },
    onError: err,
  });
  const mEnroll = useMutation({
    mutationFn: () => post("/api/admin/demo/enroll-students", { courseId, count: enrollCount, addReviews: enrollAddReviews }),
    onSuccess: (data: any) => ok(`Enrolled ${data?.enrolled ?? 0}, reviews ${data?.reviewed ?? 0}`),
    onError: err,
  });
  const mFake = useMutation({
    mutationFn: () => post("/api/admin/demo/spawn-fake-users", { count: fakeUserCount }),
    onSuccess: (data: any) => { ok(`Spawned ${data?.created ?? 0} fake users`); queryClient.invalidateQueries({ queryKey: ["/api/admin/demo/stats"] }); },
    onError: err,
  });
  const mFakeFollows = useMutation({
    mutationFn: () => post("/api/admin/demo/fake-follows", { targetUserId: followTargetId, count: followCount }),
    onSuccess: (data: any) => ok(`${data?.follows ?? 0} fake follows`),
    onError: err,
  });
  const mFakePostLikes = useMutation({
    mutationFn: () => post("/api/admin/demo/fake-post-likes", { postId: likePostId, count: likePostCount }),
    onSuccess: (data: any) => ok(`${data?.liked ?? 0} fake likes added`),
    onError: err,
  });

  // ─── Master reset + blog seed ─────────────────────────────────────────
  const [wipeFakeUsers, setWipeFakeUsers] = useState(true);
  const [wipeBalances, setWipeBalances] = useState(false);
  const [wipeFollowers, setWipeFollowers] = useState(false);

  const mWipe = useMutation({
    mutationFn: () => post("/api/admin/demo/wipe", {
      deleteFakeUsers: wipeFakeUsers,
      resetAllBalances: wipeBalances,
      resetAllFollowers: wipeFollowers,
      confirm: "WIPE",
    }),
    onSuccess: (data: any) => {
      ok(`Wiped — ${data.fakeUsersDeleted} fake users, ${data.followsDeleted} follows, ${data.likesDeleted} likes, ${data.balancesReset} balances, ${data.followersReset} follower counts`);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/demo/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/demo/users-lookup"] });
    },
    onError: err,
  });

  const mSeedBlogs = useMutation({
    mutationFn: () => post("/api/admin/seed-default-blogs", {}),
    onSuccess: (data: any) => {
      ok(`Seeded ${data.inserted} blog post${data.inserted === 1 ? "" : "s"} (${data.skipped} already existed)`);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/demo/blogs-lookup"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/demo/stats"] });
    },
    onError: err,
  });

  return (
    <div className="space-y-6">
      {/* ── Hero header ─────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-gradient-to-br from-fuchsia-700 via-purple-700 to-indigo-800 p-6 border border-purple-500/30">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center">
            <Wand2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">Demo Lab</h2>
            <p className="text-purple-100 text-sm">Allocate followers, funds, views, likes, enrollments and reviews to any user — for realistic demos &amp; testing.</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-5">
          <Stat label="Users" value={stats.data?.users} icon={<Users className="w-4 h-4" />} />
          <Stat label="Feed Posts" value={stats.data?.posts} icon={<MessageSquare className="w-4 h-4" />} />
          <Stat label="Blog Posts" value={stats.data?.blogPosts} icon={<BookOpen className="w-4 h-4" />} />
          <Stat label="Products" value={stats.data?.products} icon={<ShoppingBag className="w-4 h-4" />} />
          <Stat label="Courses" value={stats.data?.courses} icon={<GraduationCap className="w-4 h-4" />} />
        </div>
      </div>

      {/* ── Seed Default Blogs (for production parity) ────────────────── */}
      <Card className="border-amber-300/60 dark:border-amber-700/60 bg-amber-50/50 dark:bg-amber-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
            <FileText className="w-5 h-5" /> Seed Default Blog Posts
          </CardTitle>
          <CardDescription>
            Inserts the curated set of starter blog articles. Already-existing slugs are skipped — safe to run on any environment (Replit dev, Railway production, etc.). Use this on your live site to publish the same blogs there.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => mSeedBlogs.mutate()}
            disabled={mSeedBlogs.isPending}
            className="bg-amber-600 hover:bg-amber-700 text-white"
            data-testid="button-seed-default-blogs"
          >
            <FileText className="w-4 h-4 mr-2" />
            {mSeedBlogs.isPending ? "Seeding…" : "Seed Default Blogs"}
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* ── Allocate Followers ──────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Users className="w-5 h-5 text-purple-500" /> Allocate Followers</CardTitle>
            <CardDescription>Up to 10,000,000 followers. Auto-distributes across IG/TT/YT/X.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <UserPicker label="Pick user" value={followersUserId} onChange={setFollowersUserId}
              q={userQuery} setQ={setUserQuery} options={usersLookup.data || []} testId="select-followers-user" />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Followers</Label>
                <Input type="number" min={0} max={10_000_000} value={followersCount}
                  onChange={(e) => setFollowersCount(Math.min(10_000_000, Math.max(0, parseInt(e.target.value) || 0)))}
                  data-testid="input-allocate-followers" />
              </div>
              <div>
                <Label>Following</Label>
                <Input type="number" min={0} value={followingCount}
                  onChange={(e) => setFollowingCount(Math.max(0, parseInt(e.target.value) || 0))}
                  data-testid="input-allocate-following" />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {[100_000, 500_000, 1_000_000, 2_500_000, 5_000_000, 10_000_000].map(n => (
                <button key={n} onClick={() => setFollowersCount(n)}
                  className="text-xs px-2.5 py-1 rounded-md bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200">
                  {n >= 1e6 ? `${n / 1e6}M` : `${n / 1e3}K`}
                </button>
              ))}
            </div>
            <Button disabled={!followersUserId || mFollowers.isPending} className="w-full"
              onClick={() => mFollowers.mutate()} data-testid="button-apply-followers">
              {mFollowers.isPending ? "Applying…" : "Apply Followers"}
            </Button>
          </CardContent>
        </Card>

        {/* ── Allocate Funds ──────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><DollarSign className="w-5 h-5 text-green-500" /> Allocate Funds</CardTitle>
            <CardDescription>Set or top-up a user&apos;s available balance.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <UserPicker label="Pick user" value={fundsUserId} onChange={setFundsUserId}
              q={userQuery} setQ={setUserQuery} options={usersLookup.data || []} testId="select-funds-user" />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Amount (USD)</Label>
                <Input type="number" min={0} value={fundsAmount}
                  onChange={(e) => setFundsAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                  data-testid="input-allocate-funds" />
              </div>
              <div>
                <Label>Mode</Label>
                <Select value={fundsMode} onValueChange={(v: "add" | "set") => setFundsMode(v)}>
                  <SelectTrigger data-testid="select-funds-mode"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="set">Set to amount</SelectItem>
                    <SelectItem value="add">Add to balance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {[500, 1000, 5000, 15000, 50000, 100000].map(n => (
                <button key={n} onClick={() => setFundsAmount(n)}
                  className="text-xs px-2.5 py-1 rounded-md bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200">
                  ${n.toLocaleString()}
                </button>
              ))}
            </div>
            <Button disabled={!fundsUserId || mFunds.isPending} className="w-full"
              onClick={() => mFunds.mutate()} data-testid="button-apply-funds">
              {mFunds.isPending ? "Applying…" : "Apply Funds"}
            </Button>
          </CardContent>
        </Card>

        {/* ── Feed Post Stats ─────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Eye className="w-5 h-5 text-blue-500" /> Feed Post Views &amp; Likes</CardTitle>
            <CardDescription>Boost views, likes, and comments on a post.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select value={postId} onValueChange={setPostId}>
              <SelectTrigger data-testid="select-post"><SelectValue placeholder="Pick a post…" /></SelectTrigger>
              <SelectContent>
                {(postsLookup.data || []).map(p => (
                  <SelectItem key={p.id} value={p.id}>{(p.content || "(empty)").slice(0, 60)}…</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Views</Label><Input type="number" min={0} value={postViews} onChange={(e) => setPostViews(Math.max(0, parseInt(e.target.value) || 0))} data-testid="input-post-views" /></div>
              <div><Label>Likes</Label><Input type="number" min={0} value={postLikes} onChange={(e) => setPostLikes(Math.max(0, parseInt(e.target.value) || 0))} data-testid="input-post-likes" /></div>
              <div><Label>Comments</Label><Input type="number" min={0} value={postComments} onChange={(e) => setPostComments(Math.max(0, parseInt(e.target.value) || 0))} data-testid="input-post-comments" /></div>
            </div>
            <Button disabled={!postId || mPostStats.isPending} className="w-full" onClick={() => mPostStats.mutate()} data-testid="button-apply-post-stats">
              {mPostStats.isPending ? "Applying…" : "Apply Post Stats"}
            </Button>
          </CardContent>
        </Card>

        {/* ── Blog Stats ──────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><BookOpen className="w-5 h-5 text-amber-500" /> Blog Post Views &amp; Likes</CardTitle>
            <CardDescription>Boost analytics on blog articles.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select value={blogId} onValueChange={setBlogId}>
              <SelectTrigger data-testid="select-blog"><SelectValue placeholder="Pick a blog post…" /></SelectTrigger>
              <SelectContent>
                {(blogsLookup.data || []).map(b => (
                  <SelectItem key={b.id} value={b.id}>{b.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Views</Label><Input type="number" min={0} value={blogViews} onChange={(e) => setBlogViews(Math.max(0, parseInt(e.target.value) || 0))} data-testid="input-blog-views" /></div>
              <div><Label>Likes</Label><Input type="number" min={0} value={blogLikesCount} onChange={(e) => setBlogLikesCount(Math.max(0, parseInt(e.target.value) || 0))} data-testid="input-blog-likes" /></div>
              <div><Label>Comments</Label><Input type="number" min={0} value={blogCommentsCount} onChange={(e) => setBlogCommentsCount(Math.max(0, parseInt(e.target.value) || 0))} data-testid="input-blog-comments" /></div>
            </div>
            <Button disabled={!blogId || mBlogStats.isPending} className="w-full" onClick={() => mBlogStats.mutate()} data-testid="button-apply-blog-stats">
              {mBlogStats.isPending ? "Applying…" : "Apply Blog Stats"}
            </Button>
          </CardContent>
        </Card>

        {/* ── Product Stats + Reviews ─────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ShoppingBag className="w-5 h-5 text-pink-500" /> Product Sales &amp; Reviews</CardTitle>
            <CardDescription>Set sales count, rating, likes — and seed real review rows.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger data-testid="select-product"><SelectValue placeholder="Pick a product…" /></SelectTrigger>
              <SelectContent>
                {(productsLookup.data || []).map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Sales</Label><Input type="number" min={0} value={productSales} onChange={(e) => setProductSales(Math.max(0, parseInt(e.target.value) || 0))} data-testid="input-product-sales" /></div>
              <div><Label>Review count</Label><Input type="number" min={0} value={productReviews} onChange={(e) => setProductReviewsCount(Math.max(0, parseInt(e.target.value) || 0))} data-testid="input-product-reviews" /></div>
              <div><Label>Rating (0–5)</Label><Input type="number" step="0.1" min={0} max={5} value={productRating} onChange={(e) => setProductRating(Math.min(5, Math.max(0, parseFloat(e.target.value) || 0)))} data-testid="input-product-rating" /></div>
              <div><Label>Likes</Label><Input type="number" min={0} value={productLikes} onChange={(e) => setProductLikes(Math.max(0, parseInt(e.target.value) || 0))} data-testid="input-product-likes" /></div>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label className="font-semibold">Seed real review rows</Label>
                <p className="text-xs text-muted-foreground">Inserts authentic-looking 4–5⭐ reviews from fake users.</p>
              </div>
              <Switch checked={genReviewsToggle} onCheckedChange={setGenReviewsToggle} data-testid="switch-gen-reviews" />
            </div>
            {genReviewsToggle && (
              <div>
                <Label>How many reviews to seed (max 100)</Label>
                <Input type="number" min={1} max={100} value={genReviewsCount}
                  onChange={(e) => setGenReviewsCount(Math.min(100, Math.max(1, parseInt(e.target.value) || 1)))}
                  data-testid="input-gen-reviews-count" />
              </div>
            )}
            <Button disabled={!productId || mProductStats.isPending} className="w-full" onClick={() => mProductStats.mutate()} data-testid="button-apply-product-stats">
              {mProductStats.isPending ? "Applying…" : "Apply Product Stats"}
            </Button>
          </CardContent>
        </Card>

        {/* ── Course Enrollments ──────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><GraduationCap className="w-5 h-5 text-cyan-500" /> Course Enrollments</CardTitle>
            <CardDescription>Enroll fake users into a course (requires fake users to exist).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select value={courseId} onValueChange={setCourseId}>
              <SelectTrigger data-testid="select-course"><SelectValue placeholder="Pick a course…" /></SelectTrigger>
              <SelectContent>
                {(coursesLookup.data || []).map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div>
              <Label>Number of enrollments (max 5,000)</Label>
              <Input type="number" min={1} max={5000} value={enrollCount}
                onChange={(e) => setEnrollCount(Math.min(5000, Math.max(1, parseInt(e.target.value) || 1)))}
                data-testid="input-enroll-count" />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label className="font-semibold">Also seed up to 50 reviews</Label>
              <Switch checked={enrollAddReviews} onCheckedChange={setEnrollAddReviews} data-testid="switch-enroll-reviews" />
            </div>
            <Button disabled={!courseId || mEnroll.isPending} className="w-full" onClick={() => mEnroll.mutate()} data-testid="button-enroll-students">
              {mEnroll.isPending ? "Enrolling…" : "Enroll Fake Students"}
            </Button>
          </CardContent>
        </Card>

        {/* ── Spawn fake users ────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-yellow-500" /> Spawn Fake Users</CardTitle>
            <CardDescription>Create realistic placeholder accounts you can use as fake followers, students, reviewers.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>How many (max 500 per batch)</Label>
              <Input type="number" min={1} max={500} value={fakeUserCount}
                onChange={(e) => setFakeUserCount(Math.min(500, Math.max(1, parseInt(e.target.value) || 1)))}
                data-testid="input-fake-user-count" />
            </div>
            <div className="flex flex-wrap gap-2">
              {[10, 50, 100, 250, 500].map(n => (
                <button key={n} onClick={() => setFakeUserCount(n)} className="text-xs px-2.5 py-1 rounded-md bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-200">{n}</button>
              ))}
            </div>
            <Button disabled={mFake.isPending} className="w-full" onClick={() => mFake.mutate()} data-testid="button-spawn-fake-users">
              {mFake.isPending ? "Spawning…" : "Spawn Fake Users"}
            </Button>
          </CardContent>
        </Card>

        {/* ── Real follow + like generators ───────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><UserPlus className="w-5 h-5 text-rose-500" /> Real Follower &amp; Like Activity</CardTitle>
            <CardDescription>Have your fake users actually follow a creator or like a post.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <UserPicker label="Target user (to be followed)" value={followTargetId} onChange={setFollowTargetId}
                q={userQuery} setQ={setUserQuery} options={usersLookup.data || []} testId="select-follow-target" />
              <div className="grid grid-cols-3 gap-2">
                <Input type="number" min={1} max={5000} value={followCount}
                  onChange={(e) => setFollowCount(Math.min(5000, Math.max(1, parseInt(e.target.value) || 1)))}
                  className="col-span-2" data-testid="input-follow-count" />
                <Button disabled={!followTargetId || mFakeFollows.isPending}
                  onClick={() => mFakeFollows.mutate()} data-testid="button-fake-follows">
                  {mFakeFollows.isPending ? "…" : "Follow"}
                </Button>
              </div>
            </div>
            <div className="space-y-2 pt-3 border-t">
              <Label>Post to like</Label>
              <Select value={likePostId} onValueChange={setLikePostId}>
                <SelectTrigger data-testid="select-like-post"><SelectValue placeholder="Pick a post…" /></SelectTrigger>
                <SelectContent>
                  {(postsLookup.data || []).map(p => (
                    <SelectItem key={p.id} value={p.id}>{(p.content || "(empty)").slice(0, 60)}…</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="grid grid-cols-3 gap-2">
                <Input type="number" min={1} max={5000} value={likePostCount}
                  onChange={(e) => setLikePostCount(Math.min(5000, Math.max(1, parseInt(e.target.value) || 1)))}
                  className="col-span-2" data-testid="input-like-count" />
                <Button disabled={!likePostId || mFakePostLikes.isPending}
                  onClick={() => mFakePostLikes.mutate()} data-testid="button-fake-likes">
                  <Heart className="w-3.5 h-3.5 mr-1" /> {mFakePostLikes.isPending ? "…" : "Like"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Danger Zone — clear demo data ───────────────────────────────── */}
      <Card className="border-red-300 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-300">
            <AlertTriangle className="w-5 h-5" /> Danger Zone — Clear All Demo Data
          </CardTitle>
          <CardDescription>
            One-click cleanup of demo content. Pick what to remove, then confirm. Deletions are permanent.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between rounded-lg border p-3 bg-background">
            <div>
              <Label className="font-semibold">Delete fake users</Label>
              <p className="text-xs text-muted-foreground">Removes every <code>fake_*@taskdrip.demo</code> account and all of their follows, likes, enrollments and reviews. Real follower counts on targeted creators are decremented.</p>
            </div>
            <Switch checked={wipeFakeUsers} onCheckedChange={setWipeFakeUsers} data-testid="switch-wipe-fake-users" />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3 bg-background">
            <div>
              <Label className="font-semibold">Reset all balances</Label>
              <p className="text-xs text-muted-foreground"><strong className="text-red-600">Affects every user.</strong> Sets availableBalance and totalEarned to 0 for the entire user base — including real users.</p>
            </div>
            <Switch checked={wipeBalances} onCheckedChange={setWipeBalances} data-testid="switch-wipe-balances" />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3 bg-background">
            <div>
              <Label className="font-semibold">Reset all follower counts</Label>
              <p className="text-xs text-muted-foreground"><strong className="text-red-600">Affects every user.</strong> Sets followers, totalFollowers and per-platform counts to 0 for all users.</p>
            </div>
            <Switch checked={wipeFollowers} onCheckedChange={setWipeFollowers} data-testid="switch-wipe-followers" />
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                className="w-full"
                disabled={(!wipeFakeUsers && !wipeBalances && !wipeFollowers) || mWipe.isPending}
                data-testid="button-open-wipe-confirm"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {mWipe.isPending ? "Clearing…" : "Clear Demo Data"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear demo data — are you sure?</AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="space-y-2 text-sm">
                    <div>This will:</div>
                    <ul className="list-disc pl-5 space-y-1">
                      {wipeFakeUsers && <li>Delete every fake demo user and all of their generated follows, likes, enrollments and reviews.</li>}
                      {wipeBalances && <li className="text-red-600 font-semibold">Set every user&apos;s available balance and total earned to $0 (including real users).</li>}
                      {wipeFollowers && <li className="text-red-600 font-semibold">Set every user&apos;s follower counts to 0 (including real users).</li>}
                    </ul>
                    <div className="pt-2">This cannot be undone.</div>
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel data-testid="button-wipe-cancel">Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => mWipe.mutate()}
                  className="bg-red-600 hover:bg-red-700 text-white"
                  data-testid="button-wipe-confirm"
                >
                  Yes, clear demo data
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────
function Stat({ label, value, icon }: { label: string; value: any; icon: any }) {
  return (
    <div className="rounded-xl bg-white/10 border border-white/15 p-3">
      <div className="flex items-center gap-2 text-purple-100/80 text-xs">{icon}{label}</div>
      <div className="text-white text-xl font-extrabold mt-1">{typeof value === "number" ? fmt(value) : "—"}</div>
    </div>
  );
}

function UserPicker({ label, value, onChange, q, setQ, options, testId }: {
  label: string; value: string; onChange: (v: string) => void;
  q: string; setQ: (v: string) => void; options: LookupUser[]; testId: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input placeholder="Search by email, username, name…" value={q} onChange={(e) => setQ(e.target.value)} data-testid={`${testId}-search`} />
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger data-testid={testId}><SelectValue placeholder={options.length === 0 ? "No matches" : `Pick from ${options.length} matches`} /></SelectTrigger>
        <SelectContent>
          {options.map(u => (
            <SelectItem key={u.id} value={u.id}>
              {(u.firstName || "") + " " + (u.lastName || "")} — {u.email} {u.followers ? `· ${fmt(u.followers)} followers` : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
