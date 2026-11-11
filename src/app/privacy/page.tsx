import React from "react";
import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-6 text-gray-300">
      <div className="p-6 rounded-2xl bg-dark-900 border border-white/10 space-y-4">
        <h1 className="text-xl font-bold text-white">
          隐私政策与多端数据安全说明
        </h1>
        <p className="text-xs text-gray-400">
          最后更新日期：2026-11-11 · 适用于 4KVM Web 与 alonglfb-tv 全平台客户端
        </p>

        <div className="space-y-3 text-sm leading-relaxed">
          <h2 className="text-base font-bold text-cyan-400">
            1. 游客模式与本地优先存储
          </h2>
          <p>
            您无需注册即可使用浏览、播放、搜索与多人放映厅功能。在未登录状态下，您的观看历史、收藏夹与专区解锁状态仅保存在您当前设备的本地存储中。
          </p>

          <h2 className="text-base font-bold text-cyan-400">
            2. 账号认证与云端同步内容
          </h2>
          <p>
            当您使用电子邮箱或 Google 账号登录时，系统基于 Better Auth 安全存储您的密码哈希（或 OAuth 关联凭证），并在云端同步以下数据以实现跨设备续播：
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs text-gray-400">
            <li>观看历史与精确到秒的播放进度（采用 LWW 与进度不回退合并策略）</li>
            <li>收藏夹 / 追剧列表（支持多端增删墓碑同步）</li>
            <li>个人偏好与已解锁专区状态</li>
          </ul>

          <h2 className="text-base font-bold text-cyan-400">
            3. 自助注销与数据清理
          </h2>
          <p>
            您可随时在「个人中心」点击「注销账号」，系统将立即级联删除您的账号信息、全部登录会话以及云端存储的所有观看历史与收藏记录。
          </p>
        </div>

        <div className="pt-4 border-t border-white/10">
          <Link
            href="/"
            className="text-xs font-semibold text-cyan-400 hover:underline"
          >
            ← 返回首页
          </Link>
        </div>
      </div>
    </div>
  );
}
