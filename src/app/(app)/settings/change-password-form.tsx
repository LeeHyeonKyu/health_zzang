"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Props {
  userEmail: string;
  loginId: string;
}

export default function ChangePasswordForm({ userEmail, loginId }: Props) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [resetting, setResetting] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!currentPassword) {
      setError("현재 비밀번호를 입력해주세요.");
      return;
    }

    if (newPassword.length < 6) {
      setError("새 비밀번호는 6자 이상이어야 합니다.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("새 비밀번호가 일치하지 않습니다.");
      return;
    }

    setLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: userEmail,
      password: currentPassword,
    });

    if (signInError) {
      setError("현재 비밀번호가 올바르지 않습니다.");
      setLoading(false);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      setError("비밀번호 변경에 실패했습니다.");
    } else {
      setMessage("비밀번호가 변경되었습니다.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }

    setLoading(false);
  }

  async function handleReset() {
    setResetting(true);
    setError("");
    setMessage("");

    const defaultPassword = loginId + "1234";

    const { error: updateError } = await supabase.auth.updateUser({
      password: defaultPassword,
    });

    if (updateError) {
      setError("초기화에 실패했습니다.");
    } else {
      setMessage(`비밀번호가 초기화되었습니다. (${loginId}1234)`);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setConfirmReset(false);
    }

    setResetting(false);
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="password"
          placeholder="현재 비밀번호"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className="input-base"
          autoComplete="current-password"
        />
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
          placeholder="새 비밀번호 확인"
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
          className="w-full py-2.5 rounded-lg bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 text-sm font-semibold hover:bg-gray-900 dark:hover:bg-gray-100 disabled:opacity-50 transition-colors"
        >
          {loading ? "변경 중..." : "비밀번호 변경"}
        </button>
      </form>

      <div className="border-t border-gray-100 dark:border-gray-800 pt-3">
        {confirmReset ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-red-500 dark:text-red-400">
              비밀번호가 {loginId}1234로 초기화됩니다.
            </span>
            <button
              onClick={handleReset}
              disabled={resetting}
              className="px-3 py-1.5 text-xs rounded-lg bg-red-500 text-white font-semibold disabled:opacity-50"
            >
              {resetting ? "..." : "확인"}
            </button>
            <button
              onClick={() => setConfirmReset(false)}
              className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500"
            >
              취소
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmReset(true)}
            className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400"
          >
            비밀번호 초기화 (ID + 1234)
          </button>
        )}
      </div>
    </div>
  );
}
