CREATE TABLE `survey_dates` (
	`id` text PRIMARY KEY NOT NULL,
	`survey_id` text NOT NULL,
	`date_time` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text,
	FOREIGN KEY (`survey_id`) REFERENCES `surveys`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `survey_responses` (
	`id` text PRIMARY KEY NOT NULL,
	`survey_id` text NOT NULL,
	`survey_date_id` text NOT NULL,
	`user_id` text NOT NULL,
	`available` integer DEFAULT 0 NOT NULL,
	`responded_at` text,
	FOREIGN KEY (`survey_id`) REFERENCES `surveys`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`survey_date_id`) REFERENCES `survey_dates`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`discord_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `surveys` (
	`id` text PRIMARY KEY NOT NULL,
	`game_id` text NOT NULL,
	`title` text,
	`description` text,
	`status` text DEFAULT 'OPEN' NOT NULL,
	`channel_id` text,
	`message_id` text,
	`created_by_user_id` text,
	`canonized_survey_date_id` text,
	`canonized_game_day_id` text,
	`created_at` text,
	`updated_at` text,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`discord_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`canonized_game_day_id`) REFERENCES `game_days`(`id`) ON UPDATE no action ON DELETE no action
);
