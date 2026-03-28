ALTER TABLE `meetings` MODIFY COLUMN `department` enum('technology','catering','transport','cultural','media','supervisors');--> statement-breakpoint
ALTER TABLE `meetings` ADD `gregorianDate` varchar(20);--> statement-breakpoint
ALTER TABLE `meetings` ADD `elements` text;--> statement-breakpoint
ALTER TABLE `meetings` DROP COLUMN `objectives`;