PRAGMA foreign_keys = ON;
--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);
--> statement-breakpoint
CREATE TRIGGER `user_single_administrator_insert`
BEFORE INSERT ON `user`
WHEN (SELECT count(*) FROM `user`) >= 1
BEGIN
	SELECT RAISE(ABORT, 'only one administrator is allowed');
END;
--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);
--> statement-breakpoint
CREATE INDEX `session_user_id_idx` ON `session` (`user_id`);
--> statement-breakpoint
CREATE INDEX `session_expires_at_idx` ON `session` (`expires_at`);
--> statement-breakpoint
CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `account_user_id_idx` ON `account` (`user_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `account_provider_account_unique` ON `account` (`provider_id`,`account_id`);
--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);
--> statement-breakpoint
CREATE TABLE `media_assets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kind` text NOT NULL,
	`storage_key` text NOT NULL,
	`original_name` text NOT NULL,
	`file_name` text NOT NULL,
	`mime_type` text NOT NULL,
	`size` integer NOT NULL,
	`width` integer,
	`height` integer,
	`alt_text` text,
	`sha256` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	CONSTRAINT `media_assets_kind_check` CHECK (`kind` in ('image', 'pdf')),
	CONSTRAINT `media_assets_size_check` CHECK (`size` >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `media_assets_storage_key_unique` ON `media_assets` (`storage_key`);
--> statement-breakpoint
CREATE INDEX `media_assets_kind_idx` ON `media_assets` (`kind`);
--> statement-breakpoint
CREATE INDEX `media_assets_created_at_idx` ON `media_assets` (`created_at`);
--> statement-breakpoint
CREATE TABLE `site_settings` (
	`id` integer PRIMARY KEY DEFAULT 1 NOT NULL,
	`site_name` text DEFAULT '科研实验室' NOT NULL,
	`tagline` text,
	`description` text,
	`hero_title` text,
	`hero_subtitle` text,
	`hero_image_id` integer,
	`logo_image_id` integer,
	`contact_email` text,
	`contact_phone` text,
	`address` text,
	`social_links_json` text DEFAULT '[]' NOT NULL,
	`footer_text` text,
	`seo_title` text,
	`seo_description` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`hero_image_id`) REFERENCES `media_assets`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`logo_image_id`) REFERENCES `media_assets`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT `site_settings_singleton_check` CHECK (`id` = 1)
);
--> statement-breakpoint
CREATE TABLE `pages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`page_key` text NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`summary` text,
	`content_json` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`published_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	CONSTRAINT `pages_key_check` CHECK (`page_key` in ('about', 'join', 'contact')),
	CONSTRAINT `pages_status_check` CHECK (`status` in ('draft', 'published'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pages_key_unique` ON `pages` (`page_key`);
--> statement-breakpoint
CREATE UNIQUE INDEX `pages_slug_unique` ON `pages` (`slug`);
--> statement-breakpoint
CREATE INDEX `pages_status_idx` ON `pages` (`status`);
--> statement-breakpoint
CREATE TABLE `members` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`role_title` text,
	`member_group` text NOT NULL,
	`email` text,
	`phone` text,
	`website` text,
	`orcid` text,
	`bio_json` text,
	`avatar_media_id` integer,
	`status` text DEFAULT 'draft' NOT NULL,
	`featured` integer DEFAULT false NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`published_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`avatar_media_id`) REFERENCES `media_assets`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT `members_group_check` CHECK (`member_group` in ('principal_investigator', 'faculty', 'postdoc_researcher', 'student', 'alumni')),
	CONSTRAINT `members_status_check` CHECK (`status` in ('draft', 'published'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `members_slug_unique` ON `members` (`slug`);
--> statement-breakpoint
CREATE INDEX `members_status_group_sort_idx` ON `members` (`status`,`member_group`,`sort_order`);
--> statement-breakpoint
CREATE TABLE `research_areas` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`summary` text,
	`content_json` text,
	`cover_media_id` integer,
	`status` text DEFAULT 'draft' NOT NULL,
	`featured` integer DEFAULT false NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`published_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`cover_media_id`) REFERENCES `media_assets`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT `research_areas_status_check` CHECK (`status` in ('draft', 'published'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `research_areas_slug_unique` ON `research_areas` (`slug`);
--> statement-breakpoint
CREATE INDEX `research_areas_status_sort_idx` ON `research_areas` (`status`,`sort_order`);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`summary` text,
	`content_json` text,
	`project_status` text DEFAULT 'ongoing' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`cover_media_id` integer,
	`start_date` text,
	`end_date` text,
	`funding` text,
	`external_url` text,
	`featured` integer DEFAULT false NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`published_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`cover_media_id`) REFERENCES `media_assets`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT `projects_project_status_check` CHECK (`project_status` in ('ongoing', 'completed')),
	CONSTRAINT `projects_status_check` CHECK (`status` in ('draft', 'published'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `projects_slug_unique` ON `projects` (`slug`);
--> statement-breakpoint
CREATE INDEX `projects_status_sort_idx` ON `projects` (`status`,`sort_order`);
--> statement-breakpoint
CREATE TABLE `publications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`authors` text NOT NULL,
	`year` integer NOT NULL,
	`publication_type` text NOT NULL,
	`venue` text,
	`volume` text,
	`issue` text,
	`pages` text,
	`doi` text,
	`external_url` text,
	`pdf_media_id` integer,
	`abstract` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`featured` integer DEFAULT false NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`published_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`pdf_media_id`) REFERENCES `media_assets`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT `publications_type_check` CHECK (`publication_type` in ('journal', 'conference', 'book_chapter', 'patent', 'software', 'other')),
	CONSTRAINT `publications_status_check` CHECK (`status` in ('draft', 'published')),
	CONSTRAINT `publications_year_check` CHECK (`year` between 1900 and 2200)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `publications_doi_unique` ON `publications` (`doi`);
--> statement-breakpoint
CREATE INDEX `publications_status_year_idx` ON `publications` (`status`,`year`);
--> statement-breakpoint
CREATE INDEX `publications_type_idx` ON `publications` (`publication_type`);
--> statement-breakpoint
CREATE TABLE `news_posts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`summary` text,
	`content_json` text,
	`cover_media_id` integer,
	`status` text DEFAULT 'draft' NOT NULL,
	`featured` integer DEFAULT false NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`published_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`cover_media_id`) REFERENCES `media_assets`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT `news_posts_status_check` CHECK (`status` in ('draft', 'published'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `news_posts_slug_unique` ON `news_posts` (`slug`);
--> statement-breakpoint
CREATE INDEX `news_posts_status_published_idx` ON `news_posts` (`status`,`published_at`);
--> statement-breakpoint
CREATE TABLE `project_members` (
	`project_id` integer NOT NULL,
	`member_id` integer NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`project_id`, `member_id`),
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `project_members_member_idx` ON `project_members` (`member_id`);
--> statement-breakpoint
CREATE TABLE `project_research_areas` (
	`project_id` integer NOT NULL,
	`research_area_id` integer NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`project_id`, `research_area_id`),
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`research_area_id`) REFERENCES `research_areas`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `project_research_areas_area_idx` ON `project_research_areas` (`research_area_id`);
--> statement-breakpoint
CREATE TABLE `publication_members` (
	`publication_id` integer NOT NULL,
	`member_id` integer NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`publication_id`, `member_id`),
	FOREIGN KEY (`publication_id`) REFERENCES `publications`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `publication_members_member_idx` ON `publication_members` (`member_id`);
--> statement-breakpoint
CREATE TABLE `publication_projects` (
	`publication_id` integer NOT NULL,
	`project_id` integer NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`publication_id`, `project_id`),
	FOREIGN KEY (`publication_id`) REFERENCES `publications`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `publication_projects_project_idx` ON `publication_projects` (`project_id`);
--> statement-breakpoint
CREATE TABLE `publication_research_areas` (
	`publication_id` integer NOT NULL,
	`research_area_id` integer NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`publication_id`, `research_area_id`),
	FOREIGN KEY (`publication_id`) REFERENCES `publications`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`research_area_id`) REFERENCES `research_areas`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `publication_research_areas_area_idx` ON `publication_research_areas` (`research_area_id`);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text,
	`details_json` text,
	`ip_address` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `audit_logs_created_at_idx` ON `audit_logs` (`created_at`);
--> statement-breakpoint
CREATE INDEX `audit_logs_entity_idx` ON `audit_logs` (`entity_type`,`entity_id`);
--> statement-breakpoint
CREATE INDEX `audit_logs_user_idx` ON `audit_logs` (`user_id`);
