CREATE TABLE `trainer_grades` (
	`id` text PRIMARY KEY NOT NULL,
	`team_user_id` text NOT NULL,
	`exercise_number` integer NOT NULL,
	`graded_by_user_id` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`team_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`graded_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `trainer_grades_team_exercise` ON `trainer_grades` (`team_user_id`,`exercise_number`);