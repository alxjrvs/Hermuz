CREATE TABLE `game_day_tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`game_day_id` text NOT NULL,
	`template_id` text,
	`label` text NOT NULL,
	`description` text,
	`assignee_user_id` text,
	`done` integer DEFAULT 0 NOT NULL,
	`done_at` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text,
	FOREIGN KEY (`game_day_id`) REFERENCES `game_days`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`template_id`) REFERENCES `task_templates`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`assignee_user_id`) REFERENCES `users`(`discord_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`run_at` text NOT NULL,
	`payload` text,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`last_error` text,
	`created_at` text,
	`updated_at` text
);
--> statement-breakpoint
CREATE TABLE `meal_responses` (
	`id` text PRIMARY KEY NOT NULL,
	`meal_id` text NOT NULL,
	`user_id` text NOT NULL,
	`attending` integer DEFAULT 0 NOT NULL,
	`note` text,
	`responded_at` text,
	FOREIGN KEY (`meal_id`) REFERENCES `meals`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`discord_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `meals` (
	`id` text PRIMARY KEY NOT NULL,
	`game_day_id` text NOT NULL,
	`kind` text NOT NULL,
	`plan` text,
	`status` text DEFAULT 'OPEN' NOT NULL,
	`channel_id` text,
	`message_id` text,
	`due_at` text,
	`created_at` text,
	FOREIGN KEY (`game_day_id`) REFERENCES `game_days`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `task_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`game_id` text NOT NULL,
	`label` text NOT NULL,
	`description` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `campaigns` ADD `location_type` text;--> statement-breakpoint
ALTER TABLE `game_days` ADD `location_type` text;--> statement-breakpoint
ALTER TABLE `games` ADD `default_location_type` text DEFAULT 'IN_PERSON' NOT NULL;