import { Banner } from '@/components/ui';
import { useSyncStatus } from '@/lib/offline';

export function SyncBanner() {
  const { online, pending, syncing } = useSyncStatus();
  if (online && pending === 0) return null;
  const changes = `${pending} ${pending === 1 ? 'change' : 'changes'}`;
  if (!online) {
    return (
      <Banner
        tone="warning"
        icon="cloud-offline-outline"
        text={pending ? `You're offline. ${changes} saved on this device will sync when you reconnect.` : "You're offline. You can keep logging; it will sync later."}
      />
    );
  }
  return <Banner tone="info" icon="sync-outline" text={syncing ? `Syncing ${changes}…` : `${changes} waiting to sync.`} />;
}
