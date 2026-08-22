function atHours(day, hours, minutes) {
  const d = new Date(day);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

function startOfLocalDay(offsetDays) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + offsetDays);
  return d;
}

export function getPlaceholderNotifications() {
  const today = startOfLocalDay(0);
  const previousDay = startOfLocalDay(-1);

  return [
    {
      id: "n1",
      at: atHours(today, 22, 32),
      type: "weather",
      title: "Weather Information",
      description:
        "Red Rainfall warning in the following areas Bulacan, Caloocan City and Pasig City",
    },
    {
      id: "n2",
      at: atHours(today, 19, 32),
      type: "typhoon",
      title: "Typhoon Information",
      description:
        "Tropical Depression Ondoy has strengthened into a tropical typhoon",
    },
    {
      id: "n3",
      at: atHours(today, 17, 32),
      type: "earthquake",
      title: "Earthquake Information",
      description: "Off the coast of Zamboanga (Magnitude 6.8)",
    },
    {
      id: "n4",
      at: atHours(previousDay, 19, 32),
      type: "typhoon",
      title: "Typhoon Information",
      description:
        "Tropical Depression Ondoy has strengthened into a tropical typhoon",
    },
  ];
}

export function groupNotificationsByDate(items) {
  const groups = [];
  const indexByKey = new Map();

  for (const item of items) {
    const key = `${item.at.getFullYear()}-${item.at.getMonth()}-${item.at.getDate()}`;
    const label = `${item.at.getMonth() + 1}/${item.at.getDate()}`;

    if (!indexByKey.has(key)) {
      indexByKey.set(key, groups.length);
      groups.push({ key, label, items: [] });
    }

    groups[indexByKey.get(key)].items.push(item);
  }

  return groups;
}

export function formatNotificationTime(date) {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

export const PLACEHOLDER_LIVE_NOTIFICATION = {
  title: "Red Rainfall Warning",
  description:
    "Caution: NDDRMC has flagged your area for red rainfall warning. Take necessary precautions and monitor updates",
  sentLabel: "sent 10m ago",
};

export const PLACEHOLDER_AI_TIPS = [
  {
    id: "tip-1",
    title: "Stay indoors if possible",
    body: "Limit travel during a red rainfall warning. Flooded roads and sudden landslides can develop quickly.",
  },
  {
    id: "tip-2",
    title: "Prepare a go-bag",
    body: "Keep water, flashlight, power bank, medicines, and important documents in one easy-to-grab bag.",
  },
  {
    id: "tip-3",
    title: "Monitor official updates",
    body: "Follow NDDRMC and local government advisories. Do not rely on unofficial forwards for evacuation orders.",
  },
];
