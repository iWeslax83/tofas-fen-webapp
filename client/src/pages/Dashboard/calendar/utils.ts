export function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDay(date: Date): string {
  return date.toLocaleDateString('tr-TR', {
    weekday: 'short',
    day: 'numeric',
  });
}
