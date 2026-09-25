-- ---------- posts ----------

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS generation_source ENUM('human', 'ai') DEFAULT 'human'
    COMMENT 'human = written directly via admin; ai = produced by the article automation pipeline',
  ADD COLUMN IF NOT EXISTS ai_model VARCHAR(100) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS automation_run_id INT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS prompt_version VARCHAR(50) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS source_references JSON DEFAULT NULL
    COMMENT 'Array of {title, url} research references used to ground the article, if any',
  ADD COLUMN IF NOT EXISTS generation_status ENUM('ok', 'validation_failed', 'image_failed', 'error') DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS generation_error TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS topic_key VARCHAR(255) DEFAULT NULL
    COMMENT 'Normalized topic fingerprint for duplicate-topic detection, see article-automation.service.js',
  ADD INDEX IF NOT EXISTS idx_generation_source (generation_source),
  ADD INDEX IF NOT EXISTS idx_topic_key (topic_key),
  ADD INDEX IF NOT EXISTS idx_automation_run_id (automation_run_id);

-- ---------- job_listings ----------

ALTER TABLE job_listings
  ADD COLUMN IF NOT EXISTS status ENUM(
    'pending_review', 'approved', 'published', 'rejected', 'expired', 'removed'
  ) DEFAULT NULL
    COMMENT 'NULL = legacy row created before automation existed; is_active/expires_at still govern those as before',
  ADD COLUMN IF NOT EXISTS source_id INT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS source_url VARCHAR(1000) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS source_name VARCHAR(255) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS remote_type ENUM('remote', 'hybrid', 'onsite') DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS experience_level VARCHAR(50) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS salary_min INT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS salary_max INT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS salary_currency VARCHAR(10) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS responsibilities TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS qualifications TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS skills JSON DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS fingerprint CHAR(64) DEFAULT NULL
    COMMENT 'SHA-256 of normalized company+title+location+application_url, see job-discovery.service.js',
  ADD COLUMN IF NOT EXISTS discovered_at TIMESTAMP NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS automation_run_id INT DEFAULT NULL,
  ADD UNIQUE INDEX IF NOT EXISTS idx_fingerprint (fingerprint),
  ADD INDEX IF NOT EXISTS idx_status (status),
  ADD INDEX IF NOT EXISTS idx_source_id (source_id),
  ADD INDEX IF NOT EXISTS idx_expires_at (expires_at);

-- ---------- job_sources (new) ----------

CREATE TABLE IF NOT EXISTS job_sources (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  base_url VARCHAR(1000) NOT NULL,
  source_type ENUM('rss', 'json_api', 'career_page') NOT NULL DEFAULT 'rss',
  feed_url VARCHAR(1000) NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  trusted BOOLEAN DEFAULT FALSE
    COMMENT 'Trusted sources may be auto-published; new/unknown sources always land in pending_review regardless of AUTO_PUBLISH_JOBS',
  check_interval_minutes INT DEFAULT 180,
  last_checked_at TIMESTAMP NULL DEFAULT NULL,
  last_success_at TIMESTAMP NULL DEFAULT NULL,
  last_error TEXT DEFAULT NULL,
  consecutive_failures INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_enabled (enabled)
);

-- ---------- automation_runs (new) ----------

CREATE TABLE IF NOT EXISTS automation_runs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  type ENUM(
    'article_topic_discovery', 'article_generation', 'article_validation',
    'article_publication', 'job_discovery', 'job_processing', 'job_expiration'
  ) NOT NULL,
  status ENUM('running', 'success', 'partial_failure', 'failed') NOT NULL DEFAULT 'running',
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL DEFAULT NULL,
  items_processed INT DEFAULT 0,
  items_created INT DEFAULT 0,
  items_published INT DEFAULT 0,
  items_rejected INT DEFAULT 0,
  error_count INT DEFAULT 0,
  error_message TEXT DEFAULT NULL,
  metadata JSON DEFAULT NULL
    COMMENT 'Free-form run details, e.g. {topic, sourceId, model} - never store API keys/secrets here',
  triggered_by ENUM('scheduler', 'manual') NOT NULL DEFAULT 'scheduler',
  triggered_by_user_id INT DEFAULT NULL,
  INDEX idx_type_status (type, status),
  INDEX idx_started_at (started_at)
);

CREATE TABLE IF NOT EXISTS generated_topics (
  id INT AUTO_INCREMENT PRIMARY KEY,
  topic_key VARCHAR(255) NOT NULL
    COMMENT 'Normalized (lowercased, stopword-stripped) topic fingerprint',
  raw_topic VARCHAR(500) NOT NULL,
  category VARCHAR(255) DEFAULT NULL,
  outcome ENUM('generated', 'rejected_duplicate', 'rejected_other') NOT NULL,
  post_id INT DEFAULT NULL,
  automation_run_id INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_topic_key (topic_key),
  INDEX idx_created_at (created_at)
);
