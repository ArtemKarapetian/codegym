PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_fun_points` (
	`id` text PRIMARY KEY NOT NULL,
	`city_id` text NOT NULL,
	`team_name` text NOT NULL,
	`points` real DEFAULT 0 NOT NULL,
	FOREIGN KEY (`city_id`) REFERENCES `cities`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_fun_points`("id", "city_id", "team_name", "points") SELECT "id", "city_id", "team_name", "points" FROM `fun_points`;--> statement-breakpoint
DROP TABLE `fun_points`;--> statement-breakpoint
ALTER TABLE `__new_fun_points` RENAME TO `fun_points`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
ALTER TABLE `cities` DROP COLUMN `fun_column_name`;