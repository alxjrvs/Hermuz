ALTER TABLE `campaigns` ADD `scheduling_kind` text DEFAULT 'SCHEDULED' NOT NULL;--> statement-breakpoint
ALTER TABLE `campaigns` ADD `max_sessions` integer;--> statement-breakpoint
ALTER TABLE `campaigns` ADD `recurrence_weekday` integer;--> statement-breakpoint
ALTER TABLE `campaigns` ADD `recurrence_time` text;--> statement-breakpoint
ALTER TABLE `campaigns` ADD `recurrence_interval_weeks` integer;--> statement-breakpoint
ALTER TABLE `game_days` ADD `campaign_id` text REFERENCES campaigns(id);--> statement-breakpoint
ALTER TABLE `game_days` ADD `session_number` integer;--> statement-breakpoint
ALTER TABLE `games` ADD `default_scheduling_kind` text DEFAULT 'SCHEDULED' NOT NULL;--> statement-breakpoint
ALTER TABLE `games` ADD `max_sessions` integer;