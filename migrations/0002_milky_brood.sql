CREATE INDEX "dho_brand_idx" ON "direct_hire_offers" USING btree ("brand_id");--> statement-breakpoint
CREATE INDEX "dho_influencer_idx" ON "direct_hire_offers" USING btree ("influencer_id");--> statement-breakpoint
CREATE INDEX "dho_status_idx" ON "direct_hire_offers" USING btree ("status");--> statement-breakpoint
CREATE INDEX "dho_created_idx" ON "direct_hire_offers" USING btree ("created_at");