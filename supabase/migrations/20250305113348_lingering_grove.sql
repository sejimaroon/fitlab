/*
  # 予約システムのスキーマ更新

  1. 新しいテーブル
    - `time_slots`: 予約可能な時間枠を管理
      - `id` (uuid): プライマリーキー
      - `course_id` (uuid): コースID
      - `start_time` (timestamptz): 開始時間
      - `end_time` (timestamptz): 終了時間
      - `capacity` (integer): 定員数（ヨガクラス用）
      - `booked_count` (integer): 現在の予約数
      - `created_at` (timestamptz): 作成日時

  2. セキュリティ
    - RLSポリシーの設定
    - 認証済みユーザーのみ閲覧可能
*/

CREATE TABLE IF NOT EXISTS time_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES courses(id) NOT NULL,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  capacity integer DEFAULT 1,
  booked_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE time_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view time slots"
  ON time_slots
  FOR SELECT
  TO authenticated
  USING (true);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_time_slots_course_id ON time_slots(course_id);
CREATE INDEX IF NOT EXISTS idx_time_slots_start_time ON time_slots(start_time);