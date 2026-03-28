CREATE TABLE `attachments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`entityType` enum('meeting','evaluation') NOT NULL,
	`entityId` int NOT NULL,
	`fileName` varchar(500) NOT NULL,
	`fileUrl` text NOT NULL,
	`fileKey` text NOT NULL,
	`mimeType` varchar(100),
	`fileSize` int,
	`uploadedById` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `attachments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `evaluation_reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reportNumber` varchar(20) NOT NULL,
	`company` enum('quraish','azan') NOT NULL,
	`hijriDate` varchar(20) NOT NULL,
	`dayOfWeek` varchar(20) NOT NULL,
	`axis` varchar(255) NOT NULL,
	`track` varchar(255) NOT NULL,
	`criterion` varchar(500) NOT NULL,
	`score` int,
	`notes` text,
	`status` enum('draft','final') NOT NULL DEFAULT 'draft',
	`createdById` int NOT NULL,
	`createdByName` varchar(255),
	`pdfUrl` text,
	`pdfKey` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `evaluation_reports_id` PRIMARY KEY(`id`),
	CONSTRAINT `evaluation_reports_reportNumber_unique` UNIQUE(`reportNumber`)
);
--> statement-breakpoint
CREATE TABLE `meetings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`company` enum('quraish','azan') NOT NULL,
	`hijriDate` varchar(20) NOT NULL,
	`dayOfWeek` varchar(20) NOT NULL,
	`title` text NOT NULL,
	`objectives` text,
	`recommendations` text,
	`department` varchar(255),
	`attendees` json,
	`status` enum('draft','final') NOT NULL DEFAULT 'draft',
	`createdById` int NOT NULL,
	`createdByName` varchar(255),
	`pdfUrl` text,
	`pdfKey` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `meetings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `report_counters` (
	`id` int AUTO_INCREMENT NOT NULL,
	`year` varchar(10) NOT NULL,
	`lastNumber` int NOT NULL DEFAULT 0,
	CONSTRAINT `report_counters_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `username` varchar(100);--> statement-breakpoint
ALTER TABLE `users` ADD `passwordHash` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_username_unique` UNIQUE(`username`);