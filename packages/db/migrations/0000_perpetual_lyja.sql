CREATE TABLE `attendances` (
	`id` text PRIMARY KEY NOT NULL,
	`game_day_id` text,
	`user_id` text,
	`status` text NOT NULL,
	FOREIGN KEY (`game_day_id`) REFERENCES `game_days`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`discord_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `campaigns` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`regular_game_time` text NOT NULL,
	`discord_role_id` text NOT NULL,
	`game_id` text,
	`game_name` text,
	`announcement_message_id` text,
	`created_at` text,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `game_days` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`date_time` text NOT NULL,
	`description` text,
	`location` text,
	`status` text NOT NULL,
	`game_id` text,
	`host_user_id` text,
	`discord_role_id` text,
	`discord_category_id` text,
	`discord_event_id` text,
	`announcement_message_id` text,
	`created_at` text,
	`updated_at` text,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`host_user_id`) REFERENCES `users`(`discord_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `games` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`short_name` text NOT NULL,
	`description` text,
	`discord_role_id` text,
	`min_players` integer,
	`max_players` integer
);
--> statement-breakpoint
CREATE TABLE `players` (
	`id` text PRIMARY KEY NOT NULL,
	`campaign_id` text NOT NULL,
	`user_id` text NOT NULL,
	`character_name` text,
	`status` text DEFAULT 'INTERESTED' NOT NULL,
	`created_at` text,
	FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`discord_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `users` (
	`discord_id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL
);
