CREATE TABLE `vpn_servers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`label` text NOT NULL,
	`country_code` text,
	`relay_url` text NOT NULL,
	`secret_key` text NOT NULL,
	`active` integer DEFAULT 0 NOT NULL,
	`last_checked_at` text,
	`last_status` text DEFAULT 'unknown' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
