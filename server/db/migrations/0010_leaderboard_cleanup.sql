DROP TABLE `announcement_reads`;--> statement-breakpoint
DROP TABLE `announcements`;--> statement-breakpoint
DROP TABLE `exercises`;--> statement-breakpoint
DROP TABLE `fun_points`;--> statement-breakpoint
DROP TABLE `leaderboard_cache`;--> statement-breakpoint
DROP TABLE `team_progress`;--> statement-breakpoint
DROP TABLE `zones`;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
DELETE FROM `users`;--> statement-breakpoint
CREATE TABLE `__new_users` (
	`id` text PRIMARY KEY NOT NULL,
	`login` text NOT NULL,
	`password_hash` text NOT NULL,
	`role` text DEFAULT 'admin' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_users`("id", "login", "password_hash", "role", "created_at") SELECT "id", "login", "password_hash", "role", "created_at" FROM `users`;--> statement-breakpoint
DROP TABLE `users`;--> statement-breakpoint
ALTER TABLE `__new_users` RENAME TO `users`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `users_login_unique` ON `users` (`login`);--> statement-breakpoint
ALTER TABLE `cities` ADD `sheet_id` text;--> statement-breakpoint
ALTER TABLE `cities` ADD `sheet_range` text DEFAULT 'Таблица' NOT NULL;--> statement-breakpoint
ALTER TABLE `cities` ADD `exercise_names` text;--> statement-breakpoint
ALTER TABLE `cities` DROP COLUMN `map_enabled`;--> statement-breakpoint
ALTER TABLE `cities` DROP COLUMN `chat_url`;