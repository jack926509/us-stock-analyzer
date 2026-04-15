CREATE TABLE `multi_persona_reports` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`symbol` text NOT NULL,
	`persona_ids` text NOT NULL,
	`persona_results` text NOT NULL,
	`synthesis` text NOT NULL,
	`divergence_score` real,
	`final_recommendation` text,
	`model_version` text NOT NULL,
	`prompt_version` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP
);
