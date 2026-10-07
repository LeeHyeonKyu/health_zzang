"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ChangePasswordForm() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (newPassword.length < 6) {
      setError("비밀번호는 6자 이상이어야 합니다.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }

    setLoading(true);

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      setError("비밀번호 변경에 실패했습니다.");
    } else {
      setMessage("비밀번호가 변경되었습니다.");
      setNewPassword("");
      setConfirmPassword("");
    }

    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        type="password"
        placeholder="새 비밀번호 (6자 이상)"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        className="input-base"
        autoComplete="new-password"
      />
      <input
        type="password"
        placeholder="비밀번호 확인"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        className="input-base"
        autoComplete="new-password"
      />
      {error && <p className="text-sm text-red-500 dark:text-red-400">{error}</p>}
      {message && <p className="text-sm text-green-600 dark:text-green-400">{message}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-2 rounded bg-gray-800 text-white text-sm font-semibold hover:bg-gray-900 disabled:opacity-50 transition-colors"
      >
        {loading ? "변경 중..." : "비밀번호 변경"}
      </button>
    </form>
  );
}
