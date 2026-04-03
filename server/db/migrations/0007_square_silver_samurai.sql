CREATE TABLE `fun_points` (
	`id` text PRIMARY KEY NOT NULL,
	`city_id` text NOT NULL,
	`team_name` text NOT NULL,
	`points` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`city_id`) REFERENCES `cities`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `announcements` ADD `target_team_ids` text;--> statement-breakpoint
ALTER TABLE `cities` ADD `fun_column_name` text;