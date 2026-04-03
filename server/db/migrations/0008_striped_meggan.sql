CREATE TABLE `exercises` (
	`id` text PRIMARY KEY NOT NULL,
	`city_id` text,
	`exercise_number` integer NOT NULL,
	`name` text NOT NULL,
	`description` text,
	FOREIGN KEY (`city_id`) REFERENCES `cities`(`id`) ON UPDATE no action ON DELETE no action
);
