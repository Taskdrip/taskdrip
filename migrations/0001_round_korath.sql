CREATE TABLE "breedskool_course_pricing" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_key" varchar NOT NULL,
	"title" varchar NOT NULL,
	"short_description" text,
	"regular_price" integer NOT NULL,
	"discount_price" integer NOT NULL,
	"duration" varchar,
	"is_active" boolean DEFAULT true,
	"accepted_payments" text[] DEFAULT ARRAY['bank_transfer','usdt_tron','usdt_ton','usdt_bnb'],
	"linked_course_id" varchar,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "breedskool_course_pricing_course_key_unique" UNIQUE("course_key")
);
--> statement-breakpoint
CREATE TABLE "breedskool_registrations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"full_name" varchar NOT NULL,
	"email" varchar NOT NULL,
	"phone" varchar NOT NULL,
	"location" varchar,
	"selected_course_key" varchar NOT NULL,
	"selected_course_title" varchar NOT NULL,
	"amount_ngn" integer NOT NULL,
	"payment_option" varchar DEFAULT 'pay_later' NOT NULL,
	"payment_method" varchar,
	"payment_status" varchar DEFAULT 'pending',
	"transaction_ref" varchar,
	"payment_proof" varchar,
	"currency_used" varchar DEFAULT 'NGN',
	"amount_usd" numeric(10, 2),
	"pay_later_deadline" timestamp,
	"notes" text,
	"delivery_mode" varchar DEFAULT 'online',
	"child_name" varchar,
	"child_age" varchar,
	"parent_name" varchar,
	"home_address" text,
	"linked_course_id" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "course_assignments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" varchar NOT NULL,
	"lesson_id" varchar,
	"user_id" varchar NOT NULL,
	"title" varchar NOT NULL,
	"description" text,
	"file_url" varchar,
	"file_name" varchar,
	"file_type" varchar,
	"status" varchar DEFAULT 'submitted',
	"tutor_feedback" text,
	"submitted_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "course_community_likes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "course_community_posts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"message" text NOT NULL,
	"reply_to_id" varchar,
	"topic" varchar(100) DEFAULT 'General',
	"like_count" integer DEFAULT 0,
	"is_deleted" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "direct_hire_offers" ADD COLUMN "invoice_number" varchar;--> statement-breakpoint
ALTER TABLE "direct_hire_offers" ADD COLUMN "invoice_generated_at" timestamp;--> statement-breakpoint
ALTER TABLE "direct_hire_offers" ADD COLUMN "invoice_due_date" timestamp;--> statement-breakpoint
ALTER TABLE "direct_hire_offers" ADD COLUMN "invoice_note" text;--> statement-breakpoint
ALTER TABLE "direct_hire_offers" ADD COLUMN "agreed_budget" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "breedskool_course_pricing" ADD CONSTRAINT "breedskool_course_pricing_linked_course_id_courses_id_fk" FOREIGN KEY ("linked_course_id") REFERENCES "public"."courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "breedskool_registrations" ADD CONSTRAINT "breedskool_registrations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_assignments" ADD CONSTRAINT "course_assignments_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_assignments" ADD CONSTRAINT "course_assignments_lesson_id_course_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."course_lessons"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_assignments" ADD CONSTRAINT "course_assignments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_community_likes" ADD CONSTRAINT "course_community_likes_post_id_course_community_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."course_community_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_community_likes" ADD CONSTRAINT "course_community_likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_community_posts" ADD CONSTRAINT "course_community_posts_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_community_posts" ADD CONSTRAINT "course_community_posts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;