export interface GuestUser {
  id: string;
  name: string;
  avatar: string;
  device: string;
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

export function detectDevice(): string {
  if (typeof window === "undefined") return "💻 网页端";

  const ua = navigator.userAgent;

  if (/iPad/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) {
    return "📱 iPad 平板";
  }
  if (/iPhone|iPod/.test(ua)) {
    return "📱 iPhone 手机";
  }
  if (/Android/.test(ua)) {
    if (/Mobile/.test(ua)) return "📱 Android 手机";
    return "📱 Android 平板";
  }
  if (/Macintosh|Mac OS X/.test(ua)) {
    return "💻 Mac 电脑";
  }
  if (/Windows NT/.test(ua)) {
    return "💻 Windows PC";
  }
  if (/Linux/.test(ua)) {
    return "💻 Linux 电脑";
  }

  return "🌐 网页端设备";
}

export function getGuestUser(): GuestUser {
  const currentDevice = detectDevice();

  if (typeof window === "undefined") {
    return { id: "guest_server", name: "游客", avatar: "🐱", device: currentDevice };
  }

  try {
    const cached = localStorage.getItem("4kvm_guest_user");
    if (cached) {
      const parsed = JSON.parse(cached);
      return { ...parsed, device: currentDevice };
    }
  } catch (e) {}

  const randomNum = Math.floor(1000 + Math.random() * 9000);
  const randomAvatar = AVATARS[Math.floor(Math.random() * AVATARS.length)];
  const user: GuestUser = {
    id: `guest_${Date.now()}_${randomNum}`,
    name: `${randomAvatar.name}_${randomNum}`,
    avatar: randomAvatar.emoji,
    device: currentDevice,
  };

  try {
    localStorage.setItem("4kvm_guest_user", JSON.stringify(user));
  } catch (e) {}

  return user;
}

export function updateGuestUser(updates: Partial<GuestUser>): GuestUser {
  const current = getGuestUser();
  const updated = { ...current, ...updates, device: detectDevice() };
  try {
    localStorage.setItem("4kvm_guest_user", JSON.stringify(updated));
  } catch (e) {}
  return updated;
}
