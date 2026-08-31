export interface GuestUser {
  id: string;
  name: string;
  avatar: string;
}

const AVATARS = [
  { emoji: "🐱", name: "橘猫" },
  { emoji: "🦊", name: "灵狐" },
  { emoji: "🐼", name: "萌熊" },
  { emoji: "🐰", name: "萌兔" },
  { emoji: "🦁", name: "狮王" },
  { emoji: "🐬", name: "海豚" },
  { emoji: "🦉", name: "猫头鹰" },
  { emoji: "🐯", name: "小虎" },
  { emoji: "🐨", name: "考拉" },
  { emoji: "🦄", name: "独角兽" },
];

export function getGuestUser(): GuestUser {
  if (typeof window === "undefined") {
    return { id: "guest_server", name: "游客", avatar: "🐱" };
  }

  try {
    const cached = localStorage.getItem("4kvm_guest_user");
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (e) {}

  const randomNum = Math.floor(1000 + Math.random() * 9000);
  const randomAvatar = AVATARS[Math.floor(Math.random() * AVATARS.length)];
  const user: GuestUser = {
    id: `guest_${Date.now()}_${randomNum}`,
    name: `${randomAvatar.name}_${randomNum}`,
    avatar: randomAvatar.emoji,
  };

  try {
    localStorage.setItem("4kvm_guest_user", JSON.stringify(user));
  } catch (e) {}

  return user;
}

export function updateGuestUser(updates: Partial<GuestUser>): GuestUser {
  const current = getGuestUser();
  const updated = { ...current, ...updates };
  try {
    localStorage.setItem("4kvm_guest_user", JSON.stringify(updated));
  } catch (e) {}
  return updated;
}
