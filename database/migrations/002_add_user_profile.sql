-- Migration: Add User Profile Fields
-- 사용자 프로필 기능을 위한 필드 추가

USE codelog;

-- users 테이블에 프로필 관련 필드 추가
ALTER TABLE users
ADD COLUMN IF NOT EXISTS profile_image VARCHAR(500) AFTER username,
ADD COLUMN IF NOT EXISTS bio TEXT AFTER profile_image,
ADD COLUMN IF NOT EXISTS company VARCHAR(255) AFTER bio,
ADD COLUMN IF NOT EXISTS location VARCHAR(255) AFTER company;

-- 활동 로그 테이블 생성
CREATE TABLE IF NOT EXISTS activity_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    activity_type ENUM('project_create', 'project_update', 'project_delete', 'build_create', 'push_send', 'login') NOT NULL,
    activity_data JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_activity_type (activity_type),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 예약된 푸시 알림 테이블 생성
CREATE TABLE IF NOT EXISTS scheduled_push_notifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    project_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    scheduled_at DATETIME NOT NULL,
    status ENUM('pending', 'sent', 'failed', 'cancelled') DEFAULT 'pending',
    sent_at TIMESTAMP NULL,
    sent_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    INDEX idx_project_id (project_id),
    INDEX idx_scheduled_at (scheduled_at),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SELECT 'Migration 002 completed successfully!' as Status;
